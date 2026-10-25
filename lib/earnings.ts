import "server-only";
import YahooFinance from "yahoo-finance2";
import type { MarketEvent } from "./events";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Le società più pesanti per il mercato, più quelle in portafoglio ai giocatori.
export const WATCHLIST = [
  "NVDA", "WMT", "HD", "CRM", "AVGO", "ORCL", "ADBE", "MU", "COST", "FDX", "NKE", "LULU", "MDT", "TGT", "LOW", "INTU", "DELL", "MRVL", "ZS", "SNOW",
];

let cache: { at: number; key: string; events: MarketEvent[] } | null = null;

export async function earningsEvents(extra: string[], from: string, to: string): Promise<MarketEvent[]> {
  const symbols = [...new Set([...WATCHLIST, ...extra])].slice(0, 60);
  const key = symbols.join(",");
  if (cache && cache.key === key && Date.now() - cache.at < 6 * 3600_000) return cache.events;
  const out: MarketEvent[] = [];
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const r = (await yf.quoteSummary(symbol, { modules: ["calendarEvents", "price"] }, { validateResult: false })) as any;
        const dates: Date[] = r.calendarEvents?.earnings?.earningsDate ?? [];
        const d = dates[0] ? new Date(dates[0]).toISOString().slice(0, 10) : null;
        if (!d || d < from || d > to) return;
        out.push({
          date: d,
          kind: "trimestrali",
          symbol,
          title: `${r.price?.shortName ?? symbol}: trimestrale`,
          note: r.calendarEvents?.earnings?.isEarningsDateEstimate ? "Data stimata" : undefined,
        });
      } catch {}
    }),
  );
  cache = { at: Date.now(), key, events: out };
  return out;
}
