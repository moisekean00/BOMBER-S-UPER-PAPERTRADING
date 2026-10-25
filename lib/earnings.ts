import "server-only";
import YahooFinance from "yahoo-finance2";
import type { MarketEvent } from "./events";
import { areaOf } from "./area";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// Le società più pesanti per il mercato, più quelle in portafoglio ai giocatori.
export const WATCHLIST = [
  // USA
  "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "WMT", "HD", "CRM", "AVGO", "ORCL", "ADBE", "MU", "COST", "DIS", "CSCO", "AMAT", "INTU", "DELL", "LOW", "TGT",
  // Italia
  "UCG.MI", "ISP.MI", "ENEL.MI", "ENI.MI", "STLAM.MI", "RACE.MI", "G.MI", "LDO.MI", "MB.MI", "PST.MI", "TIT.MI", "BAMI.MI", "MONC.MI",
  // Europa
  "ASML.AS", "SAP.DE", "SIE.DE", "ALV.DE", "MC.PA", "AIR.PA", "NOVO-B.CO", "NESN.SW", "SHEL.L", "HSBA.L", "BNP.PA", "SAN.MC",
  // Asia
  "2330.TW", "BABA", "JD", "PDD", "BIDU", "0700.HK", "7203.T", "6758.T", "9984.T", "005930.KS", "1810.HK",
];

let cache: { at: number; key: string; events: MarketEvent[] } | null = null;

export async function earningsEvents(extra: string[], from: string, to: string): Promise<MarketEvent[]> {
  const symbols = [...new Set([...WATCHLIST, ...extra])].slice(0, 100);
  const key = symbols.join(",");
  if (cache && cache.key === key && Date.now() - cache.at < 6 * 3600_000) return cache.events;
  const out: MarketEvent[] = [];
  // A gruppi di 10 per non farsi limitare da Yahoo.
  for (let i = 0; i < symbols.length; i += 10) await Promise.all(
    symbols.slice(i, i + 10).map(async (symbol) => {
      try {
        const r = (await yf.quoteSummary(symbol, { modules: ["calendarEvents", "price"] }, { validateResult: false })) as any;
        const dates: Date[] = r.calendarEvents?.earnings?.earningsDate ?? [];
        const d = dates[0] ? new Date(dates[0]).toISOString().slice(0, 10) : null;
        if (!d || d < from || d > to) return;
        out.push({
          date: d,
          kind: "trimestrali",
          area: areaOf(symbol),
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
