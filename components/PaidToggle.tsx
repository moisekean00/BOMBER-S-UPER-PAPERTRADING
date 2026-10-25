"use client";
import { useState } from "react";

export function PaidToggle({ userId, paid }: { userId: string; paid: boolean }) {
  const [value, setValue] = useState(paid);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    const r = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, paid: !value }) });
    setBusy(false);
    if (r.ok) setValue(!value);
  }
  return (
    <button className={`btn small ${value ? "" : "ghost"}`} onClick={toggle} disabled={busy}>
      {value ? "Pagato ✓" : "Segna pagato"}
    </button>
  );
}
