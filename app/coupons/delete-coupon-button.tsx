"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCoupon } from "./actions";

export function DeleteCouponButton({
  id,
  code,
  redirectTo,
}: {
  id: string;
  code: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function remove() {
    if (!window.confirm(`Delete coupon ${code}? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteCoupon(id);
      if (res?.error) {
        window.alert(res.error);
        return;
      }
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    });
  }

  return (
    <button className="btn-link" onClick={remove} disabled={isPending}>
      Delete
    </button>
  );
}
