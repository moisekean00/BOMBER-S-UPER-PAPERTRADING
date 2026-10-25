import "server-only";
import YahooFinance from "yahoo-finance2";
import type { Kind } from "./rules";
import { addDays } from "./calendar";

// Fonte prezzi: Yahoo Finance (gratis, ~15 minuti di ritardo, copre azioni,
// ETF, futures e opzioni di quasi tutte le borse).
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Alcune borse quotano in centesimi (Londra GBp, Johannesburg ZAc, Tel Aviv ILA).
const MINOR: Record<string, string> = { GBp: "GBP", GBX: "GBP", ZAc: "ZAR", ILA: "ILS" };
export function normalize(price: number, currency: string) {
  const major = MINOR[currency];
  return major ? { price: price / 100, currency: major } : { price, currency: (currency || "USD").toUpperCase() };
}

export type Quote = {
  symbol: string;
  name: string;
  price: number;
  changePct: number | null;
  currency: string;
  quoteType: string;
  marketState: string | null;
};

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(k: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(k, { at: Date.now(), value });
  return value;
}

export async function quotes(symbols: string[]): Promise<Quote[]> {
  const uniq = [...new Set(symbols.filter(Boolean))];
  if (!uniq.length) return [];
  return cached(`q:${uniq.sort().join(",")}`, 60_000, async () => {
    const res = await yf.quote(uniq, { return: "array" }, { validateResult: false });
    return (res as Record<string, any>[]).map((q) => {
      const n = normalize(q.regularMarketPrice ?? 0, q.currency ?? "USD");
      return {
        symbol: q.symbol,
        name: q.shortName ?? q.longName ?? q.symbol,
        price: n.price,
        changePct: q.regularMarketChangePercent ?? null,
        currency: n.currency,
        quoteType: q.quoteType ?? "",
        marketState: q.marketState ?? null,
      };
    });
  });
}

/** Ultima chiusura ufficiale disponibile fino a `date` compreso. */
export async function closeOn(symbol: string, date: string) {
  return cached(`c:${symbol}:${date}`, 6 * 3600_000, async () => {
    const r = await yf.chart(
      symbol,
      { period1: addDays(date, -10), period2: addDays(date, 2), interval: "1d", events: "div" },
      { validateResult: false },
    ) as any;
    const offset = r.meta?.gmtoffset ?? 0;
    const bars = (r.quotes ?? [])
      .filter((q: any) => q.close !== null && q.close !== undefined)
      .map((q: any) => ({ day: new Date(new Date(q.date).getTime() + offset * 1000).toISOString().slice(0, 10), close: q.close }))
      .filter((b: any) => b.day <= date);
    const last = bars.at(-1);
    if (!last) throw new Error(`Nessuna chiusura per ${symbol} al ${date}`);
    const n = normalize(last.close, r.meta?.currency ?? "USD");
    return { ...n, day: last.day as string, name: (r.meta?.shortName ?? r.meta?.longName ?? symbol) as string, quoteType: (r.meta?.instrumentType ?? "") as string };
  });
}

/** Dividendi per quota staccati nel periodo (from, to]. */
export async function dividendsBetween(symbol: string, from: string, to: string) {
  const r = await yf.chart(symbol, { period1: addDays(from, 1), period2: addDays(to, 1), interval: "1d", events: "div" }, { validateResult: false }) as any;
  const divs: { amount: number; date: Date }[] = r.events?.dividends ?? [];
  const sum = divs
    .filter((d) => { const day = new Date(d.date).toISOString().slice(0, 10); return day > from && day <= to; })
    .reduce((s, d) => s + d.amount, 0);
  return normalize(sum, r.meta?.currency ?? "USD").price;
}

/** Unità di valuta per 1 EUR alla chiusura di `date`. */
export async function fxOn(currency: string, date: string) {
  if (currency === "EUR") return 1;
  return (await closeOn(`EUR${currency}=X`, date)).price;
}

export async function liveFx(currencies: string[]) {
  const list = [...new Set(currencies)].filter((c) => c !== "EUR");
  const q = await quotes(list.map((c) => `EUR${c}=X`));
  const out: Record<string, number> = {};
  for (const c of list) {
    const hit = q.find((x) => x.symbol === `EUR${c}=X`);
    if (hit) out[c] = hit.price;
  }
  return out;
}

const ALLOWED_TYPES = ["EQUITY", "ETF", "FUTURE", "OPTION"];

export async function search(query: string) {
  const r = await yf.search(query, { quotesCount: 12, newsCount: 0 }, { validateResult: false }) as any;
  return ((r.quotes ?? []) as any[])
    .filter((q) => q.isYahooFinance && ALLOWED_TYPES.includes(q.quoteType))
    .map((q) => ({
      symbol: q.symbol as string,
      name: (q.longname ?? q.shortname ?? q.symbol) as string,
      quoteType: q.quoteType as string,
      exchange: (q.exchDisp ?? q.exchange) as string,
    }));
}

export async function optionChain(symbol: string, date?: string) {
  const r = await yf.options(symbol, date ? { date } : {}, { validateResult: false }) as any;
  const chain = r.options?.[0];
  const map = (o: any, t: "C" | "P") => ({
    symbol: o.contractSymbol as string,
    strike: o.strike as number,
    type: t,
    last: o.lastPrice as number,
    bid: (o.bid ?? null) as number | null,
    ask: (o.ask ?? null) as number | null,
    expiry: new Date(o.expiration).toISOString().slice(0, 10),
    currency: (o.currency ?? r.quote?.currency ?? "USD") as string,
  });
  return {
    underlying: r.underlyingSymbol as string,
    underlyingPrice: (r.quote?.regularMarketPrice ?? null) as number | null,
    expirations: ((r.expirationDates ?? []) as any[]).map((d) => new Date(d).toISOString().slice(0, 10)),
    calls: (chain?.calls ?? []).map((o: any) => map(o, "C")),
    puts: (chain?.puts ?? []).map((o: any) => map(o, "P")),
  };
}

/** Il tipo dichiarato dal giocatore deve essere coerente con Yahoo. */
export function kindMatches(kind: Kind, quoteType: string) {
  const t = quoteType.toUpperCase();
  if (kind === "stock") return t === "EQUITY";
  if (kind === "future") return t === "FUTURE";
  if (kind === "option") return t === "OPTION";
  return t === "ETF" || t === "EQUITY"; // molti ETP/ETC europei risultano EQUITY
}

/** Opzioni in formato OCC: AAPL261218C00250000. */
export function parseOcc(symbol: string) {
  const m = symbol.match(/^([A-Z.\-^]+)(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/);
  if (!m) return null;
  return {
    underlying: m[1],
    expiry: `20${m[2]}-${m[3]}-${m[4]}`,
    optType: m[5] as "C" | "P",
    strike: Number(m[6]) / 1000,
  };
}
