import "server-only";
import YahooFinance from "yahoo-finance2";
import { normalize } from "./prices";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// I titoli di cui si parla: scelti a mano per area e tema, più i trending di Yahoo.
export const STAR_GROUPS: { id: string; title: string; note: string; symbols: string[] }[] = [
  { id: "mag7", title: "Magnifiche 7", note: "Le big tech che fanno da sole un terzo dell'S&P 500", symbols: ["NVDA", "MSFT", "AAPL", "AMZN", "GOOGL", "META", "TSLA"] },
  { id: "ai", title: "AI e semiconduttori", note: "Chi vende le pale nella corsa all'oro dell'intelligenza artificiale", symbols: ["AVGO", "TSM", "AMD", "ASML.AS", "PLTR", "ARM", "MU", "ORCL"] },
  { id: "momentum", title: "Momentum USA", note: "Growth ad alta beta, le più seguite dai trader retail", symbols: ["NFLX", "UBER", "SHOP", "NET", "RDDT", "HOOD", "CRWD", "LLY"] },
  { id: "italia", title: "Piazza Affari", note: "Le big del FTSE MIB", symbols: ["RACE.MI", "UCG.MI", "ISP.MI", "ENI.MI", "ENEL.MI", "LDO.MI", "STLAM.MI", "PRY.MI"] },
  { id: "europa", title: "Campioni europei", note: "Lusso, difesa, farmaceutica e software", symbols: ["SAP.DE", "MC.PA", "RHM.DE", "NOVO-B.CO", "SIE.DE", "AIR.PA", "NESN.SW", "SHEL.L"] },
  { id: "asia", title: "Asia", note: "Tech cinese, Giappone e Corea", symbols: ["BABA", "0700.HK", "1810.HK", "7203.T", "6758.T", "9984.T", "005930.KS", "PDD"] },
  { id: "etf", title: "ETF da torneo", note: "Per coprire i minimi del 5%: azionari e obbligazionari", symbols: ["VWCE.DE", "SXR8.DE", "IWDA.AS", "EQQQ.DE", "AGGH.MI", "IBGL.MI"] },
];

export type Star = {
  symbol: string;
  name: string;
  price: number | null;
  currency: string;
  change: number | null; // % giornaliera
  marketCap: number | null;
  low52: number | null;
  high52: number | null;
  quoteType: string;
  exchange: string;
};

const cache = new Map<string, { at: number; value: unknown }>();
async function cached<T>(k: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;
  const value = await fn();
  cache.set(k, { at: Date.now(), value });
  return value;
}

function toStar(q: any): Star {
  const cur = q.currency ?? "USD";
  const n = (v: any) => (typeof v === "number" && isFinite(v) ? v : null);
  const p = n(q.regularMarketPrice);
  const scale = (v: number | null) => (v === null ? null : normalize(v, cur).price);
  return {
    symbol: q.symbol,
    name: q.shortName ?? q.longName ?? q.symbol,
    price: scale(p),
    currency: normalize(0, cur).currency,
    change: n(q.regularMarketChangePercent),
    marketCap: n(q.marketCap),
    low52: scale(n(q.fiftyTwoWeekLow)),
    high52: scale(n(q.fiftyTwoWeekHigh)),
    quoteType: q.quoteType ?? "",
    exchange: q.fullExchangeName ?? q.exchange ?? "",
  };
}

async function quoteMany(symbols: string[]): Promise<Star[]> {
  if (!symbols.length) return [];
  const res = (await yf.quote(symbols, { return: "array" }, { validateResult: false })) as any[];
  return res.map(toStar);
}

async function screen(id: "day_gainers" | "day_losers" | "most_actives"): Promise<Star[]> {
  try {
    const r = (await yf.screener({ scrIds: id, count: 8 }, undefined, { validateResult: false })) as any;
    return ((r.quotes ?? []) as any[]).filter((q) => (q.marketCap ?? 0) > 2e9).slice(0, 6).map(toStar);
  } catch {
    return [];
  }
}

async function trending(region: string): Promise<string[]> {
  try {
    const r = (await yf.trendingSymbols(region, { count: 12 }, { validateResult: false })) as any;
    return ((r.quotes ?? []) as any[]).map((q) => q.symbol as string).filter((s) => !/-USD$|=X$|^\^/.test(s));
  } catch {
    return [];
  }
}

/** Tutto quello che serve alla pagina Star, aggiornato ogni 2 minuti. */
export async function stars() {
  return cached("stars", 120_000, async () => {
    const all = [...new Set(STAR_GROUPS.flatMap((g) => g.symbols))];
    const [base, trendUS, trendIT, gainers, losers, actives] = await Promise.all([
      quoteMany(all).catch(() => [] as Star[]),
      trending("US"),
      trending("IT"),
      screen("day_gainers"),
      screen("day_losers"),
      screen("most_actives"),
    ]);
    const trendSyms = [...new Set([...trendIT, ...trendUS])].slice(0, 12);
    const trend = await quoteMany(trendSyms.filter((s) => !all.includes(s))).catch(() => [] as Star[]);
    const bySym = new Map([...base, ...trend].map((s) => [s.symbol, s]));
    return {
      groups: STAR_GROUPS.map((g) => ({ ...g, stars: g.symbols.map((s) => bySym.get(s)).filter((s): s is Star => !!s) })),
      trending: trendSyms.map((s) => bySym.get(s)).filter((s): s is Star => !!s && s.quoteType !== "CRYPTOCURRENCY"),
      gainers,
      losers,
      actives,
      at: new Date().toISOString(),
    };
  });
}
