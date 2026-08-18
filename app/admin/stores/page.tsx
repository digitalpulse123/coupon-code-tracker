import Link from "next/link";
import { redirect } from "next/navigation";

import AppShell from "@/components/app-shell";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AddStoreForm, AddAliasForm } from "./store-forms";
import { setStoreActive, deleteAlias, seedDefaultStores } from "./actions";

export const dynamic = "force-dynamic";

export default async function StoresPage() {
  const session = await auth();
  if (session?.user?.role !== "admin") redirect("/");

  const [stores, aliases] = await Promise.all([
    prisma.store.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { aliases: true } } },
    }),
    prisma.storeAlias.findMany({
      orderBy: { sourceValue: "asc" },
      include: { store: true },
    }),
  ]);

  return (
    <AppShell
      active="stores"
      title="Stores"
      subtitle="The canonical store list and the alternative spellings that arrive in online data"
    >
      <section style={{ marginBottom: "2.5rem" }}>
        <h2 style={{ fontSize: "1.1rem" }}>Store list</h2>

        {stores.length === 0 ? (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "1.5rem",
              marginBottom: "1.5rem",
            }}
          >
            <p style={{ marginTop: 0 }}>
              No stores yet. Add the 17 Pulse &amp; Cocktails stores in one go,
              then adjust as needed.
            </p>
            <form action={seedDefaultStores}>
              <button className="btn-primary" style={{ width: "auto" }}>
                Add the 17 stores
              </button>
            </form>
          </div>
        ) : (
          <table className="data" style={{ marginBottom: "1.5rem" }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Short code</th>
                <th>Aliases</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id}>
                  <td>{store.name}</td>
                  <td>{store.shortCode ?? "—"}</td>
                  <td>{store._count.aliases}</td>
                  <td>
                    {store.isActive ? (
                      <span className="badge badge-on">Active</span>
                    ) : (
                      <span className="badge badge-off">Inactive</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <form action={setStoreActive}>
                      <input type="hidden" name="id" value={store.id} />
                      <input
                        type="hidden"
                        name="isActive"
                        value={store.isActive ? "false" : "true"}
                      />
                      <button className="btn-link">
                        {store.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
          Add a store
        </h3>
        <AddStoreForm />
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem" }}>Aliases</h2>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Map a store string exactly as it appears in an export to one of the
          stores above.
        </p>

        {stores.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Add stores first.</p>
        ) : (
          <>
            {aliases.length > 0 && (
              <table className="data" style={{ marginBottom: "1.5rem" }}>
                <thead>
                  <tr>
                    <th>Text as received</th>
                    <th>Maps to</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {aliases.map((alias) => (
                    <tr key={alias.id}>
                      <td>{alias.sourceValue}</td>
                      <td>{alias.store.name}</td>
                      <td style={{ textAlign: "right" }}>
                        <form action={deleteAlias}>
                          <input type="hidden" name="id" value={alias.id} />
                          <button className="btn-link">Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3 style={{ fontSize: "0.95rem", marginBottom: "0.5rem" }}>
              Add an alias
            </h3>
            <AddAliasForm
              stores={stores.map((s) => ({ id: s.id, name: s.name }))}
            />
          </>
        )}
      </section>
    </AppShell>
  );
}
