"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncNow } from "./actions";

export function SyncButton() {
  const router = useRouter();
  const [days, setDays] = useState("3");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function run() {
    setMessage("");
    startTransition(async () => {
      const res = await syncNow(Number(days));
      if (res.error) {
        setMessage(res.error);
        return;
      }
      const unknown =
        res.unknownPromotions && res.unknownPromotions.length > 0
          ? ` ${res.unknownPromotions.length} unassigned promotion(s) found — map them on the Promotions page.`
          : "";
      setMessage(
        `Read ${res.rowsRead}, created ${res.rowsCreated}, updated ${res.rowsUpdated}, skipped ${res.rowsSkipped}.${unknown}`,
      );
      router.refresh();
    });
  }

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="field" style={{ margin: 0, width: "8rem" }}>
          <label htmlFor="days">Days to sync</label>
          <input
            id="days"
            type="number"
            min="1"
            max="90"
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn-primary"
          style={{ width: "auto" }}
          onClick={run}
          disabled={isPending}
        >
          {isPending ? "Syncing from Metorik..." : "Sync now"}
        </button>
      </div>
      {message && (
        <p style={{ fontSize: "0.85rem", color: "var(--muted)", marginTop: "0.75rem" }}>
          {message}
        </p>
      )}
    </div>
  );
}
