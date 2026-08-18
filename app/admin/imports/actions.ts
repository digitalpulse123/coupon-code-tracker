"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { runMetorikSync, type SyncResult } from "@/lib/metorik-import";

export async function syncNow(days: number): Promise<SyncResult> {
  const session = await auth();
  if (session?.user?.role !== "admin") return { error: "Not authorised" };

  const sinceDays = Number.isFinite(days) && days > 0 ? Math.min(days, 90) : 3;
  const result = await runMetorikSync({ sinceDays, runByUserId: session.user.id });

  revalidatePath("/admin/imports");
  revalidatePath("/admin/promotions");
  return result;
}
