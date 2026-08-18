"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

type ActionState = { error?: string; ok?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function assertAdmin() {
  const session = await auth();
  if (session?.user?.role !== "admin") throw new Error("Not authorised");
  return session;
}

export async function createUser(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await assertAdmin();

  const name = String(formData.get("name") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "viewer");

  if (!EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (role !== "admin" && role !== "viewer") {
    return { error: "Choose a role." };
  }

  try {
    await prisma.appUser.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role,
        isActive: true,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "A user with that email already exists." };
    }
    throw e;
  }

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserActive(formData: FormData): Promise<void> {
  const session = await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!id || id === session.user.id) return; // never lock yourself out

  await prisma.appUser.update({ where: { id }, data: { isActive } });
  revalidatePath("/admin/users");
}
