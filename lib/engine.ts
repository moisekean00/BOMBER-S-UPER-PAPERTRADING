import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { WINDOWS, VALUATION_DATES, valuationTime, START_CAPITAL, type Window } from "./calendar";
import { adminClient } from "./supabase/server";
import { pool, pricesFor, toPosition, toRow } from "./db";
import { dividendsBetween } from "./prices";
import { settle, forcedSale, valuePortfolio, type Position, type LedgerEntry } from "./rules";

const STALE_MS = 5 * 60_000;
const DIVIDEND_KINDS = new Set(["stock", "etf_equity", "etf_bond", "etf_other", "etp"]);

type Job = { at: string; key: string; run: (db: SupabaseClient) => Promise<void> };

/** Esegue in ordine i lavori scaduti: chiusura delle finestre e valutazioni
 *  del venerdì. Si chiama dal cron e da ogni pagina: è idempotente. */
export async function ensureState(now = new Date()) {
  const db = adminClient();
  const jobs: Job[] = [
    ...VALUATION_DATES.map((d) => ({ at: valuationTime(d), key: `settle:${d}`, run: (c: SupabaseClient) => settleDay(c, d) })),
    ...WINDOWS.map((w) => ({ at: w.closesAt, key: `commit:${w.id}`, run: (c: SupabaseClient) => commitWindow(c, w) })),
  ]
    .filter((j) => new Date(j.at) <= now)
    .sort((a, b) => +new Date(a.at) - +new Date(b.at));

  const { data: rows } = await db.from("jobs").select("key,status,started_at");
  const state = new Map((rows ?? []).map((r) => [r.key, r]));
  for (const job of jobs) {
    const row = state.get(job.key);
    if (row?.status === "done") continue;
    if (row?.status === "running" && Date.now() - +new Date(row.started_at) < STALE_MS) return; // in corso altrove
    const claimed = row
      ? await db.from("jobs").update({ status: "running", started_at: new Date().toISOString(), error: null }).eq("key", job.key).eq("status", row.status).select()
      : await db.from("jobs").insert({ key: job.key }).select();
    if (claimed.error || !claimed.data?.length) return;
    try {
      await job.run(db);
      await db.from("jobs").update({ status: "done" }).eq("key", job.key);
    } catch (err) {
      console.error(job.key, err);
      await db.from("jobs").update({ status: "error", error: String(err) }).eq("key", job.key);
      return; // i lavori successivi dipendono da questo
    }
  }
}

async function loadAll(db: SupabaseClient) {
  const { data: profiles, error } = await db.from("profiles").select("*");
  if (error) throw error;
  const { data: rows, error: e2 } = await db.from("positions").select("*");
  if (e2) throw e2;
  const byUser = new Map<string, Position[]>();
  for (const r of rows ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), toPosition(r)]);
  return { profiles: profiles ?? [], byUser };
}

async function savePortfolio(db: SupabaseClient, userId: string, positions: Position[], cash: number, extra: Record<string, unknown> = {}) {
  const del = await db.from("positions").delete().eq("user_id", userId);
  if (del.error) throw del.error;
  if (positions.length) {
    const ins = await db.from("positions").insert(positions.map((p) => toRow(userId, p)));
    if (ins.error) throw ins.error;
  }
  const up = await db.from("profiles").update({ cash, ...extra }).eq("id", userId);
  if (up.error) throw up.error;
}

async function writeLedger(db: SupabaseClient, userId: string, date: string, entries: LedgerEntry[]) {
  if (!entries.length) return;
  const { error } = await db.from("ledger").insert(entries.map((e) => ({ user_id: userId, date, symbol: e.symbol, kind: e.kind, amount: e.amount, note: e.note })));
  if (error) throw error;
}

/** Valutazione del venerdì: regolamento futures, opzioni scadute, dividendi, classifica. */
async function settleDay(db: SupabaseClient, date: string) {
  const idx = VALUATION_DATES.indexOf(date);
  const prev = idx > 0 ? VALUATION_DATES[idx - 1] : null;

  if (idx === 0) {
    // Fine del mercato di prova: tutti ripartono da 100.000 € e cash.
    const { profiles } = await loadAll(db);
    for (const p of profiles) {
      await savePortfolio(db, p.id, [], START_CAPITAL, { eliminated_on: null });
      await db.from("snapshots").upsert({ user_id: p.id, date, total: START_CAPITAL, cash: START_CAPITAL });
    }
    await db.from("ledger").delete().lt("date", date);
    return;
  }

  const { profiles, byUser } = await loadAll(db);
  const active = profiles.filter((p) => !p.eliminated_on);
  const all = active.flatMap((p) => byUser.get(p.id) ?? []);
  const needed = all.filter((p) => !(p.kind === "option" && p.expiry && p.expiry <= date));
  const underlyings = all
    .filter((p) => p.kind === "option" && p.expiry && p.expiry <= date && p.underlying)
    .map((p) => ({ ...p, symbol: p.underlying!, kind: "stock" as const }));
  const { prices, fx } = await pricesFor(db, [...needed, ...underlyings], date);

  const dividends: Record<string, number> = {};
  if (prev) {
    const symbols = [...new Set(all.filter((p) => DIVIDEND_KINDS.has(p.kind)).map((p) => p.symbol))];
    await pool(symbols, 6, async (s) => {
      try {
        const d = await dividendsBetween(s, prev, date);
        if (d > 0) dividends[s] = d;
      } catch (err) {
        console.error(`dividendi ${s}`, err);
      }
    });
  }

  for (const p of active) {
    const s = settle(byUser.get(p.id) ?? [], Number(p.cash), prices, fx, dividends, date);
    const v = valuePortfolio(s.positions, s.cash, prices, fx);
    await savePortfolio(db, p.id, s.positions, s.cash, v.total <= 0 ? { eliminated_on: date } : {});
    await writeLedger(db, p.id, date, s.ledger);
    await db.from("snapshots").upsert({ user_id: p.id, date, total: v.total, cash: s.cash });
  }
}

/** Chiusura finestra: le formazioni inviate diventano il portafoglio attivo. */
async function commitWindow(db: SupabaseClient, w: Window) {
  const { profiles, byUser } = await loadAll(db);
  const { data: lineups } = await db.from("lineups").select("*").eq("window_id", w.id);
  const byUserLineup = new Map((lineups ?? []).map((l) => [l.user_id, l]));
  for (const p of profiles) {
    if (p.eliminated_on) continue;
    const l = byUserLineup.get(p.id);
    if (l) {
      await savePortfolio(db, p.id, l.positions as Position[], Number(l.cash));
      continue;
    }
    if (Number(p.cash) < 0) {
      const positions = byUser.get(p.id) ?? [];
      const { prices, fx } = await pricesFor(db, positions, w.priceDate);
      const r = forcedSale(positions, Number(p.cash), prices, fx);
      await savePortfolio(db, p.id, r.positions, r.cash);
      await writeLedger(db, p.id, w.priceDate, r.ledger);
    }
  }
}
