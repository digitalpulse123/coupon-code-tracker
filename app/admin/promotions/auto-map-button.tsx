"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { autoMapFromMetorik } from "./actions";

export function AutoMapButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function run() {
    setMessage("");
    startTransition(async () => {
      const res = await autoMapFromMetorik();
      if (res.error) {
        setMessage(res.error);
        return;
      }
      setMessage(
        res.mapped
          ? `Mapped ${res.mapped} code${res.mapped === 1 ? "" : "s"}: ${res.details?.join(", ")}`
          : `Checked ${res.checked} codes — none matched a Metorik gate coupon.`,
      );
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
      <button
        type="button"
        className="btn-teal"
        style={{ width: "auto" }}
        onClick={run}
        disabled={isPending}
      >
        {isPending ? "Matching codes..." : "Auto-map codes from Metorik"}
      </button>
      {message && (
        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{message}</span>
      )}
    </div>
  );
}
