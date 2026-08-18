import { redirect } from "next/navigation";

import AppShell from "@/components/app-shell";
import { auth } from "@/auth";
import CouponForm from "./coupon-form";
import { createCoupon } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewCouponPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/coupons");

  return (
    <AppShell
      active="new"
      title="Create a coupon"
      subtitle="Adds the code to the tracker master list"
    >
      <div className="rule">
        <b>This adds the code to the tracker, not to the website.</b> The working
        coupon or promotion still lives in WooCommerce. This record is what the
        tracker matches redemptions against, and what the in-store entry form offers.
      </div>
      <div className="panel form-wide">
        <div className="panel-body">
          <CouponForm action={createCoupon} submitLabel="Create coupon" />
        </div>
      </div>
    </AppShell>
  );
}
