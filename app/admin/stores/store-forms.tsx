"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStore, createAlias } from "./actions";

type StoreOption = { id: string; name: string };

export function AddStoreForm() {
  const [state, action, pending] = useActionState(createStore, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="inline-form">
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor="store-name">Store name</label>
        <input id="store-name" name="name" type="text" required />
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor="store-shortcode">Short code (optional)</label>
        <input id="store-shortcode" name="shortCode" type="text" />
      </div>
      <button className="btn-primary" style={{ width: "auto" }} disabled={pending}>
        {pending ? "Adding..." : "Add store"}
      </button>
      {state.error && (
        <p className="form-error" style={{ width: "100%", margin: "0.5rem 0 0" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}

export function AddAliasForm({ stores }: { stores: StoreOption[] }) {
  const [state, action, pending] = useActionState(createAlias, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="inline-form">
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor="alias-store">Maps to store</label>
        <select id="alias-store" name="storeId" required>
          <option value="">Choose a store...</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor="alias-source">Text as received</label>
        <input
          id="alias-source"
          name="sourceValue"
          type="text"
          placeholder="e.g. Sheffield Store"
          required
        />
      </div>
      <button className="btn-primary" style={{ width: "auto" }} disabled={pending}>
        {pending ? "Adding..." : "Add alias"}
      </button>
      {state.error && (
        <p className="form-error" style={{ width: "100%", margin: "0.5rem 0 0" }}>
          {state.error}
        </p>
      )}
    </form>
  );
}
