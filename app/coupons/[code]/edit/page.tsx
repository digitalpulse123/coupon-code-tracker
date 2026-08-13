import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CouponForm from "../../new/coupon-form";
import { updateCoupon } from "../../actions";

export const dynamic = "force-dynamic";

function isoDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

function decimalString(v: unknown): string {
  return v === null || v === undefined ? "" : String(Number(v));
}

export default async function EditCouponPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).toUpperCase();

  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/coupons");

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) notFound();

  const initial = {
    id: coupon.id,
    code: coupon.code,
    name: coupon.name,
    type: coupon.type ?? "",
    campaign: coupon.campaign ?? "",
    validOnline: coupon.validOnline,
    validInstore: coupon.validInstore,
    offerType: coupon.offerType ?? "",
    offerValue: decimalString(coupon.offerValue),
    minSpend: decimalString(coupon.minSpend),
    giftSku: coupon.giftSku ?? "",
    startsOn: isoDate(coupon.startsOn),
    endsOn: isoDate(coupon.endsOn),
    isActive: coupon.isActive,
  };

  return (
    <main className="container">
      <p className="auth-eyebrow">
        <Link href="/coupons">Coupons</Link> /{" "}
        <Link href={`/coupons/${encodeURIComponent(coupon.code)}`}>{coupon.code}</Link> / Edit
      </p>
      <h1 style={{ fontSize: "1.6rem", margin: "0 0 1.5rem" }}>Edit coupon</h1>
      <CouponForm action={updateCoupon} initial={initial} submitLabel="Save changes" />
    </main>
  );
}
