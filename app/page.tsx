import { auth } from "@/auth";
import SignOutButton from "@/components/sign-out-button";

export default async function Home() {
  const session = await auth();
  const user = session?.user;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: "38rem", width: "100%" }}>
        <p
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "0.75rem",
            fontWeight: 600,
            color: "var(--muted)",
            margin: "0 0 0.5rem",
          }}
        >
          Pulse &amp; Cocktails
        </p>
        <h1 style={{ fontSize: "2rem", margin: "0 0 0.75rem" }}>
          Coupon Code Tracker
        </h1>
        <p style={{ color: "var(--muted)", margin: "0 0 1.5rem" }}>
          Redemption tracking across{" "}
          <span className="channel-online" style={{ fontWeight: 600 }}>
            online
          </span>{" "}
          and{" "}
          <span className="channel-instore" style={{ fontWeight: 600 }}>
            in store
          </span>
          . Phase 1 build in progress.
        </p>

        {user && (
          <p
            style={{
              fontSize: "0.9rem",
              margin: "0 0 1.5rem",
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span>
              Signed in as <strong>{user.email}</strong>
              {user.role ? ` (${user.role})` : ""}
            </span>
            <SignOutButton />
          </p>
        )}

        <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: 0 }}>
          Service health at <a href="/api/health">/api/health</a>.
        </p>
      </div>
    </main>
  );
}
