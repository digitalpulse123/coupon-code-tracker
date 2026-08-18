import Link from "next/link";
import { notFound } from "next/navigation";
import type { FulfilmentGroup } from "@prisma/client";

import AppShell from "@/components/app-shell";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatOffer } from "@/lib/coupon-format";
import { formatMoneyGB, formatDateGB } from "@/lib/format";
import { InstoreEntry } from "./instore-entry";
import { InstoreRow, type InstoreRowData } from "./instore-row";

export const dynamic = "force-dynamic";

const SHIP: Record<FulfilmentGroup, { label: string; cls: string }> = {
  guaranteed: { label: "Guaranteed shipping", cls: "ship-del" },
  click_collect: { label: "Click & collect", cls: "ship-cc" },
  click_reserve: { label: "Click & reserve", cls: "ship-cr" },
};

function gbp(n: number): string {
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

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

  // Online stats (dedupe revenue by order number).
  const onlineOrderTotals = new Map<string, number>();
  for (const o of online) {
    if (!onlineOrderTotals.has(o.orderNumber)) {
      onlineOrderTotals.set(o.orderNumber, Number(o.orderTotal ?? 0));
    }
  }
  const onlineValue = [...onlineOrderTotals.values()].reduce((a, b) => a + b, 0);
  const onlineAov = online.length ? onlineValue / online.length : 0;
  const shipMix: Record<FulfilmentGroup, number> = {
    guaranteed: 0,
    click_collect: 0,
    click_reserve: 0,
  };
  for (const o of online) {
    if (o.fulfilmentGroup) shipMix[o.fulfilmentGroup] += 1;
  }

  const instoreValue = instore.reduce((a, s) => a + Number(s.transactionTotal), 0);
  const instoreAvg = instore.length ? instoreValue / instore.length : 0;

  const totalUses = online.length + instore.length;
  const totalRevenue = onlineValue + instoreValue;
  const totalDiscount = instore.reduce((a, s) => a + Number(s.discountAmount ?? 0), 0);

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
    <AppShell
      active="coupons"
      title="Coupon detail"
      subtitle={`${formatOffer(coupon)} · ${coupon.type === "email_limited" ? "email code" : "daily code"}`}
    >
      <Link href="/coupons" className="back">
        ← All coupons
      </Link>

      <div className="detail-head">
        <div>
          <div className="detail-code">{coupon.code}</div>
          <div className="detail-desc">
            {formatOffer(coupon)}. {coupon.name}.
          </div>
        </div>
        <div className="detail-stats">
          <div>
            <div className="dstat-l">Total uses</div>
            <div className="dstat-v num">{totalUses || "—"}</div>
          </div>
          <div>
            <div className="dstat-l">Revenue</div>
            <div className="dstat-v num">{totalUses ? gbp(totalRevenue) : "—"}</div>
          </div>
          <div>
            <div className="dstat-l">Discount</div>
            <div className="dstat-v num">{totalDiscount > 0 ? gbp(totalDiscount) : "—"}</div>
          </div>
          {isAdmin && (
            <div style={{ alignSelf: "center" }}>
              <Link href={`/coupons/${encodeURIComponent(coupon.code)}/edit`} className="detail-edit">
                Edit
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Online */}
      <div className="chan chan-on">
        <span className="chan-flag" />
        <div className="chan-head">
          <div>
            <div className="chan-title">Online</div>
            <div className="chan-src">From Metorik · order-level records</div>
          </div>
          <div className="chan-stats">
            <div>
              <div className="cs-l">Uses</div>
              <div className="cs-v num">{online.length}</div>
            </div>
            <div>
              <div className="cs-l">Value</div>
              <div className="cs-v num">{gbp(onlineValue)}</div>
            </div>
            <div>
              <div className="cs-l">AOV</div>
              <div className="cs-v num">£{onlineAov.toFixed(2)}</div>
            </div>
          </div>
        </div>
        {online.length === 0 ? (
          <div className="pnone2" style={{ padding: 22, textAlign: "center" }}>
            <span className="sub">No online redemptions yet. These arrive from the Metorik import.</span>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 118 }}>Order number</th>
                  <th style={{ width: 92 }}>Date</th>
                  <th>Products purchased</th>
                  <th style={{ width: 190 }}>Shipping</th>
                  <th className="ta-r" style={{ width: 88 }}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {online.map((o) => (
                  <tr key={o.id}>
                    <td className="ref num">{o.orderNumber}</td>
                    <td className="num sub">{formatDateGB(o.orderDate)}</td>
                    <td className="prods">
                      {o.lineItems.length === 0 ? (
                        <span className="prods-none">Not recorded</span>
                      ) : (
                        o.lineItems.map((li) => (
                          <span key={li.id}>
                            <b>{li.quantity ?? 1}×</b> {li.productName ?? "item"}
                            {li.sku ? <i>{li.sku}</i> : null}
                          </span>
                        ))
                      )}
                    </td>
                    <td>
                      {o.fulfilmentGroup ? (
                        <span className={`ship ${SHIP[o.fulfilmentGroup].cls}`}>
                          {SHIP[o.fulfilmentGroup].label}
                        </span>
                      ) : (
                        <span className="sub">{o.shippingMethodRaw ?? "—"}</span>
                      )}
                      {o.store ? <span className="sub"> {o.store.name}</span> : null}
                    </td>
                    <td className="ta-r num tot">{formatMoneyGB(o.orderTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {online.length > 0 && (
          <div className="chan-foot">
            {online.length} online {online.length === 1 ? "order" : "orders"}
            <div className="ship-mix">
              <span>
                <span className="key-dot k-del" />
                Guaranteed <b className="num">{shipMix.guaranteed}</b>
              </span>
              <span>
                <span className="key-dot k-cc" />
                Click &amp; collect <b className="num">{shipMix.click_collect}</b>
              </span>
              <span>
                <span className="key-dot k-cr" />
                Click &amp; reserve <b className="num">{shipMix.click_reserve}</b>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* In-store */}
      <div className="chan chan-in">
        <span className="chan-flag" />
        <div className="chan-head">
          <div>
            <div className="chan-title">In-store</div>
            <div className="chan-src">Entered from the store figures sent through</div>
          </div>
          <div className="chan-stats">
            <div>
              <div className="cs-l">Uses</div>
              <div className="cs-v num">{instore.length}</div>
            </div>
            <div>
              <div className="cs-l">Value</div>
              <div className="cs-v num">{gbp(instoreValue)}</div>
            </div>
            <div>
              <div className="cs-l">Avg spend</div>
              <div className="cs-v num">£{instoreAvg.toFixed(2)}</div>
            </div>
          </div>
        </div>

        {instoreRows.length === 0 ? (
          <div className="pnone2" style={{ padding: 22, textAlign: "center" }}>
            <span className="sub">No in-store redemptions recorded for this code yet.</span>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 92 }}>Date</th>
                  <th style={{ width: 130 }}>Store</th>
                  <th>Products</th>
                  <th className="ta-r" style={{ width: 88 }}>
                    Total
                  </th>
                  <th className="ta-r" style={{ width: 88 }}>
                    Discount
                  </th>
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
      </div>

      {isAdmin && (
        <div className="panel">
          <div className="addbox">
            <div className="addbox-t">Add in-store redemptions for {coupon.code}</div>
            <div className="addbox-s">
              One row per redemption. Add as many as you need, then save the batch in one go.
            </div>
            {stores.length === 0 ? (
              <p className="sub">
                Add stores first on <Link href="/admin/stores">Stores</Link>.
              </p>
            ) : (
              <InstoreEntry couponId={coupon.id} code={coupon.code} stores={stores} />
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
