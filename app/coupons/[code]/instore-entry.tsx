"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveInstoreBatch } from "./actions";
import type { InstoreRowInput } from "./types";

type Store = { id: string; name: string };

const emptyRow = (): InstoreRowInput => ({
  redeemedOn: "",
  storeId: "",
  transactionTotal: "",
  discountAmount: "",
  receiptRef: "",
  itemsText: "",
});

export function InstoreEntry({
  couponId,
  code,
  stores,
}: {
  couponId: string;
  code: string;
  stores: Store[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState<InstoreRowInput[]>([emptyRow()]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function update(index: number, field: keyof InstoreRowInput, value: string) {
    setRows((rs) => rs.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, emptyRow()]);
  }

  function removeRow(index: number) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, i) => i !== index)));
  }

  function save() {
    setError("");
    startTransition(async () => {
      const res = await saveInstoreBatch(couponId, code, rows);
      if (res?.error) {
        setError(res.error);
        return;
      }
      setRows([emptyRow()]);
      router.refresh();
    });
  }

  return (
    <div>
      {error && <p className="form-error">{error}</p>}

      <div style={{ overflowX: "auto" }}>
        <table className="data">
          <thead>
            <tr>
              <th>Date</th>
              <th>Store</th>
              <th>Products (optional)</th>
              <th>Total (£)</th>
              <th>Discount (£)</th>
              <th>Receipt ref (optional)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>
                  <input
                    type="date"
                    value={row.redeemedOn}
                    onChange={(e) => update(i, "redeemedOn", e.target.value)}
                  />
                </td>
                <td>
                  <select
                    value={row.storeId}
                    onChange={(e) => update(i, "storeId", e.target.value)}
                  >
                    <option value="">Choose...</option>
                    {stores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    type="text"
                    value={row.itemsText}
                    onChange={(e) => update(i, "itemsText", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.transactionTotal}
                    onChange={(e) => update(i, "transactionTotal", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={row.discountAmount}
                    onChange={(e) => update(i, "discountAmount", e.target.value)}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.receiptRef}
                    onChange={(e) => update(i, "receiptRef", e.target.value)}
                  />
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    className="btn-link"
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <button type="button" className="btn-link" onClick={addRow}>
          Add another row
        </button>
        <button
          type="button"
          className="btn-primary"
          style={{ width: "auto" }}
          onClick={save}
          disabled={isPending}
        >
          {isPending ? "Saving..." : "Save batch"}
        </button>
      </div>
    </div>
  );
}
