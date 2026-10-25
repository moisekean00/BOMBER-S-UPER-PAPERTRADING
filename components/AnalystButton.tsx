"use client";
import { useEffect, useState } from "react";
import type { Analysts } from "@/lib/analytics";

const ACTION: Record<string, string> = { up: "Upgrade", down: "Downgrade", init: "Avvio copertura", main: "Conferma", reit: "Ribadisce" };
const TARGET: Record<string, string> = { Raises: "alza", Lowers: "taglia", Maintains: "conferma", Announces: "fissa", Adjusts: "rivede" };
const PERIOD: Record<string, string> = { "0m": "Questo mese", "-1m": "1 mese fa", "-2m": "2 mesi fa", "-3m": "3 mesi fa" };
const BUCKETS = [
  ["strongBuy", "Strong buy", "#0c6b37"],
  ["buy", "Buy", "#12a150"],
  ["hold", "Hold", "#b7bfd3"],
  ["sell", "Sell", "#e5484d"],
  ["strongSell", "Strong sell", "#a3272b"],
] as const;
const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : v.toLocaleString("it-IT", { maximumFractionDigits: 2, minimumFractionDigits: 2 }));
const tone = (g: string) => (/buy|outperform|overweight|positive|accumulate|add/i.test(g) ? "up" : /sell|underperform|underweight|negative|reduce/i.test(g) ? "down" : "");

/** Cella cliccabile (target/consenso) che apre il dettaglio degli analisti. */
export function AnalystButton({ symbol, children }: { symbol: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Analysts | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open || data) return;
    fetch(`/api/analysts?s=${encodeURIComponent(symbol)}`).then((r) => r.json()).then((d) => (d.error ? setError(d.error) : setData(d))).catch(() => setError("Dati non disponibili"));
  }, [open, data, symbol]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <button className="linkish" onClick={(e) => { e.preventDefault(); setOpen(true); }} title="Vedi chi ha detto cosa">{children}</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label={`Analisti su ${symbol}`} onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(10,26,58,0.45)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 16, textAlign: "left" }}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 680, maxHeight: "88vh", overflow: "auto" }}>
            <div className="section-head">
              <div>
                <div className="eyebrow">Consenso degli analisti</div>
                <h2 style={{ margin: 0 }}>{symbol} <span className="muted" style={{ fontSize: 15, fontWeight: 500 }}>{data?.name}</span></h2>
              </div>
              <button className="btn ghost small" onClick={() => setOpen(false)}>Chiudi</button>
            </div>
            {error && <div className="notice err">{error}</div>}
            {!data && !error && <p className="muted">Carico i giudizi dei broker…</p>}
            {data && <Detail a={data} />}
          </div>
        </div>
      )}
    </>
  );
}

function Detail({ a }: { a: Analysts }) {
  const t = a.targets;
  const lo = Math.min(t.low ?? Infinity, a.price ?? Infinity), hi = Math.max(t.high ?? -Infinity, a.price ?? -Infinity);
  const pos = (v: number) => `${((v - lo) / Math.max(1e-9, hi - lo)) * 100}%`;
  const upside = t.mean && a.price ? t.mean / a.price - 1 : null;
  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="grid-3">
        <div className="stat flat"><div className="label">Target medio</div><div className="value num" style={{ fontSize: "1.3rem" }}>{n(t.mean)} <span className="muted" style={{ fontSize: 13 }}>{a.currency}</span></div>{upside !== null && <div className={upside >= 0 ? "up" : "down"} style={{ fontSize: 13, fontWeight: 600 }}>{upside >= 0 ? "+" : ""}{(upside * 100).toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}% dal prezzo</div>}</div>
        <div className="stat flat"><div className="label">Giudizio medio</div><div className="value" style={{ fontSize: "1.3rem", textTransform: "capitalize" }}>{a.recommendation?.replace("_", " ") ?? "—"}</div></div>
        <div className="stat flat"><div className="label">Analisti</div><div className="value" style={{ fontSize: "1.3rem" }}>{a.count ?? "—"}</div></div>
      </div>

      {t.low !== null && t.high !== null && isFinite(lo) && (
        <div>
          <div className="label" style={{ marginBottom: 22 }}>Range dei target</div>
          <div style={{ position: "relative", height: 8, background: "var(--bg)", borderRadius: 4, margin: "0 8px" }}>
            <div style={{ position: "absolute", left: pos(t.low), width: `calc(${pos(t.high)} - ${pos(t.low)})`, height: 8, background: "#c9d6f5", borderRadius: 4 }} />
            {t.mean !== null && <Marker at={pos(t.mean)} label={`Medio ${n(t.mean)}`} color="var(--navy)" above />}
            {a.price !== null && <Marker at={pos(a.price)} label={`Prezzo ${n(a.price)}`} color="var(--gold)" />}
          </div>
          <div className="muted num" style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 26 }}><span>Min {n(t.low)}</span><span>Max {n(t.high)}</span></div>
        </div>
      )}

      {a.trend.length > 0 && (
        <div>
          <div className="label" style={{ marginBottom: 8 }}>Raccomandazioni nel tempo</div>
          {a.trend.map((r) => {
            const tot = BUCKETS.reduce((s, [k]) => s + r[k], 0) || 1;
            return (
              <div key={r.period} className="row" style={{ gap: 10, flexWrap: "nowrap", marginBottom: 6, fontSize: 13 }}>
                <span style={{ width: 90, flex: "none" }} className="muted">{PERIOD[r.period] ?? r.period}</span>
                <div style={{ display: "flex", flex: 1, height: 18, borderRadius: 6, overflow: "hidden", gap: 2 }}>
                  {BUCKETS.map(([k, l, c]) => r[k] > 0 && <div key={k} title={`${l}: ${r[k]}`} style={{ width: `${(r[k] / tot) * 100}%`, background: c, color: k === "hold" ? "var(--text)" : "#fff", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>{r[k]}</div>)}
                </div>
              </div>
            );
          })}
          <div className="row" style={{ gap: 12, fontSize: 12, marginTop: 6 }}>
            {BUCKETS.map(([k, l, c]) => <span key={k} className="row" style={{ gap: 5 }}><span className="dot" style={{ background: c }} />{l}</span>)}
          </div>
        </div>
      )}

      <div>
        <div className="label" style={{ marginBottom: 6 }}>Chi ha detto cosa</div>
        {a.history.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>Yahoo non ha lo storico dei singoli broker per questo titolo (succede spesso con i titoli europei).</p> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Data</th><th>Broker</th><th>Giudizio</th><th className="r">Target</th></tr></thead>
              <tbody>
                {a.history.map((h, i) => (
                  <tr key={i}>
                    <td className="muted" style={{ whiteSpace: "nowrap" }}>{new Date(`${h.date}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "2-digit" })}</td>
                    <td style={{ fontWeight: 600 }}>{h.firm}</td>
                    <td><span className={tone(h.to)} style={{ fontWeight: 700 }}>{h.to}</span>{h.from && h.from !== h.to ? <span className="muted"> da {h.from}</span> : ""}<div className="muted" style={{ fontSize: 11 }}>{ACTION[h.action] ?? h.action}</div></td>
                    <td className="r num">{h.target ? n(h.target) : "—"}{h.prior && h.target && h.prior !== h.target ? <div className="muted" style={{ fontSize: 11 }}>{TARGET[h.targetAction ?? ""] ?? "da"} {n(h.prior)}</div> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>Fonte Yahoo Finance. Non è un consiglio di investimento: è quello che scrivono le banche.</p>
    </div>
  );
}

function Marker({ at, label, color, above }: { at: string; label: string; color: string; above?: boolean }) {
  return (
    <div style={{ position: "absolute", left: at, top: -4, transform: "translateX(-50%)" }}>
      <div style={{ width: 16, height: 16, borderRadius: 8, background: color, border: "3px solid #fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
      <div className="num" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", [above ? "bottom" : "top"]: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{label}</div>
    </div>
  );
}
