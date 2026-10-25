import "server-only";
import { adminClient } from "./supabase/server";
import { toPosition, toProfile, type Profile } from "./db";
import { liveFx, quotes } from "./prices";
import { valuePortfolio, type Position } from "./rules";
import { START_CAPITAL } from "./calendar";

export type Standing = {
  profile: Profile;
  positions: Position[];
  official: number; // ultima valutazione del venerdì
  officialDate: string | null;
  live: number | null; // stima ai prezzi di adesso
  rank: number;
};

/** Classifica: valore ufficiale del venerdì e stima live. */
export async function standings(): Promise<Standing[]> {
  const db = adminClient();
  const [{ data: profs }, { data: rows }, { data: snaps }] = await Promise.all([
    db.from("profiles").select("*"),
    db.from("positions").select("*"),
    db.from("snapshots").select("*").order("date", { ascending: false }),
  ]);
  const byUser = new Map<string, Position[]>();
  for (const r of rows ?? []) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), toPosition(r)]);

  const all = [...byUser.values()].flat();
  const live: Record<string, number> = {};
  let fx: Record<string, number> = {};
  try {
    const q = await quotes([...new Set(all.map((p) => p.symbol))]);
    for (const x of q) live[x.symbol] = x.price;
    fx = await liveFx(all.map((p) => p.currency));
  } catch (err) {
    console.error("quotazioni live", err);
  }

  const list = (profs ?? []).map((r) => {
    const profile = toProfile(r);
    const positions = byUser.get(profile.id) ?? [];
    const snap = (snaps ?? []).find((s) => s.user_id === profile.id);
    let liveValue: number | null = null;
    try {
      liveValue = valuePortfolio(positions, profile.cash, live, fx, true).total;
    } catch {
      liveValue = null;
    }
    return {
      profile,
      positions,
      official: snap ? Number(snap.total) : START_CAPITAL,
      officialDate: snap?.date ?? null,
      live: liveValue,
      rank: 0,
    };
  });
  // Eliminati in fondo, in ordine di uscita (chi è uscito prima sta più in basso).
  list.sort((a, b) => {
    const ea = a.profile.eliminated_on, eb = b.profile.eliminated_on;
    if (ea && eb) return eb.localeCompare(ea);
    if (ea) return 1;
    if (eb) return -1;
    return b.official - a.official;
  });
  list.forEach((s, i) => (s.rank = i + 1));
  return list;
}
