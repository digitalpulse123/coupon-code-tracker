"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import type { CouponType, OfferType } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type ActionState = { error?: string };

const OFFER_TYPES: OfferType[] = [
  "percentage",
  "fixed",
  "threshold",
  "multibuy",
  "bogof",
  "bogohp",
  "free_gift",
];
const COUPON_TYPES: CouponType[] = ["daily", "email_limited"];

async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Not authorised");
}

function parseOptionalDate(raw: string): Date | null | "invalid" {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

export async function createCoupon(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  const name = String(formData.get("name") ?? "").trim();
  const typeRaw = String(formData.get("type") ?? "");
  const campaign = String(formData.get("campaign") ?? "").trim() || null;
  const validOnline = formData.get("validOnline") === "on";
  const validInstore = formData.get("validInstore") === "on";
  const offerTypeRaw = String(formData.get("offerType") ?? "");
  const offerValueRaw = String(formData.get("offerValue") ?? "").trim();
  const minSpendRaw = String(formData.get("minSpend") ?? "").trim();
  const giftSku = String(formData.get("giftSku") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";

  // Base validation.
  if (!code) return { error: "A coupon code is required." };
  if (!name) return { error: "A name is required." };
  if (!COUPON_TYPES.includes(typeRaw as CouponType)) {
    return { error: "Choose a coupon type." };
  }
  if (!validOnline && !validInstore) {
    return { error: "A coupon must be valid on at least one channel." };
  }
  if (!OFFER_TYPES.includes(offerTypeRaw as OfferType)) {
    return { error: "Choose an offer type." };
  }
  const type = typeRaw as CouponType;
  const offerType = offerTypeRaw as OfferType;

  // Minimum spend is optional on any offer type (decision D-07).
  let minSpend: number | null = null;
  if (minSpendRaw) {
    minSpend = Number(minSpendRaw);
    if (Number.isNaN(minSpend) || minSpend < 0) {
      return { error: "Minimum spend must be a positive amount." };
    }
  }

  let offerValue: number | null = null;

  switch (offerType) {
    case "percentage": {
      offerValue = Number(offerValueRaw);
      if (!offerValueRaw || Number.isNaN(offerValue) || offerValue <= 0 || offerValue > 100) {
        return { error: "Enter a percentage between 0 and 100." };
      }
      break;
    }
    case "fixed": {
      offerValue = Number(offerValueRaw);
      if (!offerValueRaw || Number.isNaN(offerValue) || offerValue <= 0) {
        return { error: "Enter the amount off in pounds." };
      }
      break;
    }
    case "threshold": {
      offerValue = Number(offerValueRaw);
      if (!offerValueRaw || Number.isNaN(offerValue) || offerValue <= 0) {
        return { error: "Enter the amount off in pounds." };
      }
      if (minSpend === null) {
        return { error: "A threshold offer needs a minimum spend." };
      }
      break;
    }
    case "free_gift": {
      if (!giftSku) return { error: "Enter the gift SKU." };
      break;
    }
    case "multibuy":
    case "bogof":
    case "bogohp":
      // No extra fields captured. The discount is entered per redemption (BR-09).
      break;
  }

  const startsOn = parseOptionalDate(String(formData.get("startsOn") ?? "").trim());
  const endsOn = parseOptionalDate(String(formData.get("endsOn") ?? "").trim());
  if (startsOn === "invalid" || endsOn === "invalid") {
    return { error: "Please enter valid dates." };
  }
  if (startsOn && endsOn && endsOn < startsOn) {
    return { error: "The end date cannot be before the start date." };
  }

  try {
    await prisma.coupon.create({
      data: {
        code,
        name,
        type,
        campaign,
        validOnline,
        validInstore,
        offerType,
        offerValue,
        minSpend,
        multibuyQty: null,
        multibuyPayQty: null,
        giftSku: offerType === "free_gift" ? giftSku : null,
        startsOn,
        endsOn,
        isActive,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: `A coupon with the code ${code} already exists.` };
    }
    throw e;
  }

  revalidatePath("/coupons");
  redirect("/coupons");
}

export async function setCouponActive(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!id) return;

  await prisma.coupon.update({ where: { id }, data: { isActive } });
  revalidatePath("/coupons");
}
