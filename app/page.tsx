import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Countdown } from "@/components/Countdown";
import { TAGLINE } from "@/lib/brand";
import { currentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DEMO = [
  { r: 1, n: "Lupo di Piazza Affari", v: "112.480 €", c: "+12,5%" },
  { r: 2, n: "Il Bomber del Nasdaq", v: "108.930 €", c: "+8,9%" },
  { r: 3, n: "Mister Contango", v: "104.210 €", c: "+4,2%" },
  { r: 4, n: "Short Panchina", v: "97.650 €", c: "−2,4%" },
];

export default async function Landing() {
  const user = await currentUser().catch(() => null);
  return (
    <main>
      <section className="lp-hero">
        <div className="lp-nav">
          <Logo size={36} light />
          <div className="row">
            {user ? (
              <Link className="btn white small" href="/dashboard">Entra</Link>
            ) : (
              <Link className="btn white small" href="/login">Accedi</Link>
            )}
          </div>
        </div>
        <div className="lp-hero-inner">
          <div>
            <h1>Il calciomercato,<br />ma con la <span>Borsa</span>.</h1>
            <p>{TAGLINE}</p>
            <div className="row">
              <Link className="btn white" href={user ? "/dashboard" : "/login?mode=signup"}>{user ? "Vai alla lega" : "Crea la tua squadra"}</Link>
              <Link className="btn ghost" href="/regolamento" style={{ color: "#fff", borderColor: "rgba(255,255,255,0.25)" }}>Regolamento</Link>
            </div>
          </div>
          <div style={{ display: "grid", justifyItems: "center", gap: 24 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/stemma.svg" alt="Super Bomber Paper Trader" width={240} height={240} style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.45))" }} />
          <div className="phone">
            <div className="eyebrow" style={{ marginBottom: 10 }}>Classifica · esempio</div>
            {DEMO.map((d) => (
              <div key={d.r} className="roster-row">
                <div className="row" style={{ flexWrap: "nowrap" }}>
                  <span className={`rank ${d.r <= 3 ? `g${d.r}` : ""}`}>{d.r}</span>
                  <span style={{ fontWeight: 600 }}>{d.n}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="num" style={{ fontWeight: 600 }}>{d.v}</div>
                  <div className={`num ${d.c.startsWith("+") ? "up" : "down"}`} style={{ fontSize: 12, fontWeight: 600 }}>{d.c}</div>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      <section className="lp-section">
        <h2>Come funziona</h2>
        <p className="lp-sub">Tre regole, una stagione da novembre a fine anno.</p>
        <div className="steps">
          <div className="step"><div className="n">1</div><h3>Ricevi 100.000 €</h3><p className="muted">Virtuali. Costruisci la squadra con azioni, ETF, futures e opzioni di tutti i mercati.</p></div>
          <div className="step"><div className="n">2</div><h3>Schiera nel weekend</h3><p className="muted">Il mercato apre il sabato e chiude la domenica alle 23:59. Si compra ai prezzi di chiusura del venerdì.</p></div>
          <div className="step"><div className="n">3</div><h3>Scala la classifica</h3><p className="muted">Ogni venerdì si aggiornano i valori. Al 31 dicembre vince il portafoglio più alto.</p></div>
        </div>
      </section>

      <section className="lp-band">
        <div className="lp-section">
          <h2>Tutti i mercati, una sola lega</h2>
          <p className="lp-sub">Leva fino a 5x, futures long e short, opzioni in acquisto. Niente crypto.</p>
          <div className="pills">
            {["Azioni", "ETF azionari", "ETF obbligazionari", "ETC e materie prime", "Prodotti a leva", "Futures", "Opzioni"].map((p) => <span key={p}>{p}</span>)}
          </div>
        </div>
      </section>

      <section className="lp-section">
        <div className="card hero" style={{ maxWidth: 620, margin: "0 auto" }}>
          <Countdown />
        </div>
      </section>

      <footer className="lp-foot">Super Bomber Paper Trader · soldi virtuali, sfottò veri.</footer>
    </main>
  );
}
