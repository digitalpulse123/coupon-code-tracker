import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { metorikConfigured } from "@/lib/metorik";
import { formatDateGB } from "@/lib/format";
import { SyncButton } from "./sync-button";

export const dynamic = "force-dynamic";

function statusBadge(status: string) {
  if (status === "success") return <span className="badge badge-on">Success</span>;
  if (status === "failed") return <span className="badge badge-off">Failed</span>;
  return <span className="badge badge-off">Partial</span>;
}

export default async function ImportsPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const batches = await prisma.importBatch.findMany({
    orderBy: { runAt: "desc" },
    take: 25,
    include: { runByUser: { select: { name: true, email: true } } },
  });

  return (
    <main className="container">
      <p className="auth-eyebrow">
        <Link href="/">Dashboard</Link> / Admin
      </p>
      <h1 style={{ fontSize: "1.6rem", margin: "0 0 0.5rem" }}>Imports</h1>
      <p style={{ color: "var(--muted)", margin: "0 0 1.5rem" }}>
        Pull online redemptions from Metorik. Orders are matched to codes by their
        promotion. Re-running is safe — it updates rather than duplicates.
      </p>

      {!metorikConfigured() && (
        <p className="form-error">The Metorik API key is not set, so syncing is disabled.</p>
      )}

      <div style={{ marginBottom: "2.5rem" }}>
        <SyncButton />
      </div>

      <h2 style={{ fontSize: "1.1rem" }}>History</h2>
      {batches.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>No imports yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="data">
            <thead>
              <tr>
                <th>Run at</th>
                <th>Source</th>
                <th>Read</th>
                <th>Created</th>
                <th>Updated</th>
                <th>Skipped</th>
                <th>Status</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id}>
                  <td>{formatDateGB(b.runAt)}</td>
                  <td>{b.source === "metorik_api" ? "Metorik API" : "CSV"}</td>
                  <td>{b.rowsRead}</td>
                  <td>{b.rowsCreated}</td>
                  <td>{b.rowsUpdated}</td>
                  <td>{b.rowsSkipped}</td>
                  <td>
                    {statusBadge(b.status)}
                    {b.errorDetail ? (
                      <span style={{ display: "block", fontSize: "0.75rem", color: "var(--muted)" }}>
                        {b.errorDetail}
                      </span>
                    ) : null}
                  </td>
                  <td>{b.runByUser?.name ?? b.runByUser?.email ?? "Scheduled"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
