import type { Coupon } from "@prisma/client";
import { formatMoneyGB, formatPercent } from "@/lib/format";

// Human-readable summary of a coupon's offer, for the index and detail views.
export function formatOffer(coupon: Coupon): string {
  switch (coupon.offerType) {
    case "percentage":
      return `${formatPercent(coupon.offerValue)} off`;
    case "fixed":
      return `${formatMoneyGB(coupon.offerValue)} off`;
    case "threshold":
      return `${formatMoneyGB(coupon.offerValue)} off over ${formatMoneyGB(
        coupon.minSpend,
      )}`;
    case "multibuy":
      if (coupon.multibuyQty && coupon.multibuyPayQty) {
        return `${coupon.multibuyQty} for ${coupon.multibuyPayQty}`;
      }
      return "Multibuy";
    case "bogof":
      return "Buy one get one free";
    case "bogohp":
      return "Buy one get one half price";
    case "free_gift": {
      const base = coupon.giftSku ? `Free gift (${coupon.giftSku})` : "Free gift";
      return coupon.minSpend
        ? `${base} over ${formatMoneyGB(coupon.minSpend)}`
        : base;
    }
    default:
      return "—";
  }
}

export const OFFER_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage off" },
  { value: "fixed", label: "Fixed amount off" },
  { value: "threshold", label: "Amount off over a minimum spend" },
  { value: "multibuy", label: "Multibuy (e.g. 3 for 2)" },
  { value: "bogof", label: "Buy one get one free" },
  { value: "bogohp", label: "Buy one get one half price" },
  { value: "free_gift", label: "Free gift" },
] as const;

export const COUPON_TYPE_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "email_limited", label: "Email, limited time" },
] as const;
