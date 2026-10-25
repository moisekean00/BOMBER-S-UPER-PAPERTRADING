import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { history, myBook } from "@/lib/analytics";
import { liveFx } from "@/lib/prices";
import { notional, positionValue, type Fx } from "@/lib/rules";
import { alignedReturns, annualVol, beta, bookIndex, correlation, maxDD, rebase, returns, var95 } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BENCHMARKS: Record<string, string> = { "^GSPC": "S&P 500", "FTSEMIB.MI": "FTSE MIB", "^STOXX50E": "Euro Stoxx 50" };

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "3m";
  const book = await myBook(user.id, url.searchParams.get("book") ?? undefined);
  const held = [...new Set(book.positions.map((p) => p.symbol))].slice(0, 30);
  const { dates, series } = await history([...held, ...Object.keys(BENCHMARKS)], range);
  const fx: Fx = await liveFx(book.positions.map((p) => p.currency)).catch(() => ({}));

  // Pesi di oggi: esposizione (con segno) su NAV, all'ultimo prezzo della serie.
  const last: Record<string, number> = {};
  for (const s of held) {
    const v = [...(series[s] ?? [])].reverse().find((x) => x !== null);
    if (v) last[s] = v;
  }
  let nav = book.cash;
  const weights: Record<string, number> = {};
  const exposure: Record<string, number> = {};
  for (const p of book.positions) {
    try {
      nav += positionValue(p, last, fx, true);
      exposure[p.symbol] = notional(p, last[p.symbol], fx);
    } catch {}
  }
  for (const [s, e] of Object.entries(exposure)) weights[s] = nav > 0 ? e / nav : 0;

  const bookSeries = bookIndex(Object.fromEntries(held.map((s) => [s, series[s] ?? []])), weights, dates.length);
  const bench = alignedReturns(series["^GSPC"] ?? []);
  const stat = (s: (number | null)[]) => {
    const r = returns(s);
    const first = s.find((v) => v !== null), lastV = [...s].reverse().find((v) => v !== null);
    return {
      ret: first && lastV ? lastV / first - 1 : null,
      vol: annualVol(r),
      beta: beta(alignedReturns(s), bench),
      maxdd: maxDD(s),
    };
  };
  const perSymbol = Object.fromEntries(held.map((s) => [s, { ...stat(series[s] ?? []), weight: weights[s] ?? 0 }]));
  const top = [...held].sort((a, b) => Math.abs(weights[b] ?? 0) - Math.abs(weights[a] ?? 0)).slice(0, 10);
  const ar = Object.fromEntries(top.map((s) => [s, alignedReturns(series[s] ?? [])]));
  const corr = top.map((a) => top.map((b) => (a === b ? 1 : correlation(ar[a], ar[b]))));
  const bookStats = stat(bookSeries);
  const v95 = var95(returns(bookSeries));

  return NextResponse.json({
    source: book.source,
    hasDraft: book.hasDraft,
    nav,
    dates,
    lines: Object.fromEntries([...held, ...Object.keys(BENCHMARKS)].map((s) => [s, rebase(series[s] ?? [])])),
    book: bookSeries,
    benchmarks: BENCHMARKS,
    perSymbol,
    corr: { symbols: top, matrix: corr },
    bookStats: { ...bookStats, var95: v95, var95Eur: v95 === null ? null : v95 * nav },
    names: Object.fromEntries(book.positions.map((p) => [p.symbol, p.name])),
  });
}
