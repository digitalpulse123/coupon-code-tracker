export default function Home() {
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
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", margin: 0 }}>
          Deployment skeleton reachable. Service health at{" "}
          <a href="/api/health">/api/health</a>.
        </p>
      </div>
    </main>
  );
}
