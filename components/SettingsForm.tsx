"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";

export function SettingsForm({ name, email, paid }: { name: string; email: string; paid: boolean }) {
  const router = useRouter();
  const [trader, setTrader] = useState(name);
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ traderName: trader }) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    setMsg(r?.ok ? { ok: true, text: "Nome aggiornato." } : { ok: false, text: d.error ?? "Non riuscito" });
    if (r?.ok) router.refresh();
  }
  async function savePwd(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 6) return setMsg({ ok: false, text: "La password deve avere almeno 6 caratteri" });
    setBusy(true);
    const { error } = await browserClient().auth.updateUser({ password: pwd });
    setBusy(false);
    setPwd("");
    setMsg(error ? { ok: false, text: error.message } : { ok: true, text: "Password cambiata." });
  }
  async function logout() {
    await browserClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid-2">
      <form className="card" onSubmit={saveName}>
        <h3>Nome da trader</h3>
        <p className="muted" style={{ marginTop: -6, fontSize: 13 }}>È il nome che vedono gli altri in classifica e tra i Traders.</p>
        <input value={trader} onChange={(e) => setTrader(e.target.value)} maxLength={24} />
        <button className="btn" style={{ marginTop: 12 }} disabled={busy || trader.trim() === name}>Salva nome</button>
      </form>
      <form className="card" onSubmit={savePwd}>
        <h3>Accesso</h3>
        <p className="muted" style={{ marginTop: -6, fontSize: 13 }}>Email: {email}</p>
        <label>Nuova password</label>
        <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoComplete="new-password" />
        <button className="btn" style={{ marginTop: 12 }} disabled={busy || !pwd}>Cambia password</button>
      </form>
      <div className="card">
        <h3>Quota</h3>
        <p className="muted" style={{ marginTop: -6, fontSize: 13 }}>{paid ? "Quota di 50 € registrata dall'admin." : "Quota non ancora registrata: versa 50 € a Pier su Revolut."}</p>
        <span className={`tag ${paid ? "" : "down"}`}>{paid ? "Pagata" : "Da pagare"}</span>
      </div>
      <div className="card">
        <h3>Sessione</h3>
        <button className="btn ghost" onClick={logout}>Esci</button>
      </div>
      {msg && <div className={`notice ${msg.ok ? "ok" : "err"}`} style={{ gridColumn: "1 / -1" }}>{msg.text}</div>}
    </div>
  );
}
