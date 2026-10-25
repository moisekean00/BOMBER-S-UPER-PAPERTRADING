// Statistiche di portafoglio per la classifica. Funzioni pure.
import { notional, positionValue, type Fx, type Position, type Prices } from "./rules.ts";

export type Snapshot = { date: string; total: number };

/** Rendimenti settimanali dalla serie dei NAV del venerdì. */
export function weeklyReturns(history: Snapshot[]) {
  const out: number[] = [];
  for (let i = 1; i < history.length; i++) out.push(history[i].total / history[i - 1].total - 1);
  return out;
}

export function volatility(returns: number[]) {
  if (returns.length < 2) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const v = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  return Math.sqrt(v) * Math.sqrt(52); // annualizzata
}

export function sharpe(returns: number[]) {
  const vol = volatility(returns);
  if (!vol) return null;
  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  return (mean * 52) / vol; // tasso privo di rischio a zero, come da regolamento (niente interessi)
}

export function maxDrawdown(history: Snapshot[]) {
  let peak = -Infinity;
  let dd = 0;
  for (const s of history) {
    peak = Math.max(peak, s.total);
    dd = Math.min(dd, s.total / peak - 1);
  }
  return history.length ? dd : null;
}

/** Esposizione lorda su NAV: futures al nozionale, ETP moltiplicati per la leva. */
export function grossLeverage(positions: Position[], nav: number, prices: Prices, fx: Fx) {
  if (nav <= 0) return null;
  let gross = 0;
  for (const p of positions) {
    try {
      const price = prices[p.symbol];
      if (price === undefined) continue;
      if (p.kind === "future") gross += Math.abs(notional(p, price, fx));
      else if (p.kind === "etp") gross += Math.abs(notional(p, price, fx) * p.leverage);
      else gross += Math.abs(notional(p, price, fx));
    } catch {}
  }
  return gross / nav;
}

/** Peso della posizione più grande. */
export function topWeight(positions: Position[], nav: number, prices: Prices, fx: Fx) {
  let best: { symbol: string; weight: number } | null = null;
  for (const p of positions) {
    try {
      const w = positionValue(p, prices, fx, true) / nav;
      if (!best || w > best.weight) best = { symbol: p.symbol, weight: w };
    } catch {}
  }
  return best;
}

/** Miglior titolo da venerdì: variazione del prezzo rispetto alla chiusura ufficiale. */
export function topPick(positions: Position[], live: Prices, ref: Prices, daily: Record<string, number | null>) {
  let best: { symbol: string; move: number } | null = null;
  for (const p of positions) {
    const now = live[p.symbol];
    const then = ref[p.symbol];
    let move: number | null = now && then ? now / then - 1 : daily[p.symbol] != null ? daily[p.symbol]! / 100 : null;
    if (move === null) continue;
    if (p.kind === "future" && p.qty < 0) move = -move;
    if (!best || move > best.move) best = { symbol: p.symbol, move };
  }
  return best;
}
