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

// Admin diagnostic: fetches a few recent orders with personal data stripped so
// the real order shape (coupons, shipping, line items) can be inspected before
// the importer is built. Not part of the import pipeline.
export async function GET() {
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

  let res: Response;
  try {
    res = await metorikGet("/orders", {
      per_page: 3,
      order_by: "order_created_at",
      order_dir: "desc",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Request failed" },
      { status: 500 },
    );
  }

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      {
        error: `Metorik returned ${res.status}`,
        body: text.slice(0, 2000),
      },
      { status: 200 },
    );
  }

  try {
    return NextResponse.json(redact(JSON.parse(text)));
  } catch {
    return NextResponse.json({ raw: text.slice(0, 4000) });
  }
}
