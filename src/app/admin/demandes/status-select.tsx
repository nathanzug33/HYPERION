"use client";

import { useRef } from "react";
import { CONTACT_REQUEST_STATUS_LABELS } from "@/lib/constants";
import { updateContactRequestStatus, updateDemandeBesoinStatus } from "./actions";

export default function StatusSelect({
  id,
  status,
  kind = "profil",
}: {
  id: string;
  status: string;
  kind?: "profil" | "besoin";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = kind === "besoin" ? updateDemandeBesoinStatus : updateContactRequestStatus;
  return (
    <form ref={formRef} action={action}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
      >
        {Object.entries(CONTACT_REQUEST_STATUS_LABELS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
    </form>
  );
}
