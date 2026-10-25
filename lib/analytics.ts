import "server-only";
import YahooFinance from "yahoo-finance2";
import { adminClient } from "./supabase/server";
import { toPosition } from "./db";
import { currentWindow } from "./calendar";
import { normalize } from "./prices";
import type { Position } from "./rules";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(k: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as T;
  const value = await fn();
  cache.set(k, { at: Date.now(), value });
  return value;
}

async function inBatches<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>) {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

/** Il book da analizzare: quello dopo gli ordini se la finestra è aperta e ci sono ordini, altrimenti l'attivo. */
export async function myBook(userId: string, which?: string) {
  const db = adminClient();
  const w = currentWindow();
  const [{ data: rows }, { data: profile }, { data: draft }] = await Promise.all([
    db.from("positions").select("*").eq("user_id", userId),
    db.from("profiles").select("cash").eq("id", userId).single(),
    w ? db.from("lineups").select("*").eq("user_id", userId).eq("window_id", w.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const active = { positions: (rows ?? []).map(toPosition), cash: Number(profile?.cash ?? 0) };
  const pending = draft ? { positions: draft.positions as Position[], cash: Number(draft.cash) } : null;
  const useDraft = pending && which !== "attivo";
  return { ...(useDraft ? pending! : active), source: useDraft ? ("ordini" as const) : ("attivo" as const), hasDraft: !!pending };
}

export const RANGES: Record<string, number> = { "1m": 31, "3m": 92, "6m": 183, "1y": 366, "ytd": 0 };

/** Chiusure giornaliere allineate per data (riempite col prezzo precedente). */
export async function history(symbols: string[], range: string) {
  const days = RANGES[range] ?? 92;
  const from = days ? new Date(Date.now() - days * 86400_000) : new Date(`${new Date().getUTCFullYear()}-01-01`);
  const key = `${range}:${[...symbols].sort().join(",")}`;
  return cached(key, 30 * 60_000, async () => {
    const raw = await inBatches(symbols, 8, async (s) => {
      try {
        const r = (await yf.chart(s, { period1: from, interval: "1d" }, { validateResult: false })) as any;
        const cur = r.meta?.currency ?? "USD";
        const pts = (r.quotes ?? [])
          .filter((q: any) => typeof q.close === "number")
          .map((q: any) => [new Date(q.date).toISOString().slice(0, 10), normalize(q.close, cur).price] as [string, number]);
        return [s, new Map<string, number>(pts)] as const;
      } catch {
        return [s, new Map<string, number>()] as const;
      }
    });
    const dates = [...new Set(raw.flatMap(([, m]) => [...m.keys()]))].sort();
    const series: Record<string, (number | null)[]> = {};
    for (const [s, m] of raw) {
      let last: number | null = null;
      series[s] = dates.map((d) => {
        const v = m.get(d);
        if (v !== undefined) last = v;
        return last;
      });
    }
    return { dates, series };
  });
}

export type Fundamentals = {
  symbol: string;
  name: string;
  sector: string | null;
  marketCap: number | null;
  currency: string | null;
  pe: number | null;
  forwardPe: number | null;
  priceToBook: number | null;
  evEbitda: number | null;
  dividendYield: number | null;
  beta: number | null;
  low52: number | null;
  high52: number | null;
  price: number | null;
  ytd: number | null;
  profitMargin: number | null;
  revenueGrowth: number | null;
  roe: number | null;
  target: number | null;
  recommendation: string | null;
  analysts: number | null;
};

const num = (v: any) => (typeof v === "number" && isFinite(v) ? v : typeof v?.raw === "number" ? v.raw : null);

export async function fundamentals(symbols: string[]): Promise<Fundamentals[]> {
  return inBatches(symbols, 8, (symbol) =>
    cached(`f:${symbol}`, 6 * 3600_000, async () => {
      try {
        const r = (await yf.quoteSummary(symbol, { modules: ["price", "summaryDetail", "defaultKeyStatistics", "financialData", "assetProfile"] }, { validateResult: false })) as any;
        const p = r.price ?? {}, d = r.summaryDetail ?? {}, k = r.defaultKeyStatistics ?? {}, f = r.financialData ?? {};
        return {
          symbol,
          name: p.shortName ?? p.longName ?? symbol,
          sector: r.assetProfile?.sector ?? (p.quoteType === "ETF" ? "ETF" : null),
          marketCap: num(p.marketCap) ?? num(d.totalAssets),
          currency: p.currency ?? null,
          pe: num(d.trailingPE),
          forwardPe: num(d.forwardPE) ?? num(k.forwardPE),
          priceToBook: num(k.priceToBook),
          evEbitda: num(k.enterpriseToEbitda),
          dividendYield: num(d.dividendYield) ?? num(d.yield) ?? num(d.trailingAnnualDividendYield),
          beta: num(d.beta) ?? num(k.beta) ?? num(k.beta3Year),
          low52: num(d.fiftyTwoWeekLow),
          high52: num(d.fiftyTwoWeekHigh),
          price: num(p.regularMarketPrice),
          ytd: num(k.ytdReturn),
          profitMargin: num(f.profitMargins) ?? num(k.profitMargins),
          revenueGrowth: num(f.revenueGrowth),
          roe: num(f.returnOnEquity),
          target: num(f.targetMeanPrice),
          recommendation: f.recommendationKey ?? null,
          analysts: num(f.numberOfAnalystOpinions),
        };
      } catch {
        return { symbol, name: symbol } as Fundamentals;
      }
    }),
  );
}

export type News = { id: string; title: string; publisher: string; link: string; time: string; tickers: string[] };

export async function news(symbols: string[]): Promise<News[]> {
  const lists = await inBatches(symbols, 6, (s) =>
    cached(`n:${s}`, 30 * 60_000, async () => {
      try {
        const r = (await yf.search(s, { quotesCount: 0, newsCount: 6 }, { validateResult: false })) as any;
        return ((r.news ?? []) as any[]).map((n) => ({
          id: n.uuid as string,
          title: n.title as string,
          publisher: n.publisher as string,
          link: n.link as string,
          time: new Date(n.providerPublishTime).toISOString(),
          tickers: ((n.relatedTickers ?? []) as string[]).length ? n.relatedTickers : [s],
        }));
      } catch {
        return [] as News[];
      }
    }),
  );
  const seen = new Set<string>();
  return lists.flat().filter((n) => n.link && !seen.has(n.id) && seen.add(n.id)).sort((a, b) => b.time.localeCompare(a.time));
}
