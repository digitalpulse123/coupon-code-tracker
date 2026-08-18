import Link from "next/link";

import AppShell from "@/components/app-shell";
import { prisma } from "@/lib/prisma";
import { getDashboardData, type Gran } from "@/lib/dashboard";
import { formatDateGB } from "@/lib/format";

export const dynamic = "force-dynamic";

function gbp(n: number): string {
  return `£${Math.round(n).toLocaleString("en-GB")}`;
}

const GRANS: { key: Gran; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

function Granularity({ gran }: { gran: Gran }) {
  return (
    <div className="seg" role="group" aria-label="Report granularity">
      {GRANS.map((g) => (
        <Link key={g.key} href={`/?gran=${g.key}`} aria-pressed={gran === g.key}>
          {g.label}
        </Link>
      ))}
    </div>
  );
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ gran?: string }>;
}) {
  const sp = await searchParams;
  const gran: Gran =
    sp.gran === "daily" || sp.gran === "monthly" ? sp.gran : "weekly";

  const [data, lastImport, lastInstore] = await Promise.all([
    getDashboardData(gran),
    prisma.importBatch.findFirst({ orderBy: { runAt: "desc" }, select: { runAt: true } }),
    prisma.instoreRedemption.findFirst({
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
  ]);

  const { kpis, series, byStore, topCodes } = data;
  const chartMax = Math.max(1, ...series.map((s) => s.online + s.instore));
  const storeMax = Math.max(1, ...byStore.map((s) => s.count));

  const kpiCards = [
    { label: "Online redemptions", value: kpis.onlineCount.toLocaleString("en-GB"), split: 100 },
    { label: "In-store redemptions", value: kpis.instoreCount.toLocaleString("en-GB"), split: 0 },
    { label: "Revenue from coupons", value: gbp(kpis.revenue), split: kpis.revenueSplit },
    { label: "Discount given", value: gbp(kpis.discount), split: 0 },
  ];

  return (
    <AppShell
      active="dash"
      title="Coupon performance"
      subtitle={`All channels · ${data.windowLabel}`}
      actions={<Granularity gran={gran} />}
    >
      {/* freshness banner (BR-07) */}
      <div className="sync">
        <span className="dot" />
        <b>Online import</b>{" "}
        {lastImport ? formatDateGB(lastImport.runAt) : "not run yet"}
        <span className="sep">·</span>
        <b>In-store last entered</b>{" "}
        {lastInstore ? formatDateGB(lastInstore.createdAt) : "no entries yet"}
      </div>

      {/* KPIs */}
      <div className="kpis">
        {kpiCards.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val num">{k.value}</div>
            <div className="split">
              <i className="on-" style={{ width: `${k.split}%` }} />
              <i className="in-" style={{ width: `${100 - k.split}%` }} />
            </div>
            <div className="split-key">
              <span>
                <span className="key-dot k-on" />
                Online
              </span>
              <span>
                <span className="key-dot k-in" />
                In-store
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid g-2-1">
        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">Redemptions over time</div>
            <div className="panel-note">
              <span className="key-dot k-on" />
              Online
              <span className="key-dot k-in" style={{ marginLeft: 12 }} />
              In-store
            </div>
          </div>
          <div className="panel-body">
            <div className="chart">
              {series.map((s, i) => (
                <div className="bar-wrap" key={i}>
                  <div className="bar-tip">
                    {s.online + s.instore} redemptions
                    <i>
                      {s.online} online · {s.instore} in-store
                    </i>
                  </div>
                  <div className="bar on-" style={{ height: `${(s.online / chartMax) * 100}%` }} />
                  {s.instore > 0 ? (
                    <div className="bar in-" style={{ height: `${(s.instore / chartMax) * 100}%` }} />
                  ) : (
                    <div className="bar zero" />
                  )}
                </div>
              ))}
            </div>
            <div className="x-axis">
              {series.map((s, i) => (
                <div key={i}>{s.label}</div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="panel-title">By store</div>
            <div className="panel-note">In-store · top 8</div>
          </div>
          <div className="panel-body">
            {byStore.length === 0 ? (
              <p className="sub">No in-store redemptions in this period.</p>
            ) : (
              byStore.map((s) => (
                <div className="store-row" key={s.name}>
                  <div className="store-name">{s.name}</div>
                  <div className="store-bar">
                    <i style={{ width: `${(s.count / storeMax) * 100}%` }} />
                  </div>
                  <div className="store-val num">{s.count}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Coupon codes</div>
          <div className="panel-note">Ranked by redemptions · click a row for detail</div>
        </div>
        {topCodes.length === 0 ? (
          <div className="empty">
            <div className="empty-t">No redemptions yet</div>
            <div className="empty-s">
              Run a Metorik sync on the Imports page, or enter in-store figures against a code.
            </div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Split</th>
                <th className="ta-r">Uses</th>
                <th className="ta-r">Revenue</th>
                <th className="ta-r">Discount given</th>
                <th className="ta-r">AOV</th>
              </tr>
            </thead>
            <tbody>
              {topCodes.map((c) => {
                const uses = c.online + c.instore;
                const pct = uses ? Math.round((c.online / uses) * 100) : 0;
                return (
                  <tr key={c.code} className="clickable">
                    <td>
                      <Link href={`/coupons/${encodeURIComponent(c.code)}`} className="code">
                        {c.code}
                      </Link>
                      <div className="sub">{c.name}</div>
                    </td>
                    <td>
                      <div className="minibar">
                        <i style={{ width: `${pct}%`, background: "var(--pink)" }} />
                        <i style={{ width: `${100 - pct}%`, background: "var(--teal)" }} />
                      </div>
                      <div className="sub num">
                        {c.online} / {c.instore}
                      </div>
                    </td>
                    <td className="ta-r num" style={{ fontWeight: 700 }}>
                      {uses}
                    </td>
                    <td className="ta-r num">{gbp(c.revenue)}</td>
                    <td className="ta-r num">{c.discount > 0 ? gbp(c.discount) : "—"}</td>
                    <td className="ta-r num">£{c.aov.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="disclaimer">
        Online figures come from the Metorik import (promotion-matched orders); in-store
        figures are entered manually. Online discount is not exposed by Metorik, so discount
        given reflects in-store entries only.
      </div>
    </AppShell>
  );
}
