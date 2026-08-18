"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { metorikGet, metorikConfigured } from "@/lib/metorik";
import { autoMapGateCoupons } from "@/lib/metorik-automap";

const PROMOTION_META_KEY = "_ijwp_promotion_id";
const MAX_SAMPLE_PRODUCTS = 6;

type MetaEntry = { key?: string; value?: unknown };
type LineItem = { name?: string; meta?: MetaEntry[] };
type Order = { line_items?: LineItem[] };

async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Not authorised");
}

// Pulls recent orders from Metorik and records every _ijwp_promotion_id seen,
// with an order count and a few sample product names to help identify it.
// Existing assignments are preserved.
export async function scanMetorikPromotions(): Promise<{
  error?: string;
  scanned?: number;
  found?: number;
}> {
  await assertAdmin();
  if (!metorikConfigured()) {
    return { error: "The Metorik API key is not set in the environment yet." };
  }

  const agg = new Map<string, { count: number; products: Set<string> }>();
  let scanned = 0;

  for (let page = 1; page <= 10; page++) {
    const res = await metorikGet("/orders", {
      page,
      per_page: 100,
      order_by: "order_created_at",
      order_dir: "desc",
    });
    if (!res.ok) {
      if (page === 1) return { error: `Metorik returned ${res.status}.` };
      break;
    }
    const json = (await res.json()) as {
      data?: Order[];
      pagination?: { has_more_pages?: boolean };
    };
    const orders = json.data ?? [];
    scanned += orders.length;

    for (const order of orders) {
      const idsInOrder = new Set<string>();
      for (const li of order.line_items ?? []) {
        for (const m of li.meta ?? []) {
          if (m.key === PROMOTION_META_KEY && m.value != null) {
            const id = String(m.value);
            idsInOrder.add(id);
            const entry = agg.get(id) ?? { count: 0, products: new Set<string>() };
            if (li.name && entry.products.size < MAX_SAMPLE_PRODUCTS) {
              entry.products.add(li.name);
            }
            agg.set(id, entry);
          }
        }
      }
      for (const id of idsInOrder) {
        agg.get(id)!.count += 1;
      }
    }

    if (!json.pagination?.has_more_pages) break;
  }

  for (const [promotionId, { count, products }] of agg) {
    const sampleProducts = [...products].join(", ") || null;
    await prisma.metorikPromotion.upsert({
      where: { promotionId },
      create: { promotionId, orderCount: count, sampleProducts },
      update: { orderCount: count, sampleProducts, lastSeenAt: new Date() },
    });
  }

  revalidatePath("/admin/promotions");
  return { scanned, found: agg.size };
}

export async function assignPromotion(formData: FormData): Promise<void> {
  await assertAdmin();
  const promotionId = String(formData.get("promotionId") ?? "");
  const couponId = String(formData.get("couponId") ?? "");
  if (!promotionId || !couponId) return;

  await prisma.metorikPromotion.update({
    where: { promotionId },
    data: { couponId },
  });
  revalidatePath("/admin/promotions");
}

// Creates a coupon from the given name (or reuses one with the same code) and
// assigns the promotion to it in one step. Offer type is left blank for the
// admin to set later; the code is valid online by default.
export async function createCouponAndAssign(formData: FormData): Promise<void> {
  await assertAdmin();
  const promotionId = String(formData.get("promotionId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const codeInput = String(formData.get("code") ?? "").trim().toUpperCase();
  if (!promotionId || !name) return;

  // Use the entered code, or fall back to the name if none was given.
  const code = codeInput || name.toUpperCase();

  const coupon = await prisma.coupon.upsert({
    where: { code },
    create: { code, name, validOnline: true, validInstore: false, isActive: true },
    update: {},
  });

  await prisma.metorikPromotion.update({
    where: { promotionId },
    data: { couponId: coupon.id },
  });
  revalidatePath("/admin/promotions");
}

export async function unassignPromotion(formData: FormData): Promise<void> {
  await assertAdmin();
  const promotionId = String(formData.get("promotionId") ?? "");
  if (!promotionId) return;

  await prisma.metorikPromotion.update({
    where: { promotionId },
    data: { couponId: null },
  });
  revalidatePath("/admin/promotions");
}

// Manual trigger for the auto-map (also runs automatically inside each sync).
export async function autoMapFromMetorik(): Promise<{
  error?: string;
  checked?: number;
  mapped?: number;
  details?: string[];
}> {
  await assertAdmin();
  if (!metorikConfigured()) {
    return { error: "The Metorik API key is not set." };
  }

  const { checked, mapped, details } = await autoMapGateCoupons();
  revalidatePath("/admin/promotions");
  revalidatePath("/");
  return { checked, mapped, details };
}
