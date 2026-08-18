"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveInstoreBatch } from "./actions";
import { ProductPicker, type SelectedProduct } from "./product-picker";
import type { InstoreRowInput } from "./types";

type Store = { id: string; name: string };

type RowState = {
  storeId: string;
  transactionTotal: string;
  receiptRef: string;
  products: SelectedProduct[];
};

const emptyRow = (): RowState => ({
  storeId: "",
  transactionTotal: "",
  receiptRef: "",
  products: [],
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
  const [batchDate, setBatchDate] = useState("");
  const [rows, setRows] = useState<RowState[]>([emptyRow()]);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof RowState>(i: number, field: K, value: RowState[K]) {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setRows((rs) => [...rs, emptyRow()]);
  }

  function removeRow(i: number) {
    setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, idx) => idx !== i)));
  }

  function save() {
    setError("");
    const payload: InstoreRowInput[] = rows.map((r) => ({
      redeemedOn: batchDate,
      storeId: r.storeId,
      transactionTotal: r.transactionTotal,
      discountAmount: "",
      receiptRef: r.receiptRef,
      products: r.products,
    }));
    startTransition(async () => {
      const res = await saveInstoreBatch(couponId, code, payload);
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

      <div className="field" style={{ maxWidth: "18rem", marginBottom: "1.1rem" }}>
        <label htmlFor="batch-date">Date used</label>
        <input
          id="batch-date"
          type="date"
          value={batchDate}
          onChange={(e) => setBatchDate(e.target.value)}
        />
        <p className="form-hint">
          Applies to every redemption below. Pick any day in the week it was used.
          Leave blank to use today.
        </p>
      </div>

      {rows.map((row, i) => (
        <div className="entry-card" key={i}>
          <div className="entry-card-head">
            <span className="entry-card-n">Redemption {i + 1}</span>
            {rows.length > 1 && (
              <button type="button" className="btn-link" onClick={() => removeRow(i)}>
                Remove
              </button>
            )}
          </div>
          <div className="entry-grid">
            <div className="field" style={{ margin: 0 }}>
              <label>Store</label>
              <select value={row.storeId} onChange={(e) => update(i, "storeId", e.target.value)}>
                <option value="">Choose...</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Total (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={row.transactionTotal}
                onChange={(e) => update(i, "transactionTotal", e.target.value)}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Receipt ref (optional)</label>
              <input
                type="text"
                value={row.receiptRef}
                onChange={(e) => update(i, "receiptRef", e.target.value)}
              />
            </div>
          </div>
          <div className="field" style={{ margin: "0.9rem 0 0" }}>
            <label>Products purchased</label>
            <ProductPicker
              value={row.products}
              onChange={(next) => update(i, "products", next)}
            />
          </div>
        </div>
      ))}

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <button type="button" className="btn-link" onClick={addRow}>
          ＋ Add another redemption
        </button>
        <button
          type="button"
          className="btn-teal"
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
