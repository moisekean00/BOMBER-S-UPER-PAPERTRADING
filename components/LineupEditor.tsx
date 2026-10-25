"use client";
import { useEffect, useMemo, useState } from "react";
import { applyLineup, KIND_LABEL, MANDATORY, MARGIN_KINDS, MAX_LEVERAGE, positionValue, type Kind, type Position, type Prices, type Fx } from "@/lib/rules";
import type { Window } from "@/lib/calendar";
import { eur, pctChange } from "./format";

type Ctx = {
  window: Window;
  profile: { cash: number; paid: boolean; trader_name: string };
  active: Position[];
  draft: Position[] | null;
  prices: Prices;
  fx: Fx;
};
type Hit = { symbol: string; name: string; quoteType: string; exchange: string };
type Instrument = {
  symbol: string;
  name: string;
  quoteType: string;
  price: number;
  currency: string;
  fx: number;
  option: { underlying: string; expiry: string; optType: "C" | "P"; strike: number } | null;
};
type Chain = {
  underlying: string;
  underlyingPrice: number | null;
  expirations: string[];
  calls: { symbol: string; strike: number; last: number; bid: number | null; ask: number | null; expiry: string }[];
  puts: { symbol: string; strike: number; last: number; bid: number | null; ask: number | null; expiry: string }[];
};

const defaultKind = (quoteType: string): Kind =>
  quoteType === "FUTURE" ? "future" : quoteType === "OPTION" ? "option" : quoteType === "ETF" ? "etf_equity" : "stock";

function unitEur(p: { multiplier: number; currency: string; symbol: string }, prices: Prices, fx: Fx) {
  const rate = p.currency === "EUR" ? 1 : fx[p.currency];
  return (p.multiplier * (prices[p.symbol] ?? NaN)) / rate;
}

export function LineupEditor() {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [target, setTarget] = useState<Position[]>([]);
  const [prices, setPrices] = useState<Prices>({});
  const [fx, setFx] = useState<Fx>({});
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    fetch("/api/lineup")
      .then((r) => r.json())
      .then((d) => {
        if (!d.window) return setLoadError("Il mercato è chiuso.");
        if (d.error) return setLoadError(d.error);
        setCtx(d);
        setTarget(d.draft ?? d.active);
        setPrices(d.prices);
        setFx(d.fx);
      })
      .catch(() => setLoadError("Non riesco a caricare i prezzi del venerdì. Riprova tra poco."));
  }, []);

  const preview = useMemo(() => {
    if (!ctx) return null;
    try {
      return applyLineup(ctx.active, ctx.profile.cash, target, prices, fx, { first: ctx.window.first });
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [ctx, target, prices, fx]);

  function update(symbol: string, patch: Partial<Position>) {
    setTarget((t) => t.map((p) => (p.symbol === symbol ? { ...p, ...patch } : p)));
    setDirty(true);
    setSaved(null);
  }
  function remove(symbol: string) {
    setTarget((t) => t.filter((p) => p.symbol !== symbol));
    setDirty(true);
    setSaved(null);
  }
  function add(i: Instrument, kind: Kind, amountEur: number, contracts: number, leverage: number) {
    const newPrices = { ...prices, [i.symbol]: i.price };
    const newFx = i.currency === "EUR" ? fx : { ...fx, [i.currency]: i.fx };
    if (i.option) newPrices[i.option.underlying] = newPrices[i.option.underlying] ?? NaN;
    const base: Position = {
      symbol: i.symbol,
      name: i.name,
      kind,
      currency: i.currency,
      qty: 0,
      multiplier: kind === "option" ? 100 : 1,
      leverage: kind === "etp" || MARGIN_KINDS.includes(kind) ? leverage : 1,
      margin: 0,
      refPrice: null,
      expiry: i.option?.expiry ?? null,
      underlying: i.option?.underlying ?? null,
      strike: i.option?.strike ?? null,
      optType: i.option?.optType ?? null,
    };
    const unit = unitEur(base, newPrices, newFx);
    // Azioni ed ETF: l'importo è il capitale tuo, l'esposizione è capitale x leva.
    base.qty = kind === "option" ? contracts : (amountEur * (MARGIN_KINDS.includes(kind) ? leverage : 1)) / unit;
    delete newPrices[i.option?.underlying ?? "__"];
    setPrices(newPrices);
    setFx(newFx);
    setTarget((t) => [...t.filter((p) => p.symbol !== i.symbol), base]);
    setDirty(true);
    setSaved(null);
  }

  async function save() {
    setSaving(true);
    setServerErrors([]);
    const res = await fetch("/api/lineup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ positions: target.map(({ symbol, kind, qty, leverage }) => ({ symbol, kind, qty, leverage })) }),
    }).catch(() => null);
    setSaving(false);
    const body = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) return setServerErrors(body.errors ?? ["Salvataggio non riuscito"]);
    setDirty(false);
    setSaved(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
  }

  if (loadError) return <div className="card"><div className="notice err">{loadError}</div></div>;
  if (!ctx || !preview) return <div className="card"><p className="muted">Carico i prezzi di chiusura del venerdì…</p></div>;
  const errors = "error" in preview ? [preview.error] : preview.errors;
  const r = "error" in preview ? null : preview;
  const priceDay = new Date(`${ctx.window.priceDate}T12:00:00Z`).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>La tua formazione</h2>
          <div className="muted" style={{ fontSize: 13 }}>Prezzi di chiusura di {priceDay}. Puoi cambiarla fino alla scadenza: vale l&apos;ultima versione salvata.</div>
        </div>
        <span className="tag">{ctx.draft ? "Bozza salvata" : "Nessun cambio salvato"}</span>
      </div>

      {!ctx.window.demo && !ctx.profile.paid && (
        <div className="notice info" style={{ marginTop: 12 }}>Per schierare la formazione devi prima versare la quota di 50 € a Pier su Revolut.</div>
      )}

      {r && (
        <div className="grid-3" style={{ marginTop: 16 }}>
          <div className="stat flat">
            <div className="label">Cash dopo i cambi</div>
            <div className={`value num ${r.cash < 0 ? "down" : ""}`}>{eur(r.cash)}</div>
            <div className="muted" style={{ fontSize: 13 }}>Totale {eur(r.total)}</div>
          </div>
          <div className="stat flat">
            <div className="label">Vendite / limite 50%</div>
            <div className="value num" style={{ fontSize: "1.2rem" }}>
              {eur(r.sold)} <span className="muted">/ {isFinite(r.saleLimit) ? eur(r.saleLimit) : "libero"}</span>
            </div>
            {isFinite(r.saleLimit) && (
              <div className={`bar ${r.sold > r.saleLimit ? "warn" : ""}`} style={{ marginTop: 8 }}>
                <span style={{ width: `${Math.min(100, (r.sold / Math.max(1, r.saleLimit)) * 100)}%` }} />
              </div>
            )}
          </div>
          <div className="stat flat">
            <div className="label">Minimi obbligatori 5%</div>
            {MANDATORY.map((k) => {
              const w = r.weights[k] ?? 0;
              return (
                <div key={k} className="row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                  <span>{KIND_LABEL[k]}</span>
                  <span className={w >= 0.05 ? "up" : "down"}>{pctChange(w).replace("+", "")}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="table-wrap" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              <th>Titolo</th>
              <th>Tipo</th>
              <th className="r">Prezzo ven.</th>
              <th className="r" style={{ minWidth: 150 }}>Quanto</th>
              <th className="r">Valore</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {target.length === 0 && (
              <tr><td colSpan={6} className="muted">Rosa vuota. Cerca un titolo qui sotto e compralo.</td></tr>
            )}
            {target.map((p) => {
              const done = r?.positions.find((x) => x.symbol === p.symbol);
              let net: number | null = null;
              try { net = done ? positionValue(done, prices, fx) : null; } catch {}
              return <EditRow key={p.symbol} p={p} prices={prices} fx={fx} margin={done?.margin ?? 0} net={net} onChange={(patch) => update(p.symbol, patch)} onRemove={() => remove(p.symbol)} />;
            })}
          </tbody>
        </table>
      </div>

      <AddInstrument onAdd={add} />

      {errors.length > 0 && (
        <div className="notice err" style={{ marginTop: 16 }}>
          {errors.map((e) => <div key={e}>• {e}</div>)}
        </div>
      )}
      {serverErrors.length > 0 && (
        <div className="notice err" style={{ marginTop: 12 }}>
          {serverErrors.map((e) => <div key={e}>• {e}</div>)}
        </div>
      )}
      {saved && !dirty && <div className="notice ok" style={{ marginTop: 12 }}>Formazione salvata alle {saved}. Diventa attiva alla chiusura del mercato.</div>}

      <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
        <button className="btn ghost" onClick={() => { setTarget(ctx.active); setDirty(true); setSaved(null); }}>Riparti dal portafoglio attivo</button>
        <button className="btn" onClick={save} disabled={saving || errors.length > 0 || (!ctx.window.demo && !ctx.profile.paid)}>
          {saving ? "Salvo…" : "Salva formazione"}
        </button>
      </div>
    </div>
  );
}

function EditRow({ p, prices, fx, margin, net, onChange, onRemove }: { p: Position; prices: Prices; fx: Fx; margin: number; net: number | null; onChange: (patch: Partial<Position>) => void; onRemove: () => void }) {
  const unit = unitEur(p, prices, fx);
  const value = p.qty * unit;
  const levered = MARGIN_KINDS.includes(p.kind);
  const lev = levered ? p.leverage || 1 : 1;
  // Per azioni ed ETF si scrive il capitale proprio; l'esposizione è capitale x leva.
  const capital = levered ? (net ?? value / lev) : value;
  const [text, setText] = useState<string>("");
  const current = p.kind === "option" ? p.qty : Math.round(capital);
  useEffect(() => setText(String(current)), [current]);

  function commit(v: string) {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    if (!isFinite(n)) return;
    onChange({ qty: p.kind === "option" ? n : (n * lev) / unit });
  }
  function setLev(l: number) {
    onChange({ leverage: l, qty: (capital * l) / unit });
  }
  return (
    <tr>
      <td>
        <div style={{ fontWeight: 700 }}>{p.symbol}</div>
        <div className="muted" style={{ fontSize: 12 }}>{p.name}</div>
      </td>
      <td>
        <span className="tag">{KIND_LABEL[p.kind]}</span>
        {p.kind === "etp" && (
          <div className="row" style={{ marginTop: 6, gap: 4 }}>
            <input style={{ width: 70, padding: "4px 8px" }} type="number" step="0.5" value={p.leverage} onChange={(e) => onChange({ leverage: Number(e.target.value) })} />
            <span className="muted" style={{ fontSize: 12 }}>leva (es. 3, -2)</span>
          </div>
        )}
        {levered && (
          <div style={{ marginTop: 6 }}>
            <select style={{ width: 84, padding: "4px 6px" }} value={lev} onChange={(e) => setLev(Number(e.target.value))} aria-label="Leva">
              {Array.from({ length: MAX_LEVERAGE }, (_, i) => i + 1).map((l) => <option key={l} value={l}>{l === 1 ? "No leva" : `Leva ${l}x`}</option>)}
            </select>
          </div>
        )}
      </td>
      <td className="r num">{prices[p.symbol]?.toLocaleString("it-IT", { maximumFractionDigits: 4 })} <span className="muted" style={{ fontSize: 12 }}>{p.currency}</span></td>
      <td className="r">
        {p.kind === "future" ? (
          <div className="row" style={{ justifyContent: "flex-end", gap: 6, flexWrap: "nowrap" }}>
            <select style={{ width: 84, padding: "6px" }} value={p.qty < 0 ? "short" : "long"} onChange={(e) => onChange({ qty: Math.abs(p.qty) * (e.target.value === "short" ? -1 : 1) })}>
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
            <input style={{ width: 120, textAlign: "right" }} inputMode="decimal" value={text.replace("-", "")} onChange={(e) => setText(e.target.value)} onBlur={(e) => commit(String((p.qty < 0 ? -1 : 1) * Number(e.target.value.replace(/\./g, "").replace(",", "."))))} aria-label="Esposizione in euro" />
          </div>
        ) : (
          <input style={{ width: 130, textAlign: "right" }} inputMode="decimal" value={text} onChange={(e) => setText(e.target.value)} onBlur={(e) => commit(e.target.value)} aria-label={p.kind === "option" ? "Contratti" : levered ? "Capitale in euro" : "Controvalore in euro"} />
        )}
        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
          {p.kind === "option" ? "contratti (x100)" : p.kind === "future" ? `esposizione € · margine ${eur(margin)}` : levered && lev > 1 ? `capitale € · esposizione ${eur(value)}` : `€ · ${p.qty.toLocaleString("it-IT", { maximumFractionDigits: 3 })} quote`}
        </div>
      </td>
      <td className="r num">{eur(p.kind === "future" ? margin : levered ? capital : value)}</td>
      <td className="r"><button className="btn danger small" onClick={onRemove} aria-label={`Togli ${p.symbol}`}>✕</button></td>
    </tr>
  );
}

function AddInstrument({ onAdd }: { onAdd: (i: Instrument, kind: Kind, amountEur: number, contracts: number, leverage: number) => void }) {
  const [tab, setTab] = useState<"search" | "options">("search");
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [picked, setPicked] = useState<Instrument | null>(null);
  const [kind, setKind] = useState<Kind>("stock");
  const [amount, setAmount] = useState("5000");
  const [contracts, setContracts] = useState("1");
  const [leverage, setLeverage] = useState("2");
  const [buyLev, setBuyLev] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [chain, setChain] = useState<Chain | null>(null);
  const [side, setSide] = useState<"C" | "P">("C");

  useEffect(() => {
    if (tab !== "search" || q.trim().length < 2) return setHits([]);
    const t = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((d) => Array.isArray(d) && setHits(d)).catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [q, tab]);

  async function pick(symbol: string, quoteType?: string) {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/price?s=${encodeURIComponent(symbol)}`).catch(() => null);
    setBusy(false);
    const d = r ? await r.json().catch(() => null) : null;
    if (!r?.ok || !d) return setError(d?.error ?? `Nessun prezzo di chiusura per ${symbol}`);
    setPicked(d);
    setKind(defaultKind(quoteType ?? d.quoteType));
    setHits([]);
  }

  async function loadChain(date?: string) {
    setBusy(true);
    setError(null);
    const r = await fetch(`/api/options?s=${encodeURIComponent(q.trim())}${date ? `&date=${date}` : ""}`).catch(() => null);
    setBusy(false);
    const d = r ? await r.json().catch(() => null) : null;
    if (!r?.ok || !d) return setError(d?.error ?? "Catena di opzioni non disponibile");
    setChain(d);
  }

  const strikes = useMemo(() => {
    if (!chain) return [];
    const list = side === "C" ? chain.calls : chain.puts;
    const s = chain.underlyingPrice ?? 0;
    return [...list].sort((a, b) => Math.abs(a.strike - s) - Math.abs(b.strike - s)).slice(0, 16).sort((a, b) => a.strike - b.strike);
  }, [chain, side]);

  function confirm() {
    if (!picked) return;
    onAdd(picked, kind, Number(amount.replace(/\./g, "").replace(",", ".")), Number(contracts.replace(",", ".")), kind === "etp" ? Number(leverage.replace(",", ".")) : buyLev);
    setPicked(null);
    setQ("");
    setChain(null);
  }

  return (
    <div style={{ marginTop: 20, background: "var(--bg)", borderRadius: 18, padding: 18 }}>
      <div className="row" style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, marginRight: 8 }}>Compra</h3>
        <div className="seg" style={{ background: "#fff" }}>
          <button className={tab === "search" ? "on" : ""} style={tab === "search" ? { background: "var(--navy)", color: "#fff" } : undefined} onClick={() => { setTab("search"); setPicked(null); }}>Azioni, ETF, futures</button>
          <button className={tab === "options" ? "on" : ""} style={tab === "options" ? { background: "var(--navy)", color: "#fff" } : undefined} onClick={() => { setTab("options"); setPicked(null); setHits([]); }}>Opzioni</button>
        </div>
      </div>

      {!picked && (
        <div className="row">
          <input className="grow" style={{ background: "#fff" }} value={q} onChange={(e) => { setQ(e.target.value); setChain(null); }} placeholder={tab === "search" ? "Cerca: Ferrari, VWCE, ES=F, AGGH…" : "Sottostante USA: AAPL, SPY, QQQ…"} />
          {tab === "options" && <button className="btn" onClick={() => loadChain()} disabled={busy || !q.trim()}>Carica catena</button>}
        </div>
      )}
      {tab === "search" && hits.length > 0 && (
        <div className="results">
          {hits.map((h) => (
            <button key={h.symbol} onClick={() => pick(h.symbol, h.quoteType)}>
              <span><b>{h.symbol}</b> <span className="muted">{h.name}</span></span>
              <span className="tag">{h.quoteType} · {h.exchange}</span>
            </button>
          ))}
        </div>
      )}
      {tab === "search" && !picked && q.length >= 2 && (
        <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
          Non lo trovi? Scrivi il simbolo Yahoo esatto (es. ENI.MI, VWCE.DE, CL=F) e <button className="btn ghost small" onClick={() => pick(q.trim().toUpperCase())}>usa {q.trim().toUpperCase()}</button>
        </div>
      )}

      {tab === "options" && chain && !picked && (
        <div style={{ marginTop: 12 }}>
          <div className="row">
            <select style={{ width: 170 }} onChange={(e) => loadChain(e.target.value)} defaultValue="">
              <option value="" disabled>Scadenza…</option>
              {chain.expirations.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <div className="seg" style={{ background: "#fff" }}>
              <button className={side === "C" ? "on" : ""} onClick={() => setSide("C")}>Call</button>
              <button className={side === "P" ? "on" : ""} onClick={() => setSide("P")}>Put</button>
            </div>
            <span className="muted" style={{ fontSize: 13 }}>{chain.underlying} a {chain.underlyingPrice}</span>
          </div>
          <div className="results">
            {strikes.map((o) => (
              <button key={o.symbol} onClick={() => pick(o.symbol, "OPTION")}>
                <span><b>{side === "C" ? "Call" : "Put"} {o.strike}</b> <span className="muted">scad. {o.expiry}</span></span>
                <span className="num">ultimo {o.last} · bid {o.bid ?? "—"} / ask {o.ask ?? "—"}</span>
              </button>
            ))}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Il prezzo usato è la chiusura di venerdì del contratto, non quello che vedi qui.</div>
        </div>
      )}

      {busy && <p className="muted">Cerco il prezzo di chiusura…</p>}
      {error && <div className="notice err" style={{ marginTop: 8 }}>{error}</div>}

      {picked && (
        <div className="stack" style={{ marginTop: 4 }}>
          <div>
            <b>{picked.symbol}</b> <span className="muted">{picked.name}</span>
            <div className="muted" style={{ fontSize: 13 }}>Chiusura venerdì: {picked.price} {picked.currency}{picked.currency !== "EUR" ? ` · cambio EUR/${picked.currency} ${picked.fx.toFixed(4)}` : ""}</div>
          </div>
          <div className="row">
            {picked.quoteType !== "FUTURE" && picked.quoteType !== "OPTION" && (
              <div className="grow">
                <label>Tipo</label>
                <select value={kind} onChange={(e) => setKind(e.target.value as Kind)}>
                  <option value="stock">Azione</option>
                  <option value="etf_equity">ETF azionario</option>
                  <option value="etf_bond">ETF obbligazionario</option>
                  <option value="etf_other">ETF/ETC altro (materie prime…)</option>
                  <option value="etp">Prodotto a leva o inverso</option>
                </select>
              </div>
            )}
            {kind === "etp" && (
              <div style={{ width: 120 }}>
                <label>Leva</label>
                <input value={leverage} onChange={(e) => setLeverage(e.target.value)} inputMode="decimal" />
              </div>
            )}
            {kind === "option" ? (
              <div style={{ width: 160 }}>
                <label>Contratti (x100)</label>
                <input value={contracts} onChange={(e) => setContracts(e.target.value)} inputMode="decimal" />
              </div>
            ) : (
              <div style={{ width: 180 }}>
                <label>{kind === "future" ? "Esposizione € (long)" : MARGIN_KINDS.includes(kind) ? "Capitale €" : "Controvalore €"}</label>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
              </div>
            )}
          </div>
          {MARGIN_KINDS.includes(kind) && (
            <div>
              <label>Leva</label>
              <div className="seg" style={{ background: "#fff" }}>
                {Array.from({ length: MAX_LEVERAGE }, (_, i) => i + 1).map((l) => (
                  <button key={l} className={buyLev === l ? "on" : ""} style={buyLev === l ? { background: "var(--navy)", color: "#fff" } : undefined} onClick={() => setBuyLev(l)}>{l}x</button>
                ))}
              </div>
              {buyLev > 1 && (
                <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
                  Esposizione {eur(Number(amount.replace(/\./g, "").replace(",", ".")) * buyLev)}: metti {eur(Number(amount.replace(/\./g, "").replace(",", ".")))} di cash, il resto è prestito senza interessi. Guadagni e perdite valgono {buyLev} volte: se il titolo scende del {Math.round(100 / buyLev)}% la posizione vale zero.
                </div>
              )}
            </div>
          )}
          {kind === "future" && <div className="muted" style={{ fontSize: 13 }}>Si blocca il 20% dell&apos;esposizione come margine. Per andare short cambia Long/Short nella tabella dopo averlo aggiunto.</div>}
          <div className="row">
            <button className="btn" onClick={confirm}>Compra</button>
            <button className="btn ghost" onClick={() => setPicked(null)}>Annulla</button>
          </div>
        </div>
      )}
    </div>
  );
}
