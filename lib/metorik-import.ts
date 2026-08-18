import type { FulfilmentGroup } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { metorikGet, metorikConfigured } from "@/lib/metorik";
import { autoMapGateCoupons } from "@/lib/metorik-automap";

const PROMOTION_META_KEY = "_ijwp_promotion_id";
const EXCLUDED_SKU = "QMP001"; // BR-05: phantom click-and-reserve product
const MAX_PAGES = 200; // safety cap (~20k orders)

type MetaEntry = { key?: string; value?: unknown };
type LineItem = {
  name?: string;
  sku?: string;
  quantity?: number;
  total?: number;
  meta?: MetaEntry[];
};
type Order = {
  order_number?: string;
  order_created_at?: string;
  order_updated_at?: string;
  status?: string;
  total?: number;
  total_refunds?: number;
  shipping_method_title?: string;
  line_items?: LineItem[];
};

export type SyncResult = {
  error?: string;
  rowsRead?: number;
  rowsCreated?: number;
  rowsUpdated?: number;
  rowsSkipped?: number;
  unknownPromotions?: string[];
};

// Store Collection - Pay Online -> C&C; ...Pay Instore -> C&R; everything else
// (Guaranteed, Pickup Point, home delivery) -> the "guaranteed" group (BR-10).
function deriveFulfilmentGroup(shipping: string | null): FulfilmentGroup {
  const s = (shipping ?? "").toLowerCase();
  if (s.includes("pay instore") || s.includes("pay in store")) return "click_reserve";
  if (s.includes("collection")) return "click_collect";
  return "guaranteed";
}

function isRefundedOrder(order: Order): boolean {
  const status = (order.status ?? "").toLowerCase();
  if (status === "refunded" || status === "cancelled") return true;
  return Number(order.total_refunds ?? 0) > 0;
}

// Distinct promotion ids on an order, each with the line items it applied to.
function promotionsOnOrder(order: Order): Map<string, LineItem[]> {
  const map = new Map<string, LineItem[]>();
  for (const li of order.line_items ?? []) {
    for (const m of li.meta ?? []) {
      if (m.key === PROMOTION_META_KEY && m.value != null) {
        const id = String(m.value);
        if (!map.has(id)) map.set(id, []);
        map.get(id)!.push(li);
      }
    }
  }
  return map;
}

export async function runMetorikSync(opts: {
  sinceDays: number;
  runByUserId?: string | null;
}): Promise<SyncResult> {
  if (!metorikConfigured()) {
    return { error: "The Metorik API key is not set in the environment." };
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - opts.sinceDays);
  since.setUTCHours(0, 0, 0, 0);

  // Refresh gate-coupon mappings first, so new codes attribute in this same run.
  await autoMapGateCoupons();

  const promos = await prisma.metorikPromotion.findMany({
    include: { coupon: { select: { id: true, code: true } } },
  });
  const promoMap = new Map(promos.map((p) => [p.promotionId, p]));

  const batch = await prisma.importBatch.create({
    data: {
      source: "metorik_api",
      rangeFrom: since,
      rangeTo: new Date(),
      status: "success",
      runBy: opts.runByUserId ?? undefined,
    },
  });

  let rowsRead = 0;
  let rowsCreated = 0;
  let rowsUpdated = 0;
  let rowsSkipped = 0;
  const unknownPromotions = new Set<string>();
  const discovered = new Map<string, { count: number; products: Set<string> }>();

  try {
    let page = 1;
    let stop = false;
    while (!stop && page <= MAX_PAGES) {
      const res = await metorikGet("/orders", {
        page,
        per_page: 100,
        order_by: "order_updated_at",
        order_dir: "desc",
      });
      if (!res.ok) {
        throw new Error(`Metorik returned ${res.status}.`);
      }
      const json = (await res.json()) as {
        data?: Order[];
        pagination?: { has_more_pages?: boolean };
      };
      const orders = json.data ?? [];
      if (orders.length === 0) break;

      for (const order of orders) {
        const updatedAt = new Date(order.order_updated_at ?? order.order_created_at ?? "");
        if (!Number.isNaN(updatedAt.getTime()) && updatedAt < since) {
          stop = true;
          break;
        }
        rowsRead++;

        const orderNumber = order.order_number ?? "";
        if (!orderNumber) {
          rowsSkipped++;
          continue;
        }

        const promoLines = promotionsOnOrder(order);
        if (promoLines.size === 0) {
          rowsSkipped++;
          continue;
        }

        const orderDate = new Date(order.order_created_at ?? order.order_updated_at ?? "");
        const fulfilmentGroup = deriveFulfilmentGroup(order.shipping_method_title ?? null);
        const isRefunded = isRefundedOrder(order);

        for (const [promotionId, lines] of promoLines) {
          const entry = discovered.get(promotionId) ?? { count: 0, products: new Set<string>() };
          entry.count += 1;
          for (const li of lines) {
            if (li.name && entry.products.size < 6) entry.products.add(li.name);
          }
          discovered.set(promotionId, entry);

          const mapping = promoMap.get(promotionId);
          const couponId = mapping?.coupon?.id ?? null;
          const couponCode = mapping?.coupon?.code ?? null;
          if (!couponId) unknownPromotions.add(promotionId);

          const existing = await prisma.onlineRedemption.findUnique({
            where: { orderNumber_promotionId: { orderNumber, promotionId } },
            select: { id: true },
          });

          const orderTotal = order.total != null ? Number(order.total) : null;
          const record = await prisma.onlineRedemption.upsert({
            where: { orderNumber_promotionId: { orderNumber, promotionId } },
            create: {
              promotionId,
              couponId,
              couponCode,
              orderNumber,
              orderDate,
              orderTotal,
              shippingMethodRaw: order.shipping_method_title ?? null,
              fulfilmentGroup,
              isRefunded,
              importBatchId: batch.id,
            },
            update: {
              couponId,
              couponCode,
              orderDate,
              orderTotal,
              shippingMethodRaw: order.shipping_method_title ?? null,
              fulfilmentGroup,
              isRefunded,
              importBatchId: batch.id,
            },
            select: { id: true },
          });

          if (existing) rowsUpdated++;
          else rowsCreated++;

          // Replace line items (idempotent), excluding the QMP001 phantom SKU.
          await prisma.redemptionLineItem.deleteMany({
            where: { onlineRedemptionId: record.id },
          });
          const items = lines
            .filter((li) => (li.sku ?? "") !== EXCLUDED_SKU)
            .map((li) => ({
              channel: "online" as const,
              onlineRedemptionId: record.id,
              productName: li.name ?? null,
              sku: li.sku ?? null,
              quantity: li.quantity != null ? Number(li.quantity) : null,
              lineValue: li.total != null ? Number(li.total) : null,
            }));
          if (items.length > 0) {
            await prisma.redemptionLineItem.createMany({ data: items });
          }
        }
      }

      if (!json.pagination?.has_more_pages) break;
      page++;
    }
  } catch (e) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "failed",
        rowsRead,
        rowsCreated,
        rowsUpdated,
        rowsSkipped,
        errorDetail: e instanceof Error ? e.message : "Unknown error",
      },
    });
    return { error: e instanceof Error ? e.message : "Import failed." };
  }

  // Record every promotion seen so new ones surface for mapping.
  for (const [promotionId, { count, products }] of discovered) {
    const sampleProducts = [...products].join(", ") || null;
    await prisma.metorikPromotion.upsert({
      where: { promotionId },
      create: { promotionId, orderCount: count, sampleProducts },
      update: { orderCount: count, sampleProducts, lastSeenAt: new Date() },
    });
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: { rowsRead, rowsCreated, rowsUpdated, rowsSkipped, status: "success" },
  });

  return {
    rowsRead,
    rowsCreated,
    rowsUpdated,
    rowsSkipped,
    unknownPromotions: [...unknownPromotions],
  };
}
