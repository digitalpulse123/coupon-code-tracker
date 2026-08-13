"use client";

import { useActionState, useState } from "react";
import { createCoupon } from "../actions";
import { OFFER_TYPE_OPTIONS, COUPON_TYPE_OPTIONS } from "@/lib/coupon-format";

export default function CouponForm() {
  const [state, action, pending] = useActionState(createCoupon, {});
  const [offerType, setOfferType] = useState<string>("percentage");

  const showOfferValue =
    offerType === "percentage" ||
    offerType === "fixed" ||
    offerType === "threshold";
  const offerValueLabel =
    offerType === "percentage" ? "Percentage (%)" : "Amount off (£)";

  return (
    <form action={action} style={{ maxWidth: "34rem" }}>
      {state.error && <p className="form-error">{state.error}</p>}

      <div className="field">
        <label htmlFor="code">Coupon code</label>
        <input id="code" name="code" type="text" required autoComplete="off" />
        <p className="form-hint">Stored in capitals, for example FREEGIFT.</p>
      </div>

      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required />
        <p className="form-hint">Plain description shown in reports.</p>
      </div>

      <div className="field">
        <label htmlFor="type">Type</label>
        <select id="type" name="type" defaultValue="daily">
          {COUPON_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="campaign">Campaign (optional)</label>
        <input id="campaign" name="campaign" type="text" />
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: "0 0 1rem" }}>
        <label>Channels</label>
        <label className="check">
          <input type="checkbox" name="validOnline" defaultChecked /> Valid online
        </label>
        <label className="check">
          <input type="checkbox" name="validInstore" /> Valid in store
        </label>
        <p className="form-hint">At least one must be ticked.</p>
      </fieldset>

      <div className="field">
        <label htmlFor="offerType">Offer type</label>
        <select
          id="offerType"
          name="offerType"
          value={offerType}
          onChange={(e) => setOfferType(e.target.value)}
        >
          {OFFER_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {showOfferValue && (
        <div className="field">
          <label htmlFor="offerValue">{offerValueLabel}</label>
          <input
            id="offerValue"
            name="offerValue"
            type="number"
            step="0.01"
            min="0"
          />
        </div>
      )}

      {offerType === "free_gift" && (
        <div className="field">
          <label htmlFor="giftSku">Gift SKU</label>
          <input id="giftSku" name="giftSku" type="text" />
        </div>
      )}

      <div className="field">
        <label htmlFor="minSpend">Minimum spend (£, optional)</label>
        <input id="minSpend" name="minSpend" type="number" step="0.01" min="0" />
        <p className="form-hint">
          Required for a threshold offer. Also use it for a free gift over a
          spend, for example a gift over £40.
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="startsOn">Starts on (optional)</label>
          <input id="startsOn" name="startsOn" type="date" />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="endsOn">Ends on (optional)</label>
          <input id="endsOn" name="endsOn" type="date" />
          <p className="form-hint">Leave blank for an ongoing code.</p>
        </div>
      </div>

      <label className="check" style={{ marginBottom: "1.25rem" }}>
        <input type="checkbox" name="isActive" defaultChecked /> Active
      </label>

      <button className="btn-primary" style={{ width: "auto" }} disabled={pending}>
        {pending ? "Saving..." : "Create coupon"}
      </button>
    </form>
  );
}
