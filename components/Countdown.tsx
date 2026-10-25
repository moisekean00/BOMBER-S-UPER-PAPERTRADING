"use client";
import { useEffect, useState } from "react";
import { WINDOWS } from "@/lib/calendar";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { g: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const pad = (n: number) => String(n).padStart(2, "0");
const dateFmt = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function state(now: number) {
  const open = WINDOWS.find((w) => now >= +new Date(w.opensAt) && now <= +new Date(w.closesAt));
  const next = WINDOWS.find((w) => +new Date(w.opensAt) > now);
  const ms = open ? +new Date(open.closesAt) - now : next ? +new Date(next.opensAt) - now : 0;
  return { open, next, p: parts(ms) };
}

/** Stato del mercato come nelle app delle leghe: aperto con tempo alla chiusura, o chiuso con tempo all'apertura. */
export function Countdown({ compact = false }: { compact?: boolean }) {
  const now = useNow();
  if (now === null) return <div style={{ minHeight: compact ? 24 : 150 }} />;
  const { open, next, p } = state(now);
  if (!open && !next) return <span className="status-pill closed"><span className="dot" /> Stagione finita</span>;
  const clock = `${p.g > 0 ? `${p.g}g ` : ""}${pad(p.h)}:${pad(p.m)}:${pad(p.s)}`;

  if (compact) {
    return (
      <span className={`status-pill ${open ? "open" : "closed"}`}>
        <span className="dot" /> {open ? "Mercato aperto" : "Mercato chiuso"} · {clock}
      </span>
    );
  }
  const w = open ?? next!;
  return (
    <div style={{ position: "relative" }}>
      <span className={`status-pill ${open ? "open" : "closed"}`}>
        <span className="dot" /> {open ? "Mercato aperto" : "Mercato chiuso"}
      </span>
      <h2 style={{ marginTop: 14, marginBottom: 0 }}>{w.label}</h2>
      <div className="muted">{open ? "Il mercato chiude tra" : "Il mercato apre tra"}</div>
      <div className="countdown">
        {([["g", "giorni"], ["h", "ore"], ["m", "min"], ["s", "sec"]] as const).map(([k, u]) => (
          <div className="unit" key={k}>
            <div className="n">{pad(p[k])}</div>
            <div className="u">{u}</div>
          </div>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 13 }}>
        {open
          ? `Scadenza ${dateFmt.format(new Date(open.closesAt))} · prezzi di chiusura di venerdì ${new Date(`${open.priceDate}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`
          : `Apertura ${dateFmt.format(new Date(w.opensAt))}`}
      </div>
    </div>
  );
}
