"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { scanMetorikPromotions } from "./actions";

export function ScanButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function scan() {
    setMessage("");
    startTransition(async () => {
      const res = await scanMetorikPromotions();
      if (res?.error) {
        setMessage(res.error);
        return;
      }
      setMessage(
        `Scanned ${res?.scanned ?? 0} recent orders, found ${res?.found ?? 0} promotion${
          res?.found === 1 ? "" : "s"
        }.`,
      );
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
      <button
        type="button"
        className="btn-primary"
        style={{ width: "auto" }}
        onClick={scan}
        disabled={isPending}
      >
        {isPending ? "Scanning Metorik..." : "Scan Metorik for promotions"}
      </button>
      {message && (
        <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>{message}</span>
      )}
    </div>
  );
}
