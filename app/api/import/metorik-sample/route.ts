import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { metorikGet, metorikConfigured } from "@/lib/metorik";

export const dynamic = "force-dynamic";

const PROMOTION_META_KEY = "_ijwp_promotion_id";

type MetaEntry = { key?: string; value?: unknown };
type LineItem = { name?: string; sku?: string; meta?: MetaEntry[] };
type Order = {
  order_id?: number | string;
  order_number?: string;
  order_created_at?: string;
  line_items?: LineItem[];
};

type AffectedLine = {
  productName: string | null;
  sku: string | null;
  promotionId: string;
};

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 4000) };
  }
}

// Admin diagnostic. Scans recent orders and reports which ones carry an
// _ijwp_promotion_id on any line item, and which promotion IDs appear. Only
// non-personal fields (order number, date, product name, SKU, promotion id)
// are returned. stack_coupons is deliberately ignored.
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  if (!metorikConfigured()) {
    return NextResponse.json(
      { error: "METORIK_API_KEY is not set in the environment yet." },
      { status: 400 },
    );
  }

  const pagesParam = Number(new URL(request.url).searchParams.get("pages"));
  const pages = Number.isFinite(pagesParam)
    ? Math.min(Math.max(Math.trunc(pagesParam), 1), 10)
    : 5;

  const orders: Order[] = [];
  for (let page = 1; page <= pages; page++) {
    const res = await metorikGet("/orders", {
      page,
      per_page: 100,
      order_by: "order_created_at",
      order_dir: "desc",
    });
    if (!res.ok) {
      return NextResponse.json({
        error: `Metorik returned ${res.status} on page ${page}`,
        body: (await res.text()).slice(0, 2000),
      });
    }
    const json = (await readJson(res)) as {
      data?: Order[];
      pagination?: { has_more_pages?: boolean };
    };
    orders.push(...(json.data ?? []));
    if (!json.pagination?.has_more_pages) break;
  }

  const promotionOrders: {
    orderId: number | string | null;
    orderNumber: string | null;
    orderDate: string | null;
    lineItems: AffectedLine[];
  }[] = [];

  const ordersPerPromotionId: Record<string, number> = {};

  for (const order of orders) {
    const affected: AffectedLine[] = [];
    for (const li of order.line_items ?? []) {
      for (const m of li.meta ?? []) {
        if (m.key === PROMOTION_META_KEY && m.value != null) {
          affected.push({
            productName: li.name ?? null,
            sku: li.sku ?? null,
            promotionId: String(m.value),
          });
        }
      }
    }

    if (affected.length === 0) continue;

    promotionOrders.push({
      orderId: order.order_id ?? null,
      orderNumber: order.order_number ?? null,
      orderDate: order.order_created_at ?? null,
      lineItems: affected,
    });

    // Count each order once per distinct promotion ID it contains.
    const idsInOrder = new Set(affected.map((a) => a.promotionId));
    for (const id of idsInOrder) {
      ordersPerPromotionId[id] = (ordersPerPromotionId[id] ?? 0) + 1;
    }
  }

  return NextResponse.json({
    scanned: orders.length,
    ordersWithPromotion: promotionOrders.length,
    uniquePromotionIds: Object.keys(ordersPerPromotionId).sort(),
    ordersPerPromotionId,
    orders: promotionOrders.slice(0, 100),
  });
}
