import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatOffer } from "@/lib/coupon-format";
import { formatDateGB } from "@/lib/format";
import { setCouponActive } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  channel?: string;
  status?: string;
}>;

function runLabel(startsOn: Date | null, endsOn: Date | null): string {
  const start = formatDateGB(startsOn);
  const end = formatDateGB(endsOn);
  if (!start && !end) return "—";
  if (start && !end) return `${start} onwards`;
  if (!start && end) return `until ${end}`;
  return `${start} to ${end}`;
}

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const channel = sp.channel ?? "all";
  const status = sp.status ?? "all";

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
  if (channel === "online") where.validOnline = true;
  else if (channel === "instore") where.validInstore = true;
  else if (channel === "both") {
    where.validOnline = true;
    where.validInstore = true;
  }
  if (status === "active") where.isActive = true;
  else if (status === "inactive") where.isActive = false;

  const coupons = await prisma.coupon.findMany({
    where,
    orderBy: [{ isActive: "desc" }, { code: "asc" }],
  });

  return (
    <main className="container">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div>
          <p className="auth-eyebrow">
            <Link href="/">Dashboard</Link>
          </p>
          <h1 style={{ fontSize: "1.6rem", margin: 0 }}>Coupons</h1>
        </div>
        {isAdmin && (
          <Link
            href="/coupons/new"
            className="btn-primary"
            style={{ width: "auto", textDecoration: "none", padding: "0.55rem 1rem" }}
          >
            Create a coupon
          </Link>
        )}
      </div>

      <form method="get" className="inline-form" style={{ marginBottom: "1.5rem" }}>
        <div className="field" style={{ margin: 0, flex: "1 1 14rem" }}>
          <label htmlFor="q">Search</label>
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={q}
            placeholder="Code, name or campaign"
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="channel">Channel</label>
          <select id="channel" name="channel" defaultValue={channel}>
            <option value="all">All</option>
            <option value="online">Online</option>
            <option value="instore">In store</option>
            <option value="both">Both</option>
          </select>
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={status}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button className="btn-primary" style={{ width: "auto" }}>
          Filter
        </button>
      </form>

      {coupons.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>
          No coupons match. {isAdmin && <Link href="/coupons/new">Create one</Link>}
        </p>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Channels</th>
              <th>Offer</th>
              <th>Runs</th>
              <th>Status</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {coupons.map((coupon) => (
              <tr key={coupon.id}>
                <td style={{ fontWeight: 600 }}>
                  <Link href={`/coupons/${encodeURIComponent(coupon.code)}`}>
                    {coupon.code}
                  </Link>
                </td>
                <td>{coupon.name}</td>
                <td>
                  <span style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
                    {coupon.validOnline && (
                      <span className="badge badge-online">Online</span>
                    )}
                    {coupon.validInstore && (
                      <span className="badge badge-instore">In store</span>
                    )}
                  </span>
                </td>
                <td>{formatOffer(coupon)}</td>
                <td>{runLabel(coupon.startsOn, coupon.endsOn)}</td>
                <td>
                  {coupon.isActive ? (
                    <span className="badge badge-on">Active</span>
                  ) : (
                    <span className="badge badge-off">Inactive</span>
                  )}
                </td>
                {isAdmin && (
                  <td style={{ textAlign: "right" }}>
                    <form action={setCouponActive}>
                      <input type="hidden" name="id" value={coupon.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={coupon.isActive ? "false" : "true"}
                      />
                      <button className="btn-link">
                        {coupon.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
