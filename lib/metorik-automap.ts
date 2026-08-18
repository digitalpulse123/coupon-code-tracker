import { prisma } from "@/lib/prisma";
import { metorikGet, metorikConfigured } from "@/lib/metorik";

// Recursively find a coupon object with the given code anywhere in the Metorik
// /search response (its shape wraps results by resource) and return its
// description.
function findCouponDescription(node: unknown, code: string): string | null {
  if (Array.isArray(node)) {
    for (const x of node) {
      const r = findCouponDescription(x, code);
      if (r !== null) return r;
    }
  } else if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj.code === "string" && obj.code.toUpperCase() === code.toUpperCase()) {
      return typeof obj.description === "string" ? obj.description : "";
    }
    for (const v of Object.values(obj)) {
      const r = findCouponDescription(v, code);
      if (r !== null) return r;
    }
  }
  return null;
}

// Looks up each app coupon code in Metorik. IJW gate coupons carry a description
// like "Gate coupon for IJW promotion #101", so we read the promotion id and map
// it to the code. Also attaches any already-imported redemptions for that
// promotion. Callers handle auth and cache revalidation.
export async function autoMapGateCoupons(): Promise<{
  checked: number;
  mapped: number;
  details: string[];
}> {
  if (!metorikConfigured()) return { checked: 0, mapped: 0, details: [] };

  const coupons = await prisma.coupon.findMany({ select: { id: true, code: true } });
  let mapped = 0;
  const details: string[] = [];

  for (const coupon of coupons) {
    if (coupon.code.length < 3) continue; // search needs 3+ characters

    let res: Response;
    try {
      res = await metorikGet("/search", {
        resource: "coupons",
        query: coupon.code,
        count: 5,
      });
    } catch {
      continue;
    }
    if (!res.ok) continue;

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      continue;
    }

    const description = findCouponDescription(json, coupon.code) ?? "";
    const m = /IJW promotion #(\d+)/i.exec(description);
    if (!m) continue;

    const promotionId = m[1];
    await prisma.metorikPromotion.upsert({
      where: { promotionId },
      create: { promotionId, couponId: coupon.id },
      update: { couponId: coupon.id },
    });
    await prisma.onlineRedemption.updateMany({
      where: { promotionId },
      data: { couponId: coupon.id, couponCode: coupon.code },
    });

    mapped += 1;
    details.push(`${coupon.code} → promotion ${promotionId}`);
  }

  return { checked: coupons.length, mapped, details };
}
