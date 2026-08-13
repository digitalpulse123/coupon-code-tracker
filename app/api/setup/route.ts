import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Creates the first admin account. Only works while no users exist, so it
// cannot be used to add accounts once the app is set up.
export async function POST(request: Request) {
  const userCount = await prisma.appUser.count();
  if (userCount > 0) {
    return NextResponse.json(
      { error: "Setup has already been completed." },
      { status: 403 },
    );
  }

  let body: { name?: string; email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim() || null;
  const email = body.email?.trim().toLowerCase() || "";
  const password = body.password || "";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 },
    );
  }

  await prisma.appUser.create({
    data: {
      name,
      email,
      passwordHash: hashPassword(password),
      role: "admin",
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
