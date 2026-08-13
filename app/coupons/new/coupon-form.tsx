"use client";

import { useActionState, useState } from "react";
import { OFFER_TYPE_OPTIONS, COUPON_TYPE_OPTIONS } from "@/lib/coupon-format";

type ActionState = { error?: string };

export type CouponInitial = {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  campaign?: string;
  validOnline?: boolean;
  validInstore?: boolean;
  offerType?: string;
  offerValue?: string;
  minSpend?: string;
  giftSku?: string;
  startsOn?: string;
  endsOn?: string;
  isActive?: boolean;
};

export default function CouponForm({
  action,
  initial,
  submitLabel = "Create coupon",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: CouponInitial;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [offerType, setOfferType] = useState<string>(
    initial?.offerType ?? (initial ? "" : "percentage"),
  );

  const showOfferValue =
    offerType === "percentage" ||
    offerType === "fixed" ||
    offerType === "threshold";
  const offerValueLabel =
    offerType === "percentage" ? "Percentage (%)" : "Amount off (£)";

  const channelOnline = initial ? initial.validOnline : true;
  const channelInstore = initial ? initial.validInstore : false;
  const active = initial ? initial.isActive : true;

  return (
    <form action={formAction} style={{ maxWidth: "34rem" }}>
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {state.error && <p className="form-error">{state.error}</p>}

      <div className="field">
        <label htmlFor="code">Coupon code</label>
        <input
          id="code"
          name="code"
          type="text"
          required
          autoComplete="off"
          defaultValue={initial?.code ?? ""}
        />
        <p className="form-hint">
          The actual code, stored in capitals. This is separate from the name below.
        </p>
      </div>

      <div className="field">
        <label htmlFor="name">Name</label>
        <input id="name" name="name" type="text" required defaultValue={initial?.name ?? ""} />
        <p className="form-hint">Plain description shown in reports.</p>
      </div>

      <div className="field">
        <label htmlFor="type">Type</label>
        <select id="type" name="type" defaultValue={initial?.type ?? "daily"}>
          <option value="">Not set</option>
          {COUPON_TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label htmlFor="campaign">Campaign (optional)</label>
        <input id="campaign" name="campaign" type="text" defaultValue={initial?.campaign ?? ""} />
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: "0 0 1rem" }}>
        <label>Channels</label>
        <label className="check">
          <input type="checkbox" name="validOnline" defaultChecked={channelOnline} /> Valid online
        </label>
        <label className="check">
          <input type="checkbox" name="validInstore" defaultChecked={channelInstore} /> Valid in store
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
          <option value="">Not set</option>
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
            defaultValue={initial?.offerValue ?? ""}
          />
        </div>
      )}

      {offerType === "free_gift" && (
        <div className="field">
          <label htmlFor="giftSku">Gift SKU</label>
          <input id="giftSku" name="giftSku" type="text" defaultValue={initial?.giftSku ?? ""} />
        </div>
      )}

      <div className="field">
        <label htmlFor="minSpend">Minimum spend (£, optional)</label>
        <input
          id="minSpend"
          name="minSpend"
          type="number"
          step="0.01"
          min="0"
          defaultValue={initial?.minSpend ?? ""}
        />
        <p className="form-hint">
          Required for a threshold offer. Also use it for a free gift over a
          spend, for example a gift over £40.
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="startsOn">Starts on (optional)</label>
          <input id="startsOn" name="startsOn" type="date" defaultValue={initial?.startsOn ?? ""} />
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="endsOn">Ends on (optional)</label>
          <input id="endsOn" name="endsOn" type="date" defaultValue={initial?.endsOn ?? ""} />
          <p className="form-hint">Leave blank for an ongoing code.</p>
        </div>
      </div>

      <label className="check" style={{ marginBottom: "1.25rem" }}>
        <input type="checkbox" name="isActive" defaultChecked={active} /> Active
      </label>

      <button className="btn-primary" style={{ width: "auto" }} disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
