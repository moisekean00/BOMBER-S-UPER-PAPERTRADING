"use client";
import { useEffect, useMemo, useState } from "react";
import { AREAS, EVENT_LABEL, type Area, type EventKind, type MarketEvent } from "@/lib/events";

const COLORS: Record<EventKind, string> = {
  banche: "#2563eb",
  macro: "#0ea5a4",
  trimestrali: "#e8b931",
  elezioni: "#e5484d",
  mercati: "#6b7690",
};
const day = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
const month = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("it-IT", { month: "long", year: "numeric" });

function Row({ e }: { e: MarketEvent }) {
  return (
    <div className="roster-row" style={{ alignItems: "flex-start" }}>
      <div style={{ display: "flex", gap: 10, minWidth: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: 4, background: COLORS[e.kind], marginTop: 7, flex: "none" }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
          {(e.note || e.area) && <div className="muted" style={{ fontSize: 12 }}>{e.area}{e.note ? ` · ${e.note}` : ""}</div>}
        </div>
      </div>
      <div className="muted num" style={{ fontSize: 12, textAlign: "right", whiteSpace: "nowrap" }}>
        {day(e.date)}
        {e.time && <div>{e.time}</div>}
      </div>
    </div>
  );
}

/** Agenda dei mercati: prossimi annunci e calendario completo in una finestra. */
export function EventsPanel() {
  const [events, setEvents] = useState<MarketEvent[] | null>(null);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<EventKind | "tutti">("tutti");
  const [area, setArea] = useState<Area | "tutte">("tutte");
  useEffect(() => {
    fetch("/api/events").then((r) => r.json()).then((d) => Array.isArray(d) && setEvents(d)).catch(() => setEvents([]));
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const shown = useMemo(() => (events ?? []).filter((e) => (filter === "tutti" || e.kind === filter) && (area === "tutte" || e.area === area)), [events, filter, area]);
  const byMonth = useMemo(() => {
    const m = new Map<string, MarketEvent[]>();
    for (const e of shown) m.set(month(e.date), [...(m.get(month(e.date)) ?? []), e]);
    return [...m.entries()];
  }, [shown]);

  return (
    <>
      <div className="card">
        <div className="section-head" style={{ marginBottom: 4 }}>
          <h3 style={{ margin: 0 }}>Agenda dei mercati</h3>
        </div>
        {events === null && <p className="muted" style={{ fontSize: 13 }}>Carico gli eventi…</p>}
        {(events ?? []).slice(0, 4).map((e, i) => <Row key={i} e={e} />)}
        <button className="btn ghost small" style={{ width: "100%", marginTop: 10 }} onClick={() => setOpen(true)}>
          Calendario completo
        </button>
      </div>

      {open && (
        <div role="dialog" aria-modal="true" aria-label="Calendario degli eventi" onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(10,26,58,0.45)", backdropFilter: "blur(6px)", display: "grid", placeItems: "center", padding: 16 }}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 640, maxHeight: "85vh", overflow: "auto" }}>
            <div className="section-head">
              <div>
                <div className="eyebrow">Fino al 31 dicembre</div>
                <h2>Calendario degli eventi</h2>
              </div>
              <button className="btn ghost small" onClick={() => setOpen(false)} aria-label="Chiudi">Chiudi</button>
            </div>
            <div className="row" style={{ gap: 6, marginBottom: 12 }}>
              {(["tutti", ...Object.keys(EVENT_LABEL)] as (EventKind | "tutti")[]).map((k) => (
                <button key={k} onClick={() => setFilter(k)} className="tag"
                  style={{ cursor: "pointer", border: 0, padding: "6px 12px", background: filter === k ? "var(--navy)" : "var(--bg)", color: filter === k ? "#fff" : "var(--navy-2)" }}>
                  {k === "tutti" ? "Tutti" : EVENT_LABEL[k]}
                </button>
              ))}
            </div>
            <div className="row" style={{ gap: 6, marginBottom: 12 }}>
              {(["tutte", ...AREAS] as (Area | "tutte")[]).map((a) => (
                <button key={a} onClick={() => setArea(a)} className="tag"
                  style={{ cursor: "pointer", border: "1px solid var(--line)", padding: "5px 11px", background: area === a ? "var(--navy-3)" : "#fff", color: area === a ? "#fff" : "var(--navy-2)" }}>
                  {a === "tutte" ? "Tutto il mondo" : a}
                </button>
              ))}
            </div>
            {byMonth.length === 0 && <p className="muted">Nessun evento in questa categoria.</p>}
            {byMonth.map(([m, list]) => (
              <div key={m} style={{ marginTop: 14 }}>
                <div className="eyebrow" style={{ marginBottom: 4 }}>{m}</div>
                {list.map((e, i) => <Row key={i} e={e} />)}
              </div>
            ))}
            <p className="muted" style={{ fontSize: 12, marginTop: 16 }}>Orari italiani. Banche centrali, dati macro ed elezioni dai calendari ufficiali (Fed, BCE, BoE, BoJ, BLS, Eurostat, Istat, NBS cinese); trimestrali di USA, Italia, Europa e Asia da Yahoo Finance, che a volte stima la data.</p>
          </div>
        </div>
      )}
    </>
  );
}
