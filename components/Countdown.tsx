"use client";
import { useEffect, useState } from "react";
import { WINDOWS, type Window } from "@/lib/calendar";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { g: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const dateFmt = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

/** Stato del mercato stile asta: aperto con tempo alla chiusura, o chiuso con tempo all'apertura. */
export function Countdown({ compact = false }: { compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (now === null) return <div style={{ minHeight: compact ? 24 : 150 }} />;

  const open = WINDOWS.find((w) => now >= +new Date(w.opensAt) && now <= +new Date(w.closesAt));
  const next = WINDOWS.find((w) => +new Date(w.opensAt) > now);
  const target: Window | undefined = open ?? next;
  if (!target) return <div className="status-pill closed"><span className="dot" /> Stagione finita</div>;
  const ms = open ? +new Date(open.closesAt) - now : +new Date(target.opensAt) - now;
  const p = parts(ms);

  if (compact) {
    return (
      <span className={`status-pill ${open ? "open" : "closed"}`}>
        <span className="dot" /> {open ? "Mercato aperto" : "Mercato chiuso"} · {p.g > 0 ? `${p.g}g ` : ""}{String(p.h).padStart(2, "0")}:{String(p.m).padStart(2, "0")}:{String(p.s).padStart(2, "0")}
      </span>
    );
  }
  return (
    <div>
      <span className={`status-pill ${open ? "open" : "closed"}`}>
        <span className="dot" /> {open ? `Mercato aperto · ${open.label}` : "Mercato chiuso"}
      </span>
      <div className="muted" style={{ marginTop: 10 }}>
        {open ? "Chiude tra" : `Apre tra (${target.label})`}
      </div>
      <div className="countdown">
        {([["g", "giorni"], ["h", "ore"], ["m", "min"], ["s", "sec"]] as const).map(([k, u]) => (
          <div className="unit" key={k}>
            <div className="n">{String(p[k]).padStart(2, "0")}</div>
            <div className="u">{u}</div>
          </div>
        ))}
      </div>
      <div className="muted" style={{ fontSize: 13 }}>
        {open
          ? `Scadenza ${dateFmt.format(new Date(open.closesAt))}. Prezzi: chiusura di venerdì ${new Date(open.priceDate).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}.`
          : `Apertura ${dateFmt.format(new Date(target.opensAt))}.`}
      </div>
    </div>
  );
}
