import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import CouponForm from "./coupon-form";
import { createCoupon } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCouponPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/coupons");

  return (
    <main className="container">
      <p className="auth-eyebrow">
        <Link href="/coupons">Coupons</Link> / New
      </p>
      <h1 style={{ fontSize: "1.6rem", margin: "0 0 1.5rem" }}>
        Create a coupon
      </h1>
      <CouponForm action={createCoupon} submitLabel="Create coupon" />
    </main>
  );
}
