import type { NextAuthConfig } from "next-auth";
import type { UserRole } from "@prisma/client";

// Edge-safe Auth.js configuration shared by the middleware and the full server
// config. It deliberately contains NO database or bcrypt access, because the
// middleware runs on the edge runtime. The Credentials provider (which needs
// Prisma) is added only in auth.ts.

// Pages that never require a session.
const PUBLIC_PAGES = ["/login", "/setup"];
// API routes that never require a session (they do their own auth).
// /api/import/sync authenticates the scheduled caller by a shared secret.
const PUBLIC_API = ["/api/setup", "/api/health", "/api/import/sync"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export const authConfig = {
  trustHost: true, // required behind Railway's proxy
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [], // real provider added in auth.ts
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = nextUrl;

      // Auth.js own endpoints and public APIs are always allowed.
      if (pathname.startsWith("/api/auth") || matches(pathname, PUBLIC_API)) {
        return true;
      }

      // Login and setup pages are public. A signed-in user hitting /login is
      // bounced to the dashboard.
      if (matches(pathname, PUBLIC_PAGES)) {
        if (isLoggedIn && pathname.startsWith("/login")) {
          return Response.redirect(new URL("/", nextUrl));
        }
        return true;
      }

      // Everything else requires a session. Returning false redirects to the
      // configured signIn page.
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as UserRole | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
