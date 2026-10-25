import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { fundamentals, myBook, news, type Fundamentals } from "@/lib/analytics";
import { livePrices } from "@/lib/live";
import { standings } from "@/lib/standings";
import { earningsEvents } from "@/lib/earnings";
import { STATIC_EVENTS } from "@/lib/events";
import { areaOf } from "@/lib/area";
import { START_CAPITAL } from "@/lib/calendar";
import { KIND_LABEL, notional, positionValue, type Kind } from "@/lib/rules";
import { maxDrawdown, sharpe, volatility, weeklyReturns } from "@/lib/metrics";
import { AnalyticsCharts } from "@/components/AnalyticsCharts";
import { eur, pctChange, cls } from "@/components/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const pct = (v: number | null | undefined, d = 1) => (v === null || v === undefined || !isFinite(v) ? "—" : `${(v * 100).toLocaleString("it-IT", { maximumFractionDigits: d, minimumFractionDigits: d })}%`);
const x2 = (v: number | null | undefined) => (v === null || v === undefined || !isFinite(v) ? "—" : v.toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 }));
const big = (v: number | null) => (v === null ? "—" : v >= 1e12 ? `${(v / 1e12).toFixed(2)} T` : v >= 1e9 ? `${(v / 1e9).toFixed(1)} Mld` : `${(v / 1e6).toFixed(0)} Mln`);
const REC: Record<string, string> = { strong_buy: "Strong buy", buy: "Buy", hold: "Hold", underperform: "Underperform", sell: "Sell", none: "—" };

function Bars({ rows, total }: { rows: [string, number][]; total: number }) {
  const max = Math.max(...rows.map(([, v]) => Math.abs(v)), 1);
  return (
    <div className="bars">
      {rows.map(([k, v]) => (
        <div key={k} className="barrow">
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k}</span>
          <div className="track"><div className="fill" style={{ width: `${(Math.abs(v) / max) * 100}%`, background: v < 0 ? "var(--down)" : undefined }} /></div>
          <span className="num r" title={eur(v)}>{pct(v / total)}</span>
        </div>
      ))}
    </div>
  );
}

export default async function AnalyticsPage({ searchParams }: { searchParams: { s?: string } }) {
  const user = (await currentUser())!;
  const book = await myBook(user.id);
  const held = [...new Set(book.positions.map((p) => p.symbol))];
  const focus = searchParams.s?.toUpperCase();
  const equities = book.positions.filter((p) => p.kind !== "option" && p.kind !== "future").map((p) => p.symbol);
  const [{ prices, fx }, list, fund, feed, earnings] = await Promise.all([
    livePrices(book.positions),
    standings(),
    fundamentals([...new Set([...equities, ...(focus ? [focus] : [])])].slice(0, 25)),
    news((focus ? [focus, ...held.filter((s) => s !== focus)] : held).slice(0, 12)),
    earningsEvents(book.positions.filter((p) => p.kind === "stock").map((p) => p.symbol), new Date().toISOString().slice(0, 10), "2026-12-31").catch(() => []),
  ]);
  const me = list.find((s) => s.profile.id === user.id);

  // Allocazione al valore (capitale netto) e all'esposizione.
  const value = (p: (typeof book.positions)[number]) => { try { return positionValue(p, prices, fx, true); } catch { return 0; } };
  const expo = (p: (typeof book.positions)[number]) => { try { return notional(p, prices[p.symbol], fx); } catch { return 0; } };
  const nav = book.cash + book.positions.reduce((s, p) => s + value(p), 0);
  const gross = book.positions.reduce((s, p) => s + Math.abs(expo(p)), 0);
  const group = (key: (p: (typeof book.positions)[number]) => string) => {
    const m = new Map<string, number>();
    for (const p of book.positions) m.set(key(p), (m.get(key(p)) ?? 0) + expo(p));
    return [...m.entries()].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  };
  const byClass = group((p) => KIND_LABEL[p.kind as Kind]);
  const byArea = group((p) => areaOf(p.kind === "option" ? p.underlying ?? p.symbol : p.symbol));
  const byCcy = group((p) => p.currency);
  const fMap = new Map(fund.map((f) => [f.symbol, f]));
  const bySector = group((p) => fMap.get(p.symbol)?.sector ?? (p.kind === "future" ? "Futures" : p.kind === "option" ? "Opzioni" : "Altro"));
  const top = book.positions.map((p) => [p.symbol, expo(p)] as [string, number]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 8);

  const hist = me?.history ?? [];
  const wr = weeklyReturns(hist);
  const focusF = focus ? fMap.get(focus) : undefined;
  const upcoming = [...earnings.filter((e) => e.symbol && held.includes(e.symbol)), ...STATIC_EVENTS.filter((e) => e.kind !== "trimestrali")]
    .filter((e) => e.date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div className="eyebrow">Super Bomber Analytics</div>
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Il tuo book, ai raggi X</h1>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {book.source === "ordini" ? "Analisi del book dopo gli ordini di questa finestra (non ancora eseguiti)." : "Analisi del book attivo."} Prezzi live con ~15&apos; di ritardo.
          </p>
        </div>
        <Link href="/squadra" className="btn ghost small">My Book</Link>
      </div>

      <div className="grid-5">
        <div className="stat"><div className="label">NAV live</div><div className="value num" style={{ fontSize: "1.4rem" }}>{eur(nav)}</div><div className={cls(nav - START_CAPITAL)} style={{ fontSize: 13, fontWeight: 600 }}>{pctChange(nav / START_CAPITAL - 1)} dall&apos;inizio</div></div>
        <div className="stat"><div className="label">Classifica</div><div className="value" style={{ fontSize: "1.4rem" }}>{me ? `${me.rank}°` : "—"}</div><div className="muted" style={{ fontSize: 13 }}>su {list.length} trader</div></div>
        <div className="stat"><div className="label">Leva lorda</div><div className="value num" style={{ fontSize: "1.4rem" }}>{nav > 0 ? (gross / nav).toLocaleString("it-IT", { maximumFractionDigits: 2 }) : "—"}x</div><div className="muted" style={{ fontSize: 13 }}>esposizione {eur(gross)}</div></div>
        <div className="stat"><div className="label">Cash</div><div className="value num" style={{ fontSize: "1.4rem" }}>{eur(book.cash)}</div><div className="muted" style={{ fontSize: 13 }}>{pct(book.cash / Math.max(1, nav))} del NAV</div></div>
        <div className="stat"><div className="label">Track record ufficiale</div><div className="value num" style={{ fontSize: "1.4rem" }}>{hist.length ? `${hist.length} ven.` : "—"}</div><div className="muted" style={{ fontSize: 12 }}>Vol {pct(volatility(wr))} · Sharpe {x2(sharpe(wr))} · DD {pct(maxDrawdown(hist))}</div></div>
      </div>

      {focus && (
        <div className="card" style={{ borderTop: "4px solid var(--blue)" }}>
          <div className="eyebrow">Focus titolo</div>
          <h2 style={{ margin: 0 }}>{focus} <span className="muted" style={{ fontSize: 16, fontWeight: 500 }}>{focusF?.name}</span></h2>
          {focusF ? <FundCards f={focusF} /> : <p className="muted">Statistiche non disponibili per questo strumento.</p>}
        </div>
      )}

      <AnalyticsCharts focus={focus} />

      {book.positions.length > 0 && (
        <div className="grid-2">
          <div className="card"><h3>Per classe di attivo</h3><Bars rows={byClass} total={nav} /></div>
          <div className="card"><h3>Per area geografica</h3><Bars rows={byArea} total={nav} /></div>
          <div className="card"><h3>Per settore</h3><Bars rows={bySector} total={nav} /></div>
          <div className="card"><h3>Per valuta</h3><Bars rows={byCcy} total={nav} /><p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Tutto ciò che non è in euro ti espone al cambio.</p></div>
          <div className="card" style={{ gridColumn: "1 / -1" }}><h3>Prime posizioni per esposizione</h3><Bars rows={top} total={nav} /><p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Percentuali sul NAV: con leva e futures la somma può superare il 100%.</p></div>
        </div>
      )}

      {fund.length > 0 && (
        <div className="card">
          <div className="eyebrow">Statistiche finanziarie</div>
          <h2>Multipli e fondamentali</h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Titolo</th><th className="r">Capitalizz.</th><th className="r">P/E</th><th className="r">P/E fwd</th><th className="r">EV/EBITDA</th><th className="r">P/BV</th><th className="r">Div. yield</th><th className="r">Beta</th><th className="r">Margine</th><th className="r">Crescita ricavi</th><th className="r">ROE</th><th className="r">52 sett.</th><th className="r">Target analisti</th></tr></thead>
              <tbody>
                {fund.map((f) => (
                  <tr key={f.symbol}>
                    <td><Link href={`/analytics?s=${encodeURIComponent(f.symbol)}`}><b>{f.symbol}</b></Link><div className="muted" style={{ fontSize: 12 }}>{f.name}{f.sector ? ` · ${f.sector}` : ""}</div></td>
                    <td className="r num">{big(f.marketCap)}</td>
                    <td className="r num">{x2(f.pe)}</td>
                    <td className="r num">{x2(f.forwardPe)}</td>
                    <td className="r num">{x2(f.evEbitda)}</td>
                    <td className="r num">{x2(f.priceToBook)}</td>
                    <td className="r num">{pct(f.dividendYield)}</td>
                    <td className="r num">{x2(f.beta)}</td>
                    <td className="r num">{pct(f.profitMargin)}</td>
                    <td className={`r num ${cls(f.revenueGrowth ?? 0)}`}>{pct(f.revenueGrowth)}</td>
                    <td className="r num">{pct(f.roe)}</td>
                    <td className="r"><Range52 f={f} /></td>
                    <td className="r num">{f.target ? `${x2(f.target)} ${f.price ? `(${pctChange(f.target / f.price - 1)})` : ""}` : "—"}<div className="muted" style={{ fontSize: 11 }}>{f.recommendation ? `${REC[f.recommendation] ?? f.recommendation}${f.analysts ? ` · ${f.analysts} analisti` : ""}` : ""}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ fontSize: 12, marginBottom: 0 }}>Fonte Yahoo Finance. Per gli ETF molti multipli non esistono e restano vuoti.</p>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <div className="eyebrow">Da tenere d&apos;occhio</div>
          <h2>News sui tuoi titoli</h2>
          {feed.length === 0 && <p className="muted">Nessuna notizia: compra qualcosa o riprova più tardi.</p>}
          <div className="news">
            {feed.slice(0, 15).map((n) => (
              <a key={n.id} href={n.link} target="_blank" rel="noreferrer">
                <div className="t" style={{ fontWeight: 600 }}>{n.title}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{n.publisher} · {new Date(n.time).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {n.tickers.slice(0, 3).join(", ")}</div>
              </a>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="eyebrow">Catalizzatori</div>
          <h2>Prossimi eventi</h2>
          <p className="muted" style={{ marginTop: -6, fontSize: 13 }}>Trimestrali dei tuoi titoli e appuntamenti macro che muovono il mercato.</p>
          {upcoming.map((e, i) => (
            <div key={i} className="roster-row">
              <div><div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div><div className="muted" style={{ fontSize: 12 }}>{e.area}{e.note ? ` · ${e.note}` : ""}</div></div>
              <div className="muted num" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{new Date(`${e.date}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}{e.time ? ` ${e.time}` : ""}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Range52({ f }: { f: Fundamentals }) {
  if (f.low52 === null || f.high52 === null || f.price === null || f.high52 <= f.low52) return <span className="muted">—</span>;
  const t = Math.max(0, Math.min(1, (f.price - f.low52) / (f.high52 - f.low52)));
  return (
    <div title={`Min ${f.low52} · Max ${f.high52} · Ora ${f.price}`} style={{ width: 90, marginLeft: "auto" }}>
      <div style={{ position: "relative", height: 6, background: "var(--bg)", borderRadius: 3 }}>
        <span style={{ position: "absolute", left: `calc(${t * 100}% - 5px)`, top: -2, width: 10, height: 10, borderRadius: 5, background: "var(--navy)", border: "2px solid #fff" }} />
      </div>
      <div className="muted" style={{ fontSize: 10, display: "flex", justifyContent: "space-between", marginTop: 3 }}><span>{x2(f.low52)}</span><span>{x2(f.high52)}</span></div>
    </div>
  );
}

function FundCards({ f }: { f: Fundamentals }) {
  const items: [string, string][] = [
    ["Prezzo", f.price === null ? "—" : `${x2(f.price)} ${f.currency ?? ""}`],
    ["Capitalizzazione", big(f.marketCap)],
    ["P/E · fwd", `${x2(f.pe)} · ${x2(f.forwardPe)}`],
    ["EV/EBITDA", x2(f.evEbitda)],
    ["Dividend yield", pct(f.dividendYield)],
    ["Beta", x2(f.beta)],
    ["Margine netto", pct(f.profitMargin)],
    ["Target analisti", f.target ? `${x2(f.target)}${f.price ? ` (${pctChange(f.target / f.price - 1)})` : ""}` : "—"],
  ];
  return (
    <div className="grid-4" style={{ marginTop: 12 }}>
      {items.map(([k, v]) => <div key={k} className="stat flat"><div className="label">{k}</div><div className="value num" style={{ fontSize: "1.1rem" }}>{v}</div></div>)}
    </div>
  );
}
