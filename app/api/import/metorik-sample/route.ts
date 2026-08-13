import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { metorikGet, metorikConfigured } from "@/lib/metorik";

export const dynamic = "force-dynamic";

// Keys whose values are personal data and must never leave Metorik. Matched
// against every key at every depth. shipping_method_title is explicitly kept.
const PII_PATTERNS = [
  /email/i,
  /phone/i,
  /first_name/i,
  /last_name/i,
  /_name$/i,
  /address/i,
  /ip_address/i,
  /customer/i,
  /billing/i,
];

function isPiiKey(key: string): boolean {
  if (key === "shipping_method_title") return false;
  return PII_PATTERNS.some((re) => re.test(key));
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = isPiiKey(k) ? "[redacted]" : redact(v);
    }
    return out;
  }
  return value;
}

// Collect any object key that mentions coupon or discount, at any depth.
function findCouponKeys(value: unknown, found = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((v) => findCouponKeys(v, found));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (/coupon|discount/i.test(k)) found.add(k);
      findCouponKeys(v, found);
    }
  }
  return found;
}

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.slice(0, 4000) };
  }
}

// Admin diagnostic. Personal data is stripped before anything is returned.
// Default mode scans recent orders for one that used a coupon, so the coupon
// field structure can be inspected. ?search=<order number> fetches a specific
// order instead.
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Not authorised" }, { status: 403 });
  }
  if (!metorikConfigured()) {
    return NextResponse.json(
      { error: "METORIK_API_KEY is not set in the environment yet." },
      { status: 400 },
    );
  }

  const search = new URL(request.url).searchParams.get("search");

  if (search) {
    const res = await metorikGet("/orders", { search, per_page: 3 });
    if (!res.ok) {
      return NextResponse.json({
        error: `Metorik returned ${res.status}`,
        body: (await res.text()).slice(0, 2000),
      });
    }
    return NextResponse.json(redact(await readJson(res)));
  }

  // Scan up to 3 pages of recent orders for one that carries a coupon.
  const orders: unknown[] = [];
  for (let page = 1; page <= 3; page++) {
    const res = await metorikGet("/orders", {
      page,
      per_page: 100,
      order_by: "order_created_at",
      order_dir: "desc",
    });
    if (!res.ok) {
      return NextResponse.json({
        error: `Metorik returned ${res.status} on page ${page}`,
        body: (await res.text()).slice(0, 2000),
      });
    }
    const json = (await readJson(res)) as {
      data?: unknown[];
      pagination?: { has_more_pages?: boolean };
    };
    orders.push(...(json.data ?? []));
    if (!json.pagination?.has_more_pages) break;
  }

  const couponKeys = new Set<string>();
  const couponOrders = orders.filter((o) => {
    const keys = findCouponKeys(o);
    keys.forEach((k) => couponKeys.add(k));
    return keys.size > 0;
  });

  const samples = (couponOrders.length ? couponOrders : orders)
    .slice(0, 2)
    .map(redact);

  const firstOrder = orders[0];
  const topLevelKeys =
    firstOrder && typeof firstOrder === "object"
      ? Object.keys(firstOrder as Record<string, unknown>)
      : [];

  return NextResponse.json({
    scanned: orders.length,
    couponOrdersFound: couponOrders.length,
    couponKeysSeen: [...couponKeys],
    topLevelKeys,
    note: couponOrders.length
      ? "Found orders carrying a coupon/discount field. See samples."
      : "No coupon or discount field found on scanned orders. Either orders do not expose coupons via the API, or none in this recent window used one.",
    samples,
  });
}
