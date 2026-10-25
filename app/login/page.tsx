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
    const res =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: { trader_name: trader.trim() } } });
    setBusy(false);
    if (res.error) {
      const m = res.error.message;
      setError(
        /invalid login/i.test(m) ? "Email o password sbagliate"
        : /already registered/i.test(m) ? "Questa email è già iscritta: accedi"
        : /database error/i.test(m) ? "Questo nome da trader è già preso, scegline un altro"
        : /password/i.test(m) ? "La password deve avere almeno 6 caratteri"
        : m,
      );
      return;
    }
    if (mode === "signup" && !res.data.session) {
      setError("Iscrizione fatta. Controlla l'email per confermare, poi accedi.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="landing">
      <div style={{ width: "100%", maxWidth: 400 }}>
        <Link href="/" style={{ textDecoration: "none" }}><Logo size={56} big /></Link>
        <form className="card" onSubmit={submit} style={{ marginTop: 28, textAlign: "left" }}>
          <div className="row" style={{ marginBottom: 16 }}>
            <button type="button" className={`btn small ${mode === "login" ? "" : "ghost"}`} onClick={() => setMode("login")}>Accedi</button>
            <button type="button" className={`btn small ${mode === "signup" ? "" : "ghost"}`} onClick={() => setMode("signup")}>Iscriviti</button>
          </div>
          {mode === "signup" && (
            <div className="field">
              <label htmlFor="trader">Nome da trader</label>
              <input id="trader" required minLength={2} maxLength={24} value={trader} onChange={(e) => setTrader(e.target.value)} placeholder="es. Lupo di Piazza Affari" />
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
