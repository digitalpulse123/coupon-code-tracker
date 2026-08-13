"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_STORE_NAMES } from "@/lib/default-stores";

type ActionState = { error?: string; ok?: boolean };

async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    throw new Error("Not authorised");
  }
}

function isUniqueError(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

export async function createStore(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const shortCode = String(formData.get("shortCode") ?? "").trim() || null;

  if (!name) return { error: "Store name is required." };

  try {
    await prisma.store.create({ data: { name, shortCode } });
  } catch (e) {
    if (isUniqueError(e)) {
      return { error: "A store with that name or short code already exists." };
    }
    throw e;
  }

  revalidatePath("/admin/stores");
  return { ok: true };
}

export async function createAlias(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const storeId = String(formData.get("storeId") ?? "");
  const sourceValue = String(formData.get("sourceValue") ?? "").trim();

  if (!storeId) return { error: "Choose a store." };
  if (!sourceValue) {
    return { error: "Enter the store text exactly as it appears in the data." };
  }

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { error: "That store no longer exists." };

  try {
    await prisma.storeAlias.create({ data: { storeId, sourceValue } });
  } catch (e) {
    if (isUniqueError(e)) {
      return { error: "That exact text is already mapped to a store." };
    }
    throw e;
  }

  revalidatePath("/admin/stores");
  return { ok: true };
}

export async function setStoreActive(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!id) return;

  await prisma.store.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/stores");
}

export async function deleteAlias(formData: FormData): Promise<void> {
  await assertAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.storeAlias.delete({ where: { id } });
  revalidatePath("/admin/stores");
}

export async function seedDefaultStores(): Promise<void> {
  await assertAdmin();

  await prisma.store.createMany({
    data: DEFAULT_STORE_NAMES.map((name) => ({ name })),
    skipDuplicates: true,
  });
  revalidatePath("/admin/stores");
}
