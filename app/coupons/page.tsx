import Link from "next/link";
import type { Prisma } from "@prisma/client";

import AppShell from "@/components/app-shell";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatOffer } from "@/lib/coupon-format";
import { formatDateGB } from "@/lib/format";
import { setCouponActive } from "./actions";
import { DeleteCouponButton } from "./delete-coupon-button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string; filter?: string }>;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "daily", label: "Daily" },
  { key: "email", label: "Email" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

function statusPill(coupon: {
  isActive: boolean;
  startsOn: Date | null;
  endsOn: Date | null;
}) {
  const now = new Date();
  if (!coupon.isActive) return <span className="pill p-ended">Inactive</span>;
  if (coupon.endsOn && coupon.endsOn < now) return <span className="pill p-ended">Ended</span>;
  if (coupon.startsOn && coupon.startsOn > now)
    return <span className="pill p-soon">Scheduled</span>;
  return <span className="pill p-live">Running</span>;
}

function runLabel(startsOn: Date | null, endsOn: Date | null): string {
  const start = formatDateGB(startsOn);
  const end = formatDateGB(endsOn);
  if (!start && !end) return "Ongoing";
  if (start && !end) return `${start} onwards`;
  if (!start && end) return `until ${end}`;
  return `${start} – ${end}`;
}

export default async function CouponsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter = sp.filter ?? "all";

  const session = await auth();
  const isAdmin = session?.user?.role === "admin";

  const where: Prisma.CouponWhereInput = {};
  if (q) {
    where.OR = [
      { code: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { campaign: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filter === "daily") where.type = "daily";
  else if (filter === "email") where.type = "email_limited";
  else if (filter === "active") where.isActive = true;
  else if (filter === "inactive") where.isActive = false;

  const [coupons, onlineCounts, instoreCounts, totalCount] = await Promise.all([
    prisma.coupon.findMany({ where, orderBy: [{ isActive: "desc" }, { code: "asc" }] }),
    prisma.onlineRedemption.groupBy({ by: ["couponId"], _count: { _all: true } }),
    prisma.instoreRedemption.groupBy({ by: ["couponId"], _count: { _all: true } }),
    prisma.coupon.count(),
  ]);

  const onlineByCoupon = new Map(
    onlineCounts.filter((r) => r.couponId).map((r) => [r.couponId as string, r._count._all]),
  );
  const instoreByCoupon = new Map(
    instoreCounts.map((r) => [r.couponId, r._count._all]),
  );

  const chip = (f: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (f !== "all") params.set("filter", f);
    const qs = params.toString();
    return `/coupons${qs ? `?${qs}` : ""}`;
  };

  return (
    <AppShell
      active="coupons"
      title="Coupons"
      subtitle="Every code, searchable · click one to open its record"
      actions={
        isAdmin ? (
          <Link href="/coupons/new" className="btn-sm">
            ＋ New coupon
          </Link>
        ) : undefined
      }
    >
      <div className="finder">
        <form className="search" method="get">
          <span className="search-ico">⌕</span>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by code or description"
            aria-label="Search coupons"
          />
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        </form>
        <div className="chips" role="group" aria-label="Filter coupons">
          {FILTERS.map((f) => (
            <Link key={f.key} href={chip(f.key)} aria-pressed={filter === f.key}>
              {f.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">All coupon codes</div>
          <div className="panel-note">
            {coupons.length === totalCount
              ? `${totalCount} codes`
              : `${coupons.length} of ${totalCount} codes`}
          </div>
        </div>

        {coupons.length === 0 ? (
          <div className="empty">
            <div className="empty-t">No codes match</div>
            <div className="empty-s">
              Try a shorter search or clear the filters.{" "}
              {isAdmin && <Link href="/coupons/new">Create a code</Link>}
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th style={{ width: 170 }}>Runs</th>
                <th style={{ width: 130 }}>Split</th>
                <th className="ta-r" style={{ width: 76 }}>
                  Uses
                </th>
                {isAdmin && <th className="ta-r" style={{ width: 150 }}></th>}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                const on = onlineByCoupon.get(c.id) ?? 0;
                const ins = instoreByCoupon.get(c.id) ?? 0;
                const uses = on + ins;
                const pct = uses ? Math.round((on / uses) * 100) : 0;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/coupons/${encodeURIComponent(c.code)}`} className="code">
                        {c.code}
                      </Link>
                      <div className="sub">{formatOffer(c)}</div>
                      <div className="chan-badges">
                        {c.validOnline && <span className="cb cb-on">Online</span>}
                        {c.validInstore && <span className="cb cb-in">In-store</span>}
                      </div>
                    </td>
                    <td className="runs">
                      <div className="dates">{runLabel(c.startsOn, c.endsOn)}</div>
                      {statusPill(c)}
                    </td>
                    <td>
                      {uses ? (
                        <>
                          <div className="minibar">
                            <i style={{ width: `${pct}%`, background: "var(--pink)" }} />
                            <i style={{ width: `${100 - pct}%`, background: "var(--teal)" }} />
                          </div>
                          <div className="sub num">
                            {on} / {ins}
                          </div>
                        </>
                      ) : (
                        <span className="sub">No uses yet</span>
                      )}
                    </td>
                    <td className="ta-r num" style={{ fontWeight: 700 }}>
                      {uses || "—"}
                    </td>
                    {isAdmin && (
                      <td className="ta-r" style={{ whiteSpace: "nowrap" }}>
                        <Link href={`/coupons/${encodeURIComponent(c.code)}/edit`}>Edit</Link>{" "}
                        <form action={setCouponActive} style={{ display: "inline" }}>
                          <input type="hidden" name="id" value={c.id} />
                          <input
                            type="hidden"
                            name="isActive"
                            value={c.isActive ? "false" : "true"}
                          />
                          <button className="btn-link">
                            {c.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </form>{" "}
                        <DeleteCouponButton id={c.id} code={c.code} />
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </AppShell>
  );
}
