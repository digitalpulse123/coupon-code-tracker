"use client";

import { useActionState, useEffect, useRef } from "react";
import { createUser } from "./actions";

export function AddUserForm() {
  const [state, action, pending] = useActionState(createUser, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="inline-form">
      {state.error && (
        <p className="form-error" style={{ width: "100%", margin: "0 0 0.5rem" }}>
          {state.error}
        </p>
      )}
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor="u-name">Name</label>
        <input id="u-name" name="name" type="text" autoComplete="off" />
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor="u-email">Email</label>
        <input id="u-email" name="email" type="email" required autoComplete="off" />
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor="u-password">Temporary password</label>
        <input id="u-password" name="password" type="text" required autoComplete="off" />
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label htmlFor="u-role">Role</label>
        <select id="u-role" name="role" defaultValue="viewer">
          <option value="viewer">Viewer (read only)</option>
          <option value="admin">Admin (full access)</option>
        </select>
      </div>
      <button className="btn-primary" style={{ width: "auto" }} disabled={pending}>
        {pending ? "Adding..." : "Add user"}
      </button>
    </form>
  );
}
