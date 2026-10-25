// Regole del torneo come funzioni pure: usate dal browser per l'anteprima
// e dal server per la validazione vera. Tutti gli importi sono in euro.

export type Kind = "stock" | "etf_equity" | "etf_bond" | "etf_other" | "etp" | "future" | "option";

export const KIND_LABEL: Record<Kind, string> = {
  stock: "Azione",
  etf_equity: "ETF azionario",
  etf_bond: "ETF obbligazionario",
  etf_other: "ETF/ETC altro",
  etp: "Prodotto a leva",
  future: "Future",
  option: "Opzione",
};

export type Position = {
  symbol: string;
  name: string;
  kind: Kind;
  currency: string; // valuta del prezzo, già normalizzata (GBp -> GBP)
  qty: number; // quote, contratti di opzione, o unità di future (con segno)
  multiplier: number; // 100 per le opzioni USA, 1 altrimenti
  leverage: number; // ETP: leva del prodotto (con segno); azioni ed ETF: leva scelta per l'acquisto (1-5)
  margin: number; // solo futures: margine bloccato in euro
  debt?: number; // acquisti a leva: prestito in euro (esposizione meno capitale proprio)
  refPrice: number | null; // solo futures: prezzo dell'ultimo regolamento
  expiry: string | null; // solo opzioni
  underlying: string | null;
  strike: number | null;
  optType: "C" | "P" | null;
};

export type Prices = Record<string, number>; // simbolo -> prezzo in valuta locale
export type Fx = Record<string, number>; // valuta -> unità per 1 EUR

export const MARGIN = 0.2;
export const MAX_LEVERAGE = 5;
export const MAX_SALE_SHARE = 0.5;
export const LOAN_RATE = 0.05; // interesse annuo sul prestito degli acquisti a leva, addebitato ogni venerdì
export const MIN_TYPE_WEIGHT = 0.05;
export const MANDATORY: Kind[] = ["stock", "etf_equity", "etf_bond"];
/** Strumenti che si possono comprare a leva (il resto della leva è nei futures e negli ETP). */
export const MARGIN_KINDS: Kind[] = ["stock", "etf_equity", "etf_bond", "etf_other"];
export const levOf = (p: Position) => (MARGIN_KINDS.includes(p.kind) ? p.leverage || 1 : 1);
const EPS = 0.01;

export function fxRate(fx: Fx, ccy: string) {
  if (ccy === "EUR") return 1;
  const r = fx[ccy];
  if (!r || !isFinite(r)) throw new Error(`Cambio EUR/${ccy} non disponibile`);
  return r;
}

function priceOf(prices: Prices, symbol: string) {
  const p = prices[symbol];
  if (p === undefined || p === null || !isFinite(p)) throw new Error(`Prezzo di ${symbol} non disponibile`);
  return p;
}

/** Controvalore in euro (per i futures: esposizione nozionale). */
export function notional(pos: Position, price: number, fx: Fx) {
  return (pos.qty * pos.multiplier * price) / fxRate(fx, pos.currency);
}

/** Quanto vale la posizione nel portafoglio. Comprata a leva: esposizione meno prestito.
 *  Un future vale il suo margine;
 *  con live=true si aggiunge il guadagno/perdita maturato dall'ultimo venerdì. */
export function positionValue(pos: Position, prices: Prices, fx: Fx, live = false) {
  const price = priceOf(prices, pos.symbol);
  if (pos.kind !== "future") return notional(pos, price, fx) - (pos.debt ?? 0);
  if (!live || pos.refPrice === null) return pos.margin;
  return pos.margin + (pos.qty * pos.multiplier * (price - pos.refPrice)) / fxRate(fx, pos.currency);
}

export function valuePortfolio(positions: Position[], cash: number, prices: Prices, fx: Fx, live = false) {
  const byKind: Partial<Record<Kind, number>> = {};
  let invested = 0;
  for (const p of positions) {
    const v = positionValue(p, prices, fx, live);
    byKind[p.kind] = (byKind[p.kind] ?? 0) + v;
    invested += v;
  }
  return { total: cash + invested, cash, invested, byKind };
}

export type LineupResult = {
  positions: Position[];
  cash: number;
  total: number;
  sold: number; // vendite che contano nel 50%
  saleLimit: number; // Infinity nella prima finestra
  changed: boolean;
  weights: Partial<Record<Kind, number>>;
  errors: string[]; // bloccano il salvataggio
  warnings: string[]; // si può salvare, ma alla chiusura il book deve essere a posto
};

const key = (p: Position) => p.symbol;

/** Applica la formazione `target` al portafoglio attivo ai prezzi del venerdì
 *  e controlla tutte le regole della finestra. */
export function applyLineup(
  active: Position[],
  cash0: number,
  target: Position[],
  prices: Prices,
  fx: Fx,
  opts: { first: boolean },
): LineupResult {
  const errors: string[] = [];
  const before = valuePortfolio(active, cash0, prices, fx);
  const oldBy = new Map(active.map((p) => [key(p), p]));
  const seen = new Set<string>();
  let cash = cash0;
  let sold = 0;
  let changed = false;
  const out: Position[] = [];

  for (const t of target) {
    if (seen.has(key(t))) {
      errors.push(`${t.symbol} compare due volte`);
      continue;
    }
    seen.add(key(t));
    errors.push(...checkInstrument(t));
    const old = oldBy.get(key(t));
    const price = priceOf(prices, t.symbol);

    if (t.kind === "future") {
      const r = moveFuture(old, t, price, fx);
      cash += r.cashDelta;
      sold += r.released;
      if (r.changed) changed = true;
      if (r.position) out.push(r.position);
      continue;
    }

    const oldQty = old?.qty ?? 0;
    const oldDebt = old?.debt ?? 0;
    const lev = levOf(t);
    const same = old && Math.abs(t.qty - oldQty) <= 1e-9 && Math.abs(levOf(old) - lev) <= 1e-9;
    if (same) {
      out.push({ ...t, leverage: old.leverage, margin: 0, refPrice: null, debt: oldDebt });
      continue;
    }
    changed = true;
    // Comprare a leva L: metti 1/L di capitale tuo, il resto è prestito (senza interessi).
    // Se cambi quantità o leva, il prestito si ricalcola su tutta la posizione.
    const unit = (t.multiplier * price) / fxRate(fx, t.currency);
    const debt = Math.max(0, t.qty) * unit * (1 - 1 / lev);
    const oldNet = oldQty * unit - oldDebt;
    const newNet = t.qty * unit - debt;
    if (newNet < oldNet) sold += oldNet - newNet;
    cash -= newNet - oldNet;
    if (t.qty > 1e-9) out.push({ ...t, margin: 0, refPrice: null, debt });
  }

  // Posizioni attive non più presenti nella formazione: vendute per intero.
  for (const old of active) {
    if (seen.has(key(old))) continue;
    changed = true;
    if (old.kind === "future") {
      cash += old.margin;
      sold += old.margin;
    } else {
      const v = positionValue(old, prices, fx);
      cash += v;
      sold += v;
    }
  }

  // Le vendite per riportare il cash a zero non contano nel 50%.
  const exempt = Math.max(0, -cash0);
  const saleLimit = opts.first ? Infinity : MAX_SALE_SHARE * (before.total - cash0) + exempt;
  if (sold > saleLimit + EPS) {
    errors.push(`Vendite per ${fmt(sold)} €: il massimo in questa finestra è ${fmt(saleLimit)} €`);
  }
  if (cash < -EPS) errors.push(`Cash insufficiente: mancano ${fmt(-cash)} €`);

  const warnings: string[] = [];
  const after = valuePortfolio(out, cash, prices, fx);
  const weights: Partial<Record<Kind, number>> = {};
  for (const k of Object.keys(after.byKind) as Kind[]) weights[k] = (after.byKind[k] ?? 0) / after.total;
  if (changed || opts.first) {
    for (const k of MANDATORY) {
      if ((weights[k] ?? 0) < MIN_TYPE_WEIGHT - 1e-6) {
        warnings.push(`${KIND_LABEL[k]}: serve almeno il 5% del portafoglio (ora ${pct(weights[k] ?? 0)})`);
      }
    }
  }

  return { positions: out, cash, total: after.total, sold, saleLimit, changed, weights, errors, warnings };
}

function moveFuture(old: Position | undefined, t: Position, price: number, fx: Fx) {
  const oldQty = old?.qty ?? 0;
  const newQty = t.qty;
  const exposure = (q: number) => Math.abs((q * t.multiplier * price) / fxRate(fx, t.currency));
  const base = { ...t, refPrice: price };
  if (Math.abs(newQty - oldQty) < 1e-12 && old) {
    return { cashDelta: 0, released: 0, changed: false, position: { ...old, name: t.name } };
  }
  const sameSide = old && Math.sign(oldQty) === Math.sign(newQty);
  if (sameSide && Math.abs(newQty) >= Math.abs(oldQty)) {
    // Aumento: si blocca il margine solo sulla parte nuova. Il prezzo di
    // riferimento della parte vecchia è già il venerdì (regolamento appena fatto).
    const added = MARGIN * (exposure(newQty) - exposure(oldQty));
    return { cashDelta: -added, released: 0, changed: true, position: { ...base, margin: old!.margin + added } };
  }
  if (sameSide) {
    // Riduzione: torna nel cash la quota di margine della parte chiusa.
    const keep = old!.margin * (Math.abs(newQty) / Math.abs(oldQty));
    const released = old!.margin - keep;
    return { cashDelta: released, released, changed: true, position: { ...base, margin: keep } };
  }
  // Apertura nuova o cambio di lato: si chiude la vecchia e si apre la nuova.
  const released = old?.margin ?? 0;
  const margin = MARGIN * exposure(newQty);
  const position = Math.abs(newQty) > 1e-12 ? { ...base, margin } : null;
  return { cashDelta: released - margin, released, changed: true, position };
}

export function checkInstrument(t: Position): string[] {
  const e: string[] = [];
  if (!isFinite(t.qty)) e.push(`${t.symbol}: quantità non valida`);
  if (t.kind !== "future" && t.qty < 0) e.push(`${t.symbol}: niente vendite allo scoperto (usa futures, ETP inversi o put)`);
  if (t.kind === "option" && t.qty < 0) e.push(`${t.symbol}: le opzioni si possono solo comprare`);
  if (t.kind === "etp" && (Math.abs(t.leverage) > MAX_LEVERAGE || t.leverage === 0)) {
    e.push(`${t.symbol}: leva massima ${MAX_LEVERAGE}x`);
  }
  if (MARGIN_KINDS.includes(t.kind) && !(t.leverage >= 1 && t.leverage <= MAX_LEVERAGE)) {
    e.push(`${t.symbol}: la leva va da 1x a ${MAX_LEVERAGE}x`);
  }
  if (/bitcoin|ethereum|crypto|\bbtc\b|\beth\b|solana|ripple|\bxrp\b/i.test(`${t.symbol} ${t.name}`)) {
    e.push(`${t.symbol}: niente crypto`);
  }
  return e;
}

export type LedgerEntry = { symbol: string; kind: "futures_pnl" | "dividend" | "option_expiry" | "forced_sale" | "interest"; amount: number; note: string };

/** Regolamento del venerdì: P&L dei futures, opzioni scadute, dividendi. */
export function settle(
  positions: Position[],
  cash: number,
  closes: Prices,
  fx: Fx,
  dividends: Record<string, number>, // dividendo per quota in valuta locale, staccato nella settimana
  date: string,
) {
  const ledger: LedgerEntry[] = [];
  const out: Position[] = [];
  for (const p of positions) {
    if (p.kind === "future") {
      const price = priceOf(closes, p.symbol);
      const ref = p.refPrice ?? price;
      const pnl = (p.qty * p.multiplier * (price - ref)) / fxRate(fx, p.currency);
      if (Math.abs(pnl) > 1e-9) ledger.push({ symbol: p.symbol, kind: "futures_pnl", amount: pnl, note: `${ref} → ${price}` });
      cash += pnl;
      out.push({ ...p, refPrice: price });
      continue;
    }
    if (p.kind === "option" && p.expiry && p.expiry <= date) {
      const s = priceOf(closes, p.underlying ?? "");
      const intrinsic = Math.max(0, p.optType === "C" ? s - (p.strike ?? 0) : (p.strike ?? 0) - s);
      const amount = (p.qty * p.multiplier * intrinsic) / fxRate(fx, p.currency);
      ledger.push({ symbol: p.symbol, kind: "option_expiry", amount, note: `scadenza, sottostante ${s}` });
      cash += amount;
      continue;
    }
    const div = dividends[p.symbol];
    if (div && p.kind !== "option") {
      const amount = (p.qty * div) / fxRate(fx, p.currency);
      ledger.push({ symbol: p.symbol, kind: "dividend", amount, note: `${div} ${p.currency} per quota` });
      cash += amount;
    }
    if ((p.debt ?? 0) > 0) {
      const amount = -((p.debt ?? 0) * LOAN_RATE) / 52;
      ledger.push({ symbol: p.symbol, kind: "interest", amount, note: `interessi ${LOAN_RATE * 100}% annuo sul prestito` });
      cash += amount;
    }
    out.push(p);
  }
  return { positions: out, cash, ledger };
}

/** Vendita forzata in proporzione da tutte le posizioni per riportare il cash a zero. */
export function forcedSale(positions: Position[], cash: number, prices: Prices, fx: Fx) {
  if (cash >= 0) return { positions, cash, ledger: [] as LedgerEntry[] };
  const need = -cash;
  const { invested } = valuePortfolio(positions, 0, prices, fx);
  if (invested <= 0) return { positions, cash, ledger: [] as LedgerEntry[] };
  const f = Math.min(1, need / invested);
  const ledger: LedgerEntry[] = [];
  const out = positions
    .map((p) => {
      const v = positionValue(p, prices, fx);
      ledger.push({ symbol: p.symbol, kind: "forced_sale", amount: v * f, note: `vendita forzata ${pct(f)}` });
      return { ...p, qty: p.qty * (1 - f), margin: p.margin * (1 - f), debt: (p.debt ?? 0) * (1 - f) };
    })
    .filter((p) => Math.abs(p.qty) > 1e-12);
  return { positions: out, cash: cash + invested * f, ledger };
}

export const fmt = (n: number) =>
  isFinite(n) ? n.toLocaleString("it-IT", { maximumFractionDigits: 0 }) : "∞";
export const pct = (n: number) => `${(n * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
