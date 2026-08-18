import { redirect } from "next/navigation";

import AppShell from "@/components/app-shell";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AddUserForm } from "./user-form";
import { setUserActive } from "./actions";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const users = await prisma.appUser.findMany({
    orderBy: [{ isActive: "desc" }, { email: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  return (
    <AppShell
      active="users"
      title="Users"
      subtitle="Who can sign in, and what they can do"
    >
      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">People</div>
          <div className="panel-note">{users.length} users</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th style={{ width: 90 }}>Role</th>
              <th style={{ width: 90 }}>Status</th>
              <th className="ta-r" style={{ width: 130 }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name ?? "—"}</td>
                <td className="num">{u.email}</td>
                <td>
                  <span className="tag tag-daily">
                    {u.role === "admin" ? "Admin" : "Viewer"}
                  </span>
                </td>
                <td>
                  {u.isActive ? (
                    <span className="badge badge-on">Active</span>
                  ) : (
                    <span className="badge badge-off">Disabled</span>
                  )}
                </td>
                <td className="ta-r">
                  {u.id === session.user.id ? (
                    <span className="sub">You</span>
                  ) : (
                    <form action={setUserActive} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={u.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={u.isActive ? "false" : "true"}
                      />
                      <button className="btn-link">
                        {u.isActive ? "Disable" : "Enable"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="panel-head">
          <div className="panel-title">Add a user</div>
        </div>
        <div className="panel-body">
          <AddUserForm />
          <p className="sub" style={{ marginTop: 12 }}>
            Set a temporary password and share it with them, along with the app link.
            They can sign in straight away. Disable a user to revoke access.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
