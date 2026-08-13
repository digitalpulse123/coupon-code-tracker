import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// Edge middleware built from the database-free config. It enforces the
// authorized() callback on every matched request.
export const { auth: middleware } = NextAuth(authConfig);

export default middleware;

export const config = {
  // Run on everything except Next internals and static files. API routes are
  // included so the authorized() callback can guard them.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
