import Link from "next/link";
import type { ReactNode } from "react";

import { auth } from "@/auth";
import SignOutButton from "./sign-out-button";

type NavItem = { key: string; label: string; href: string; icon: string };

const REPORTING: NavItem[] = [
  { key: "dash", label: "Dashboard", href: "/", icon: "◧" },
  { key: "coupons", label: "Coupons", href: "/coupons", icon: "◈" },
];

const SETUP: NavItem[] = [
  { key: "new", label: "Create a coupon", href: "/coupons/new", icon: "＋" },
  { key: "imports", label: "Imports", href: "/admin/imports", icon: "↻" },
  { key: "promotions", label: "Promotions", href: "/admin/promotions", icon: "◆" },
  { key: "stores", label: "Stores", href: "/admin/stores", icon: "⌂" },
];

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      className="nav-item"
      aria-current={active ? "page" : undefined}
    >
      <span className="nav-ico">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export default async function AppShell({
  active,
  title,
  subtitle,
  actions,
  children,
}: {
  active: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const session = await auth();
  const user = session?.user;
  const isAdmin = user?.role === "admin";

  return (
    <div className="app">
      <aside className="side">
        <div className="brand">
          <span className="brand-mark">
            Pulse <em>&amp;</em> Cocktails
          </span>
          <div className="brand-sub">Coupon Tracker</div>
        </div>
        <nav className="nav">
          <div className="nav-label">Reporting</div>
          {REPORTING.map((item) => (
            <NavLink key={item.key} item={item} active={active === item.key} />
          ))}
          {isAdmin && (
            <>
              <div className="nav-label">Setup</div>
              {SETUP.map((item) => (
                <NavLink key={item.key} item={item} active={active === item.key} />
              ))}
            </>
          )}
        </nav>
        <div className="side-foot">
          <strong>{user?.name ?? user?.email ?? "Signed in"}</strong>
          {isAdmin ? "Administrator" : "Viewer"}
          <div>
            <SignOutButton />
          </div>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <div className="page-title">{title}</div>
            {subtitle && <div className="page-note">{subtitle}</div>}
          </div>
          {actions && <div className="topbar-right">{actions}</div>}
        </div>
        <div className="content">{children}</div>
      </main>
    </div>
  );
}
