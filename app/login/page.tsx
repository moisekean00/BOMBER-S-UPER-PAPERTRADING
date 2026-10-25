"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { browserClient } from "@/lib/supabase/browser";
import { Logo } from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [trader, setTrader] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = browserClient();
    if (mode === "signup") {
      const r = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password, trader_name: trader.trim() }),
      }).catch(() => null);
      const body = r ? await r.json().catch(() => ({})) : {};
      if (!r?.ok) {
        setBusy(false);
        setError(body.error ?? "Iscrizione non riuscita, riprova");
        return;
      }
    }
    const res = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (res.error) {
      const m = res.error.message;
      setError(
        /invalid login/i.test(m) ? "Email o password sbagliate"
        : /not confirmed/i.test(m) ? "Iscrizione rimasta a metà: clicca Iscriviti e rifalla con la stessa email"
        : m,
      );
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="lp-hero" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center" }}><Link href="/"><Logo size={44} light /></Link></div>
        <form className="card" onSubmit={submit} style={{ marginTop: 28, color: "var(--text)" }}>
          <div className="seg" style={{ marginBottom: 20, width: "100%" }}>
            <button type="button" style={{ flex: 1 }} className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Accedi</button>
            <button type="button" style={{ flex: 1 }} className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>Iscriviti</button>
          </div>
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="trader">Nome da trader</label>
              <input id="trader" required minLength={2} maxLength={24} value={trader} onChange={(e) => setTrader(e.target.value)} placeholder="es. Il Bomber del Nasdaq" />
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="field">
            <label htmlFor="pw">Password</label>
            <input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </div>
          {error && <div className="notice err" style={{ marginTop: 12 }}>{error}</div>}
          <button className="btn" style={{ width: "100%", marginTop: 16 }} disabled={busy}>
            {busy ? "Un attimo…" : mode === "login" ? "Entra" : "Crea la squadra"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
