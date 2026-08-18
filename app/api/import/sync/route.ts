import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { runMetorikSync } from "@/lib/metorik-import";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Triggered by the daily schedule (Bearer CRON_SECRET) or by an admin session.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");

  let allowed = false;
  if (secret && provided && provided === secret) {
    allowed = true;
  } else {
    const session = await auth();
    if (session?.user?.role === "admin") allowed = true;
  }
  if (!allowed) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  const days = Number(new URL(request.url).searchParams.get("days"));
  const sinceDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 2;

  const result = await runMetorikSync({ sinceDays });
  const status = result.error ? 500 : 200;
  return NextResponse.json(result, { status });
}
