"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateInstoreRow, deleteInstoreRow } from "./actions";
import { formatMoneyGB } from "@/lib/format";

type Store = { id: string; name: string };

export type InstoreRowData = {
  id: string;
  redeemedOnDisplay: string;
  redeemedOnISO: string;
  storeId: string;
  storeName: string;
  transactionTotal: number;
  discountAmount: number | null;
  receiptRef: string | null;
  itemsText: string | null;
};

export function InstoreRow({
  row,
  stores,
  code,
  canEdit,
}: {
  row: InstoreRowData;
  stores: Store[];
  code: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const [redeemedOn, setRedeemedOn] = useState(row.redeemedOnISO);
  const [storeId, setStoreId] = useState(row.storeId);
  const [total, setTotal] = useState(String(row.transactionTotal));
  const [discount, setDiscount] = useState(
    row.discountAmount === null ? "" : String(row.discountAmount),
  );
  const [itemsText, setItemsText] = useState(row.itemsText ?? "");
  const [receiptRef, setReceiptRef] = useState(row.receiptRef ?? "");

  function save() {
    setError("");
    startTransition(async () => {
      const res = await updateInstoreRow(row.id, code, {
        redeemedOn,
        storeId,
        transactionTotal: total,
        discountAmount: discount,
        receiptRef,
        itemsText,
      });
      if (res?.error) {
        setError(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  function cancel() {
    setRedeemedOn(row.redeemedOnISO);
    setStoreId(row.storeId);
    setTotal(String(row.transactionTotal));
    setDiscount(row.discountAmount === null ? "" : String(row.discountAmount));
    setItemsText(row.itemsText ?? "");
    setReceiptRef(row.receiptRef ?? "");
    setError("");
    setEditing(false);
  }

  function remove() {
    if (!window.confirm("Delete this in-store row? This is recorded in the audit log.")) {
      return;
    }
    startTransition(async () => {
      await deleteInstoreRow(row.id, code);
      router.refresh();
    });
  }

  if (!editing) {
    return (
      <tr>
        <td>{row.redeemedOnDisplay}</td>
        <td>{row.storeName}</td>
        <td>{row.itemsText ?? "—"}</td>
        <td>{formatMoneyGB(row.transactionTotal)}</td>
        <td>{row.discountAmount === null ? "—" : formatMoneyGB(row.discountAmount)}</td>
        {canEdit && (
          <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
            <button className="btn-link" onClick={() => setEditing(true)}>
              Edit
            </button>{" "}
            <button className="btn-link" onClick={remove} disabled={isPending}>
              Delete
            </button>
          </td>
        )}
      </tr>
    );
  }

  return (
    <tr>
      <td>
        <input
          type="date"
          value={redeemedOn}
          onChange={(e) => setRedeemedOn(e.target.value)}
        />
      </td>
      <td>
        <select value={storeId} onChange={(e) => setStoreId(e.target.value)}>
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
          value={itemsText}
          onChange={(e) => setItemsText(e.target.value)}
        />
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          min="0"
          value={total}
          onChange={(e) => setTotal(e.target.value)}
        />
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          min="0"
          value={discount}
          onChange={(e) => setDiscount(e.target.value)}
        />
      </td>
      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
        <button className="btn-link" onClick={save} disabled={isPending}>
          Save
        </button>{" "}
        <button className="btn-link" onClick={cancel} disabled={isPending}>
          Cancel
        </button>
        {error && (
          <div className="form-error" style={{ marginTop: "0.35rem" }}>
            {error}
          </div>
        )}
      </td>
    </tr>
  );
}
