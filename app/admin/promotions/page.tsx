import { redirect } from "next/navigation";

import AppShell from "@/components/app-shell";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { metorikConfigured } from "@/lib/metorik";
import { knownPromotionName } from "@/lib/known-promotions";
import { ScanButton } from "./scan-button";
import { assignPromotion, createCouponAndAssign } from "./actions";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const [unassigned, assignedCount, coupons] = await Promise.all([
    prisma.metorikPromotion.findMany({
      where: { couponId: null },
      orderBy: { orderCount: "desc" },
    }),
    prisma.metorikPromotion.count({ where: { couponId: { not: null } } }),
    prisma.coupon.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true },
    }),
  ]);

  return (
    <AppShell
      active="promotions"
      title="Promotions to assign"
      subtitle={`Unassigned promotion IDs found in Metorik orders · ${assignedCount} already assigned`}
    >
      {!metorikConfigured() && (
        <p className="form-error">
          The Metorik API key is not set, so scanning is disabled.
        </p>
      )}

      <div style={{ marginBottom: "2rem" }}>
        <ScanButton />
      </div>

      {unassigned.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>
          Nothing to assign. Run a scan to look for new promotions.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr>
                <th>Promotion ID</th>
                <th>Suggested name</th>
                <th>Recent orders</th>
                <th>Sample products</th>
                <th>Assign</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map((promo) => {
                const suggested =
                  knownPromotionName(promo.promotionId) ?? "";
                return (
                  <tr key={promo.id}>
                    <td style={{ fontWeight: 600 }}>{promo.promotionId}</td>
                    <td>{suggested || <span style={{ color: "var(--muted)" }}>unknown</span>}</td>
                    <td>{promo.orderCount}</td>
                    <td style={{ maxWidth: "20rem", color: "var(--muted)", fontSize: "0.85rem" }}>
                      {promo.sampleProducts ?? "—"}
                    </td>
                    <td>
                      <form
                        action={createCouponAndAssign}
                        style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem", flexWrap: "wrap" }}
                      >
                        <input type="hidden" name="promotionId" value={promo.promotionId} />
                        <input
                          type="text"
                          name="code"
                          placeholder="Coupon code"
                          aria-label="Coupon code"
                        />
                        <input
                          type="text"
                          name="name"
                          defaultValue={suggested}
                          placeholder="Name"
                          aria-label="Name"
                          required
                        />
                        <button className="btn-link" style={{ whiteSpace: "nowrap" }}>
                          Create &amp; assign
                        </button>
                      </form>
                      {coupons.length > 0 && (
                        <form
                          action={assignPromotion}
                          style={{ display: "flex", gap: "0.4rem" }}
                        >
                          <input type="hidden" name="promotionId" value={promo.promotionId} />
                          <select name="couponId" required defaultValue="">
                            <option value="">Existing code...</option>
                            {coupons.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.code}
                              </option>
                            ))}
                          </select>
                          <button className="btn-link">Assign</button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
