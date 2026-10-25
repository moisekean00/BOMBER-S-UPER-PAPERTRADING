import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Position, Prices, Fx } from "./rules";
import { closeOn, fxOn, quotes } from "./prices";

export type Profile = {
  id: string;
  trader_name: string;
  cash: number;
  paid: boolean;
  is_admin: boolean;
  eliminated_on: string | null;
};

export function toPosition(r: any): Position {
  return {
    symbol: r.symbol,
    name: r.name,
    kind: r.kind,
    currency: r.currency,
    qty: Number(r.qty),
    multiplier: Number(r.multiplier),
    leverage: Number(r.leverage),
    margin: Number(r.margin),
    debt: Number(r.debt ?? 0),
    refPrice: r.ref_price === null ? null : Number(r.ref_price),
    expiry: r.expiry,
    underlying: r.underlying,
    strike: r.strike === null ? null : Number(r.strike),
    optType: r.opt_type,
  };
}

export function toRow(userId: string, p: Position) {
  return {
    user_id: userId,
    symbol: p.symbol,
    name: p.name,
    kind: p.kind,
    currency: p.currency,
    qty: p.qty,
    multiplier: p.multiplier,
    leverage: p.leverage,
    margin: p.margin,
    debt: p.debt ?? 0,
    ref_price: p.refPrice,
    expiry: p.expiry,
    underlying: p.underlying,
    strike: p.strike,
    opt_type: p.optType,
  };
}

export const toProfile = (r: any): Profile => ({ ...r, cash: Number(r.cash) });

/** Chiusura ufficiale salvata in archivio, così tutti usano lo stesso prezzo. */
export async function officialClose(db: SupabaseClient, symbol: string, date: string) {
  const { data } = await db.from("prices").select("close,currency").eq("symbol", symbol).eq("date", date).maybeSingle();
  if (data) return { price: Number(data.close), currency: data.currency as string };
  let c: { price: number; currency: string };
  try {
    c = await closeOn(symbol, date);
  } catch (err) {
    // Opzioni senza scambi: si usa l'ultimo prezzo disponibile (media domanda/offerta per Yahoo).
    const q = (await quotes([symbol]))[0];
    if (!q || !q.price) throw err;
    c = { price: q.price, currency: q.currency };
  }
  await db.from("prices").upsert({ symbol, date, close: c.price, currency: c.currency });
  return { price: c.price, currency: c.currency };
}

export async function officialFx(db: SupabaseClient, currency: string, date: string) {
  if (currency === "EUR") return 1;
  return (await officialClose(db, `EUR${currency}=X`, date)).price;
}

/** Prezzi e cambi ufficiali alla data per un elenco di posizioni. */
export async function pricesFor(db: SupabaseClient, positions: Position[], date: string) {
  const prices: Prices = {};
  const fx: Fx = {};
  const symbols = new Set<string>();
  for (const p of positions) {
    symbols.add(p.symbol);
    if (p.kind === "option" && p.underlying) symbols.add(p.underlying);
  }
  // Un prezzo mancante non blocca gli altri: l'errore emerge solo se serve davvero.
  await pool([...symbols], 6, async (s) => {
    try {
      prices[s] = (await officialClose(db, s, date)).price;
    } catch (err) {
      console.error(`prezzo ${s} ${date}`, err);
    }
  });
  await pool([...new Set(positions.map((p) => p.currency))], 6, async (c) => {
    fx[c] = await officialFx(db, c, date);
  });
  return { prices, fx };
}

export async function pool<T>(items: T[], size: number, fn: (t: T) => Promise<void>) {
  const queue = [...items];
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) await fn(queue.shift()!);
  }));
}

export { fxOn };
