import Link from "next/link";
import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatOffer } from "@/lib/coupon-format";
import { formatMoneyGB, formatDateGB } from "@/lib/format";
import { InstoreEntry } from "./instore-entry";
import { InstoreRow, type InstoreRowData } from "./instore-row";

export const dynamic = "force-dynamic";

export default async function CouponDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = decodeURIComponent(rawCode).toUpperCase();

  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  if (!coupon) notFound();

  const [online, instore, stores] = await Promise.all([
    prisma.onlineRedemption.findMany({
      where: { couponId: coupon.id },
      orderBy: { orderDate: "desc" },
      include: { store: true, lineItems: true },
    }),
    prisma.instoreRedemption.findMany({
      where: { couponId: coupon.id },
      orderBy: { redeemedOn: "desc" },
      include: { store: true },
    }),
    prisma.store.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const instoreRows: InstoreRowData[] = instore.map((r) => ({
    id: r.id,
    redeemedOnDisplay: formatDateGB(r.redeemedOn),
    redeemedOnISO: r.redeemedOn.toISOString().slice(0, 10),
    storeId: r.storeId,
    storeName: r.store.name,
    transactionTotal: Number(r.transactionTotal),
    discountAmount: r.discountAmount === null ? null : Number(r.discountAmount),
    receiptRef: r.receiptRef,
    itemsText: r.itemsText,
  }));

  return (
    <main className="container">
      <p className="auth-eyebrow">
        <Link href="/coupons">Coupons</Link> / {coupon.code}
      </p>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: "1.6rem", margin: "0 0 0.5rem" }}>{coupon.name}</h1>
        {isAdmin && (
          <Link href={`/coupons/${encodeURIComponent(coupon.code)}/edit`}>Edit coupon</Link>
        )}
      </div>

      <p
        style={{
          display: "flex",
          gap: "0.5rem",
          flexWrap: "wrap",
          alignItems: "center",
          color: "var(--muted)",
          margin: "0 0 2rem",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--fg)" }}>{coupon.code}</span>
        <span>·</span>
        <span>{formatOffer(coupon)}</span>
        <span>·</span>
        {coupon.validOnline && <span className="badge badge-online">Online</span>}
        {coupon.validInstore && <span className="badge badge-instore">In store</span>}
        <span>·</span>
        {coupon.isActive ? (
          <span className="badge badge-on">Active</span>
        ) : (
          <span className="badge badge-off">Inactive</span>
        )}
      </p>

      {/* Online redemptions */}
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>
          <span className="channel-online">Online</span> redemptions
        </h2>
        {online.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>
            No online redemptions yet. These arrive from the Metorik import.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Products</th>
                  <th>Shipping</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {online.map((o) => (
                  <tr key={o.id}>
                    <td>{o.orderNumber}</td>
                    <td>{formatDateGB(o.orderDate)}</td>
                    <td>
                      {o.lineItems.length === 0
                        ? "—"
                        : o.lineItems
                            .map((li) => `${li.productName ?? li.sku ?? "item"} x${li.quantity ?? 1}`)
                            .join(", ")}
                    </td>
                    <td>{o.shippingMethodRaw ?? "—"}</td>
                    <td>{formatMoneyGB(o.orderTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* In-store redemptions */}
      <section>
        <h2 style={{ fontSize: "1.1rem" }}>
          <span className="channel-instore">In store</span> redemptions
        </h2>
        {instoreRows.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No in-store redemptions entered yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Store</th>
                  <th>Products</th>
                  <th>Total</th>
                  <th>Discount</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {instoreRows.map((row) => (
                  <InstoreRow
                    key={row.id}
                    row={row}
                    stores={stores}
                    code={coupon.code}
                    canEdit={isAdmin}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isAdmin && (
          <div style={{ marginTop: "2rem" }}>
            <h3 style={{ fontSize: "0.95rem" }}>Enter in-store redemptions</h3>
            {stores.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>
                Add stores first on <Link href="/admin/stores">Manage stores</Link>.
              </p>
            ) : (
              <InstoreEntry couponId={coupon.id} code={coupon.code} stores={stores} />
            )}
          </div>
        )}
      </section>
    </main>
  );
}
