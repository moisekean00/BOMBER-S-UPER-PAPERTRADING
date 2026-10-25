"use client";
import { useEffect, useState } from "react";

type Q = { symbol: string; name: string; price: number; changePct: number | null; currency: string };

const MARKETS: [string, string][] = [
  ["FTSEMIB.MI", "FTSE MIB"],
  ["^STOXX50E", "Euro Stoxx 50"],
  ["^GDAXI", "DAX"],
  ["^GSPC", "S&P 500"],
  ["^IXIC", "Nasdaq"],
  ["^N225", "Nikkei"],
  ["EURUSD=X", "EUR/USD"],
  ["GC=F", "Oro"],
  ["CL=F", "Petrolio WTI"],
  ["^TNX", "Treasury 10a"],
];

function Row({ q, label }: { q?: Q; label: string }) {
  const ch = q?.changePct ?? null;
  return (
    <div className="ticker-row">
      <div style={{ minWidth: 0 }}>
        <div className="sym">{label}</div>
        {q && q.name !== label && <div className="nm">{q.symbol}</div>}
      </div>
      <div style={{ textAlign: "right" }} className="num">
        <div>{q ? q.price.toLocaleString("it-IT", { maximumFractionDigits: q.price < 10 ? 4 : 2 }) : "…"}</div>
        <div className={ch === null ? "muted" : ch >= 0 ? "up" : "down"} style={{ fontSize: 12, fontWeight: 700 }}>
          {ch === null ? "" : `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%`}
        </div>
      </div>
    </div>
  );
}

/** Dashboard titoli a destra: mercati principali e i miei titoli, aggiornati ogni minuto. */
export function TickerRail({ mine = [] }: { mine?: { symbol: string; name: string }[] }) {
  const [data, setData] = useState<Record<string, Q>>({});
  const [at, setAt] = useState<string>("");
  useEffect(() => {
    const symbols = [...MARKETS.map((m) => m[0]), ...mine.map((m) => m.symbol)];
    const load = () =>
      fetch(`/api/quotes?s=${encodeURIComponent(symbols.join(","))}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((list: Q[]) => {
          if (!Array.isArray(list)) return;
          setData(Object.fromEntries(list.map((q) => [q.symbol, q])));
          setAt(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [mine.map((m) => m.symbol).join(",")]);

  return (
    <aside className="rail stack">
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h3 style={{ margin: 0 }}>Mercati</h3>
          <span className="muted" style={{ fontSize: 12 }}>{at ? `agg. ${at} · ritardo ~15'` : ""}</span>
        </div>
        {MARKETS.map(([s, label]) => <Row key={s} q={data[s]} label={label} />)}
      </div>
      {mine.length > 0 && (
        <div className="card">
          <h3>I miei titoli</h3>
          {mine.map((m) => <Row key={m.symbol} q={data[m.symbol]} label={m.symbol} />)}
        </div>
      )}
    </aside>
  );
}
