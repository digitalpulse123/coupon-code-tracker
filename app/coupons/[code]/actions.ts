"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import type { InstoreRedemption } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { InstoreRowInput } from "./types";

type ActionState = { error?: string; ok?: boolean };

type ScalarRow = {
  redeemedOn?: string;
  storeId?: string;
  transactionTotal?: string;
  discountAmount?: string;
  receiptRef?: string;
};

type PreparedRow = {
  redeemedOn: Date;
  storeId: string;
  transactionTotal: number;
  discountAmount: number | null;
  receiptRef: string | null;
};

async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Not authorised");
  return session;
}

// Plain JSON snapshot of a row, for the audit log before/after fields.
function snapshot(r: InstoreRedemption): Prisma.InputJsonValue {
  return {
    couponId: r.couponId,
    redeemedOn: r.redeemedOn.toISOString().slice(0, 10),
    storeId: r.storeId,
    transactionTotal: Number(r.transactionTotal),
    discountAmount: r.discountAmount === null ? null : Number(r.discountAmount),
    receiptRef: r.receiptRef,
    itemsText: r.itemsText,
  };
}

function validateRow(r: ScalarRow, today: Date): { data: PreparedRow } | { error: string } {
  const redeemedOnStr = (r.redeemedOn ?? "").trim();
  let redeemedOn: Date;
  if (redeemedOnStr) {
    redeemedOn = new Date(redeemedOnStr);
    if (Number.isNaN(redeemedOn.getTime())) return { error: "the date is invalid." };
    if (redeemedOn > today) return { error: "the date cannot be in the future." };
  } else {
    redeemedOn = today; // no date entered: use today
  }

  const storeId = (r.storeId ?? "").trim();
  if (!storeId) return { error: "choose a store." };

  const totalStr = (r.transactionTotal ?? "").trim();
  const transactionTotal = Number(totalStr);
  if (!totalStr || Number.isNaN(transactionTotal) || transactionTotal <= 0) {
    return { error: "enter a transaction total." };
  }

  const discStr = (r.discountAmount ?? "").trim();
  let discountAmount: number | null = null;
  if (discStr) {
    discountAmount = Number(discStr);
    if (Number.isNaN(discountAmount) || discountAmount < 0) {
      return { error: "the discount must be a positive amount." };
    }
    if (discountAmount > transactionTotal) {
      return { error: "the discount cannot be more than the total." };
    }
  }

  return {
    data: {
      redeemedOn,
      storeId,
      transactionTotal,
      discountAmount,
      receiptRef: (r.receiptRef ?? "").trim() || null,
    },
  };
}

async function assertStoresExist(storeIds: string[]): Promise<boolean> {
  const unique = [...new Set(storeIds)];
  const found = await prisma.store.findMany({
    where: { id: { in: unique } },
    select: { id: true },
  });
  return found.length === unique.length;
}

export async function saveInstoreBatch(
  couponId: string,
  code: string,
  rows: InstoreRowInput[],
): Promise<ActionState> {
  const session = await assertAdmin();
  const userId = session.user.id;

  if (!rows || rows.length === 0) return { error: "Add at least one row." };

  const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
  if (!coupon) return { error: "That coupon no longer exists." };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const prepared: { data: PreparedRow; itemsText: string | null; products: InstoreRowInput["products"] }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const result = validateRow(rows[i], today);
    if ("error" in result) return { error: `Row ${i + 1}: ${result.error}` };
    const products = (rows[i].products ?? []).map((p) => ({
      name: String(p.name),
      sku: String(p.sku),
      quantity: Math.max(1, Math.round(Number(p.quantity) || 1)),
    }));
    const itemsText =
      products.length > 0
        ? products.map((p) => `${p.name} ×${p.quantity}`).join(", ")
        : null;
    prepared.push({ data: result.data, itemsText, products });
  }

  if (!(await assertStoresExist(prepared.map((p) => p.data.storeId)))) {
    return { error: "One of the chosen stores no longer exists." };
  }

  await prisma.$transaction(async (tx) => {
    for (const p of prepared) {
      const created = await tx.instoreRedemption.create({
        data: { couponId, enteredBy: userId, ...p.data, itemsText: p.itemsText },
      });
      if (p.products.length > 0) {
        await tx.redemptionLineItem.createMany({
          data: p.products.map((prod) => ({
            channel: "instore" as const,
            instoreRedemptionId: created.id,
            productName: prod.name,
            sku: prod.sku,
            quantity: prod.quantity,
            lineValue: null,
          })),
        });
      }
      await tx.auditLog.create({
        data: {
          userId,
          entity: "instore_redemption",
          entityId: created.id,
          action: "create",
          after: snapshot(created),
        },
      });
    }
  });

  revalidatePath(`/coupons/${code}`);
  return { ok: true };
}

export async function updateInstoreRow(
  id: string,
  code: string,
  input: ScalarRow & { itemsText?: string },
): Promise<ActionState> {
  const session = await assertAdmin();
  const userId = session.user.id;

  const existing = await prisma.instoreRedemption.findUnique({ where: { id } });
  if (!existing) return { error: "That row no longer exists." };

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const result = validateRow(input, today);
  if ("error" in result) {
    const msg = result.error.charAt(0).toUpperCase() + result.error.slice(1);
    return { error: msg };
  }
  if (!(await assertStoresExist([result.data.storeId]))) {
    return { error: "That store no longer exists." };
  }

  const itemsText = (input.itemsText ?? "").trim() || null;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.instoreRedemption.update({
      where: { id },
      data: { ...result.data, itemsText },
    });
    await tx.auditLog.create({
      data: {
        userId,
        entity: "instore_redemption",
        entityId: id,
        action: "update",
        before: snapshot(existing),
        after: snapshot(updated),
      },
    });
  });

  revalidatePath(`/coupons/${code}`);
  return { ok: true };
}

export async function deleteInstoreRow(
  id: string,
  code: string,
): Promise<ActionState> {
  const session = await assertAdmin();
  const userId = session.user.id;

  const existing = await prisma.instoreRedemption.findUnique({ where: { id } });
  if (!existing) return { ok: true };

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        userId,
        entity: "instore_redemption",
        entityId: id,
        action: "delete",
        before: snapshot(existing),
      },
    });
    // Remove structured line items first (their check constraint forbids orphans).
    await tx.redemptionLineItem.deleteMany({ where: { instoreRedemptionId: id } });
    await tx.instoreRedemption.delete({ where: { id } });
  });

  revalidatePath(`/coupons/${code}`);
  return { ok: true };
}
