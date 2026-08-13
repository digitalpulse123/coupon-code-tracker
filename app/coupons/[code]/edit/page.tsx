import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import CouponForm from "../../new/coupon-form";
import { updateCoupon } from "../../actions";
import { DeleteCouponButton } from "../../delete-coupon-button";

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

      <div style={{ marginTop: "2rem", paddingTop: "1.5rem", borderTop: "1px solid var(--border)" }}>
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: "0 0 0.5rem" }}>
          Delete this coupon. Only possible if it has no redemptions recorded.
        </p>
        <DeleteCouponButton
          id={coupon.id}
          code={coupon.code}
          redirectTo="/coupons"
        />
      </div>
    </main>
  );
}
