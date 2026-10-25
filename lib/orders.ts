// Operazioni di una finestra: differenza tra il book attivo e quello dopo gli ordini.
import { notional, positionValue, levOf, type Fx, type Kind, type Position, type Prices } from "./rules.ts";

export type Order = {
  symbol: string;
  name: string;
  kind: Kind;
  side: "BUY" | "SELL";
  qtyBefore: number;
  qtyAfter: number;
  price: number | null; // chiusura del venerdì, valuta locale
  currency: string;
  amount: number; // euro: positivo = cash impegnato, negativo = cash liberato
  exposure: number; // esposizione dopo l'ordine, in euro
  leverage: number; // leva dopo l'ordine (azioni ed ETF)
  debt: number; // prestito dopo l'ordine
  margin: number; // margine dopo l'ordine (futures)
};

export function diffOrders(active: Position[], after: Position[], prices: Prices, fx: Fx): Order[] {
  const val = (p?: Position) => { try { return p ? positionValue(p, prices, fx) : 0; } catch { return 0; } };
  const exp = (p?: Position) => { try { return p ? Math.abs(notional(p, prices[p.symbol], fx)) : 0; } catch { return 0; } };
  const a = new Map(active.map((p) => [p.symbol, p]));
  const b = new Map(after.map((p) => [p.symbol, p]));
  const out: Order[] = [];
  for (const symbol of new Set([...a.keys(), ...b.keys()])) {
    const before = a.get(symbol);
    const now = b.get(symbol);
    const amount = val(now) - val(before);
    const qtyBefore = before?.qty ?? 0;
    const qtyAfter = now?.qty ?? 0;
    const levChanged = before && now && levOf(before) !== levOf(now);
    if (Math.abs(qtyAfter - qtyBefore) < 1e-9 && !levChanged) continue;
    const p = (now ?? before)!;
    out.push({
      symbol,
      name: p.name,
      kind: p.kind,
      side: p.kind === "future"
        ? (Math.abs(qtyAfter) > Math.abs(qtyBefore) ? qtyAfter > 0 : qtyBefore < 0) ? "BUY" : "SELL"
        : amount >= 0 ? "BUY" : "SELL",
      qtyBefore,
      qtyAfter,
      price: prices[symbol] ?? null,
      currency: p.currency,
      amount,
      exposure: exp(now),
      leverage: now ? levOf(now) : 1,
      debt: now?.debt ?? 0,
      margin: now?.margin ?? 0,
    });
  }
  return out.sort((x, y) => Math.abs(y.amount) - Math.abs(x.amount));
}
