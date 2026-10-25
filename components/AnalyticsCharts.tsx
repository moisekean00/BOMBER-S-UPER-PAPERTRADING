"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { eur } from "./format";

type Stat = { ret: number | null; vol: number | null; beta: number | null; maxdd: number | null };
type Data = {
  source: "attivo" | "ordini";
  hasDraft: boolean;
  nav: number;
  dates: string[];
  lines: Record<string, (number | null)[]>;
  book: (number | null)[];
  benchmarks: Record<string, string>;
  perSymbol: Record<string, Stat & { weight: number }>;
  corr: { symbols: string[]; matrix: (number | null)[][] };
  bookStats: Stat & { var95: number | null; var95Eur: number | null };
  names: Record<string, string>;
};

// Palette categorica (ordine fisso, validata per daltonismo sui primi slot adiacenti).
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
const BOOK_COLOR = "#0a1a3a";
const BENCH_DASH: Record<string, string> = { "^GSPC": "6 4", "FTSEMIB.MI": "2 3", "^STOXX50E": "10 3 2 3" };
const RANGES = [["1m", "1M"], ["3m", "3M"], ["6m", "6M"], ["ytd", "YTD"], ["1y", "1A"]];
const MAX_LINES = 6;

const pct = (v: number | null | undefined, d = 1) => (v === null || v === undefined || !isFinite(v) ? "—" : `${v >= 0 ? "+" : ""}${(v * 100).toLocaleString("it-IT", { maximumFractionDigits: d, minimumFractionDigits: d })}%`);
const plain = (v: number | null | undefined, d = 2) => (v === null || v === undefined || !isFinite(v) ? "—" : v.toLocaleString("it-IT", { maximumFractionDigits: d, minimumFractionDigits: d }));
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "short" });

export function AnalyticsCharts({ focus }: { focus?: string }) {
  const [range, setRange] = useState("3m");
  const [book, setBook] = useState<"ordini" | "attivo">("ordini");
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[] | null>(null);
  const [bench, setBench] = useState<string[]>(["^GSPC"]);

  useEffect(() => {
    setError(null);
    fetch(`/api/analytics?range=${range}&book=${book}`)
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("Dati non disponibili, riprova tra poco"));
  }, [range, book]);

  // Colori legati al titolo (ordine per peso al primo caricamento), non al rango.
  const holdings = useMemo(() => (data ? Object.keys(data.perSymbol).sort((a, b) => Math.abs(data.perSymbol[b].weight) - Math.abs(data.perSymbol[a].weight)) : []), [data]);
  const colorOf = useMemo(() => Object.fromEntries(holdings.map((s, i) => [s, SERIES[i % SERIES.length]])), [holdings]);
  useEffect(() => {
    if (data && selected === null) setSelected(focus && holdings.includes(focus) ? [focus] : holdings.slice(0, 4));
  }, [data, holdings, selected, focus]);

  if (error) return <div className="card"><div className="notice err">{error}</div></div>;
  if (!data) return <div className="card"><p className="muted">Scarico gli storici dei prezzi…</p></div>;
  const sel = (selected ?? []).filter((s) => holdings.includes(s));
  const toggle = (s: string) => setSelected(sel.includes(s) ? sel.filter((x) => x !== s) : sel.length >= MAX_LINES ? sel : [...sel, s]);
  const b = data.bookStats;

  const lines = [
    { key: "book", label: "Il tuo book", color: BOOK_COLOR, width: 3, dash: undefined, values: data.book },
    ...bench.map((k) => ({ key: k, label: data.benchmarks[k], color: "#6b7690", width: 1.5, dash: BENCH_DASH[k], values: data.lines[k] ?? [] })),
    ...sel.map((s) => ({ key: s, label: s, color: colorOf[s], width: 2, dash: undefined, values: data.lines[s] ?? [] })),
  ];

  return (
    <>
      <div className="card">
        <div className="section-head" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="eyebrow">Performance · base 100</div>
            <h2 style={{ margin: 0 }}>Il book contro il mercato</h2>
          </div>
          <div className="row" style={{ gap: 8 }}>
            {data.hasDraft && (
              <div className="seg">
                <button className={book === "ordini" ? "on" : ""} onClick={() => setBook("ordini")}>Dopo gli ordini</button>
                <button className={book === "attivo" ? "on" : ""} onClick={() => setBook("attivo")}>Book attivo</button>
              </div>
            )}
            <div className="seg">
              {RANGES.map(([k, l]) => <button key={k} className={range === k ? "on" : ""} onClick={() => setRange(k)}>{l}</button>)}
            </div>
          </div>
        </div>
        <p className="muted" style={{ marginTop: -4, fontSize: 13 }}>
          La linea del book applica i pesi di oggi a tutto il periodo (buy and hold, leva compresa, cambi esclusi): ti dice come avrebbe performato questa allocazione.
        </p>

        <div className="chips">
          <span className="muted" style={{ fontSize: 12 }}>Benchmark</span>
          {Object.entries(data.benchmarks).map(([k, l]) => (
            <button key={k} className={`chip ${bench.includes(k) ? "on" : ""}`} onClick={() => setBench(bench.includes(k) ? bench.filter((x) => x !== k) : [...bench, k])}>
              <svg width="18" height="6" aria-hidden><line x1="0" y1="3" x2="18" y2="3" stroke="#6b7690" strokeWidth="2" strokeDasharray={BENCH_DASH[k]} /></svg>{l}
            </button>
          ))}
        </div>
        <div className="chips">
          <span className="muted" style={{ fontSize: 12 }}>Titoli (max {MAX_LINES})</span>
          {holdings.map((s) => (
            <button key={s} className={`chip ${sel.includes(s) ? "on" : ""}`} onClick={() => toggle(s)} title={data.names[s]}>
              <span className="dot" style={{ background: colorOf[s] }} />{s}
            </button>
          ))}
          {!holdings.length && <span className="muted" style={{ fontSize: 13 }}>Compra qualcosa per vedere i tuoi titoli qui.</span>}
        </div>
        <LineChart dates={data.dates} lines={lines} />
      </div>

      <div className="grid-5">
        <Tile label="Rendimento periodo" value={pct(b.ret)} tone={b.ret} />
        <Tile label="Volatilità annua" value={pct(b.vol).replace("+", "")} />
        <Tile label="Beta vs S&P 500" value={plain(b.beta)} />
        <Tile label="Max drawdown" value={pct(b.maxdd)} tone={b.maxdd && b.maxdd < 0 ? -1 : null} />
        <Tile label="VaR 95% a 1 giorno" value={b.var95Eur === null ? "—" : eur(b.var95Eur)} sub={b.var95 === null ? undefined : `${pct(b.var95).replace("+", "")} del NAV`} />
      </div>

      <div className="card">
        <div className="eyebrow">Rischio per titolo · {RANGES.find(([k]) => k === range)?.[1]}</div>
        <h2>Breakdown del rischio</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Titolo</th><th className="r">Peso (esposizione)</th><th className="r">Rendimento</th><th className="r">Volatilità</th><th className="r">Beta</th><th className="r">Max DD</th></tr></thead>
            <tbody>
              {holdings.map((s) => {
                const r = data.perSymbol[s];
                return (
                  <tr key={s}>
                    <td><span className="dot" style={{ background: colorOf[s], marginRight: 8 }} /><b>{s}</b> <span className="muted" style={{ fontSize: 12 }}>{data.names[s]}</span></td>
                    <td className="r num">{pct(r.weight).replace("+", "")}</td>
                    <td className={`r num ${r.ret === null ? "" : r.ret >= 0 ? "up" : "down"}`}>{pct(r.ret)}</td>
                    <td className="r num">{pct(r.vol).replace("+", "")}</td>
                    <td className="r num">{plain(r.beta)}</td>
                    <td className="r num">{pct(r.maxdd)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {data.corr.symbols.length >= 2 && <Correlation symbols={data.corr.symbols} matrix={data.corr.matrix} />}
    </>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: number | null }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className={`value num ${tone === null || tone === undefined ? "" : tone >= 0 ? "up" : "down"}`} style={{ fontSize: "1.4rem" }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

type Line = { key: string; label: string; color: string; width: number; dash?: string; values: (number | null)[] };

function LineChart({ dates, lines }: { dates: string[]; lines: Line[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(720);
  const [hover, setHover] = useState<number | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const h = 300, padL = 44, padR = 12, padT = 12, padB = 26;
  const all = lines.flatMap((l) => l.values.filter((v): v is number => v !== null && isFinite(v)));
  if (!dates.length || !all.length) return <p className="muted">Nessuno storico disponibile per questo periodo.</p>;
  let lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 2;
  lo -= pad; hi += pad;
  const x = (i: number) => padL + (i / Math.max(1, dates.length - 1)) * (w - padL - padR);
  const y = (v: number) => padT + (1 - (v - lo) / (hi - lo)) * (h - padT - padB);
  const step = (hi - lo) / 4;
  const ticks = Array.from({ length: 5 }, (_, i) => lo + step * i);
  const xt = [0, Math.floor(dates.length / 3), Math.floor((2 * dates.length) / 3), dates.length - 1];
  const path = (vals: (number | null)[]) => {
    let d = "", pen = false;
    vals.forEach((v, i) => {
      if (v === null || !isFinite(v)) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  function move(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - padL) / (w - padL - padR)) * (dates.length - 1));
    setHover(Math.max(0, Math.min(dates.length - 1, i)));
  }
  const tipLeft = hover !== null && x(hover) > w / 2;
  return (
    <div ref={ref} style={{ position: "relative", marginTop: 8 }}>
      <svg width={w} height={h} onPointerMove={move} onPointerLeave={() => setHover(null)} role="img" aria-label="Andamento in base 100 del book, dei benchmark e dei titoli selezionati" style={{ display: "block", touchAction: "pan-y" }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="#e6e9f2" />
            <text x={padL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#6b7690">{Math.round(t)}</text>
          </g>
        ))}
        {lo < 100 && hi > 100 && <line x1={padL} x2={w - padR} y1={y(100)} y2={y(100)} stroke="#b7bfd3" strokeDasharray="3 3" />}
        {xt.map((i) => <text key={i} x={x(i)} y={h - 6} textAnchor={i === 0 ? "start" : i === dates.length - 1 ? "end" : "middle"} fontSize="11" fill="#6b7690">{dayLabel(dates[i])}</text>)}
        {[...lines].reverse().map((l) => <path key={l.key} d={path(l.values)} fill="none" stroke={l.color} strokeWidth={l.width} strokeDasharray={l.dash} strokeLinejoin="round" strokeLinecap="round" />)}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={h - padB} stroke="#0a1a3a" strokeOpacity="0.25" />
            {lines.map((l) => {
              const v = l.values[hover];
              return v === null || v === undefined ? null : <circle key={l.key} cx={x(hover)} cy={y(v)} r={4} fill={l.color} stroke="#fff" strokeWidth="2" />;
            })}
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="tip" style={{ top: 8, ...(tipLeft ? { left: Math.max(0, x(hover) - 210) } : { left: x(hover) + 12 }) }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{dayLabel(dates[hover])}</div>
          {lines.map((l) => {
            const v = l.values[hover];
            return (
              <div key={l.key} className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "nowrap" }}>
                <span className="row" style={{ gap: 6, flexWrap: "nowrap" }}><span className="dot" style={{ background: l.color }} />{l.label}</span>
                <span className="num">{v === null || v === undefined ? "—" : `${v >= 100 ? "+" : ""}${(v - 100).toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}%`}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function corrColor(c: number | null) {
  if (c === null) return "#f4f6fb";
  // Divergente: blu (decorrelati/negativi) - grigio neutro (0) - rosso (molto correlati).
  const t = Math.min(1, Math.abs(c));
  const [r, g, b] = c >= 0 ? [227, 73, 72] : [42, 120, 214];
  const mix = (a: number, z: number) => Math.round(a + (z - a) * t);
  return `rgb(${mix(238, r)},${mix(240, g)},${mix(245, b)})`;
}

function Correlation({ symbols, matrix }: { symbols: string[]; matrix: (number | null)[][] }) {
  return (
    <div className="card">
      <div className="eyebrow">Diversificazione</div>
      <h2>Matrice di correlazione</h2>
      <p className="muted" style={{ marginTop: -6, fontSize: 13 }}>Correlazione dei rendimenti giornalieri tra i tuoi primi titoli. Rosso = si muovono insieme (poca diversificazione), blu = si muovono in direzioni opposte.</p>
      <div className="table-wrap">
        <table className="corr">
          <thead><tr><th />{symbols.map((s) => <th key={s} className="r">{s}</th>)}</tr></thead>
          <tbody>
            {symbols.map((a, i) => (
              <tr key={a}>
                <th>{a}</th>
                {symbols.map((b, j) => {
                  const c = matrix[i][j];
                  if (i === j) return <td key={b} className="r muted" style={{ background: "var(--bg)" }}>—</td>;
                  return <td key={b} className="r num" title={`${a} / ${b}: ${c === null ? "n.d." : c.toFixed(2)}`} style={{ background: corrColor(c), color: c !== null && Math.abs(c) > 0.6 ? "#fff" : "var(--text)" }}>{c === null ? "—" : c.toFixed(2)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
