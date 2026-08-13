import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Never cache. Reports live service and database reachability.
export const dynamic = "force-dynamic";

export async function GET() {
  let db: "ok" | "unreachable" = "unreachable";

  try {
    await prisma.$queryRaw`SELECT 1`;
    db = "ok";
  } catch {
    db = "unreachable";
  }

  return NextResponse.json(
    {
      status: "ok",
      db,
      time: new Date().toISOString(),
    },
    { status: db === "ok" ? 200 : 503 },
  );
}
