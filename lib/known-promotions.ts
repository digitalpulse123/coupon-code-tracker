// Known IJW promotion IDs to campaign names, supplied by the marketing team.
// Used only as a suggested name when mapping a discovered promotion to a code.
// The real link is the assignment saved against each promotion; this is a hint.
export const KNOWN_PROMOTION_NAMES: Record<string, string> = {
  "58": "SIGNUP15-2865",
  "59": "SAVE15-3754",
  "60": "Mini - 2 for £14.95",
  "63": "BOGOHP - Mens Bestsellers",
  "64": "TAKE15-4287",
  "65": "2 for £50 Sex Toys",
  "66": "4FOR3",
  "68": "3FOR2LUBE",
  "70": "LINGERIE",
  "71": "LUXURY",
  "72": "2 for £30 Bondage Picks",
  "76": "BOGOF PANTS & HOSIERY",
  "78": "BOGOHP SITEWIDE",
  "79": "eyemask free",
  "80": "20% off Payday",
  "85": "England 22% Off",
  "89": "MAVIS",
  "97": "3 for £15",
  "99": "SIGN UP 15",
};

export function knownPromotionName(promotionId: string): string | null {
  return KNOWN_PROMOTION_NAMES[promotionId] ?? null;
}
