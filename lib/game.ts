import "server-only";
import { currentWindow, type Window } from "./calendar";
import { adminClient, userClient } from "./supabase/server";
import { officialClose, officialFx, pricesFor, toPosition, toProfile } from "./db";
import { kindMatches, parseOcc } from "./prices";
import { applyLineup, KIND_LABEL, MARGIN_KINDS, type Kind, type Position } from "./rules";

/** Profilo del giocatore; se manca (iscrizione fatta prima delle tabelle) lo crea. */
export async function ensureProfile(user: { id: string; user_metadata?: Record<string, any> }) {
  const db = adminClient();
  const { data } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (data) return toProfile(data);
  const base = String(user.user_metadata?.trader_name ?? "").trim().slice(0, 20) || `Trader ${user.id.slice(0, 4)}`;
  for (const name of [base, `${base} ${user.id.slice(0, 3)}`]) {
    const ins = await db.from("profiles").upsert({ id: user.id, trader_name: name }, { onConflict: "id", ignoreDuplicates: true }).select().maybeSingle();
    if (!ins.error) {
      const { data: row } = await db.from("profiles").select("*").eq("id", user.id).single();
      return toProfile(row);
    }
  }
  throw new Error("Impossibile creare il profilo");
}

/** Commissario: chi è in ADMIN_EMAILS oppure, in mancanza, il primo iscritto. */
export async function isAdmin(user?: { id: string; email?: string | null } | null) {
  if (!user) return false;
  if (isAdminEmail(user.email)) return true;
  const db = adminClient();
  const { data: admins } = await db.from("profiles").select("id").eq("is_admin", true);
  if (admins?.length) return admins.some((a) => a.id === user.id);
  const { data: first } = await db.from("profiles").select("id").order("created_at").limit(1).maybeSingle();
  if (first?.id !== user.id) return false;
  await db.from("profiles").update({ is_admin: true }).eq("id", user.id);
  return true;
}

export function isAdminEmail(email?: string | null) {
  const list = (process.env.ADMIN_EMAILS ?? "").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
  return !!email && list.includes(email.toLowerCase());
}

/** Tutto ciò che serve all'editor della formazione nella finestra aperta. */
export async function lineupContext(userId: string, w: Window) {
  const db = adminClient();
  const profile = await ensureProfile({ id: userId });
  const { data: rows } = await db.from("positions").select("*").eq("user_id", userId);
  const active = (rows ?? []).map(toPosition);
  const { data: draft } = await userClient().from("lineups").select("*").eq("user_id", userId).eq("window_id", w.id).maybeSingle();
  const target: Position[] = draft ? (draft.positions as Position[]) : active;
  const { prices, fx } = await pricesFor(db, [...active, ...target], w.priceDate);
  return { profile, active, draft: draft ? target : null, prices, fx };
}

/** Dati ufficiali di uno strumento al venerdì della finestra. */
export async function instrument(symbol: string, date: string) {
  const db = adminClient();
  const { closeOn } = await import("./prices");
  const meta = await closeOn(symbol, date).catch(() => null);
  const close = await officialClose(db, symbol, date);
  const fx = await officialFx(db, close.currency, date);
  const occ = parseOcc(symbol);
  return {
    symbol,
    name: meta?.name ?? symbol,
    quoteType: meta?.quoteType ?? (occ ? "OPTION" : ""),
    price: close.price,
    currency: close.currency,
    fx,
    option: occ,
  };
}

const KINDS = Object.keys(KIND_LABEL) as Kind[];
const num = (v: unknown, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);

/** Ricostruisce lato server ogni posizione inviata: il browser sceglie solo
 *  simbolo, tipo, quantità e leva. Il resto lo decide il server. */
export async function sanitize(raw: unknown[], active: Position[], date: string): Promise<{ positions: Position[]; errors: string[] }> {
  const errors: string[] = [];
  const out: Position[] = [];
  const old = new Map(active.map((p) => [p.symbol, p]));
  for (const r of raw.slice(0, 60) as any[]) {
    const symbol = String(r?.symbol ?? "").trim().toUpperCase();
    const kind = r?.kind as Kind;
    if (!symbol || !KINDS.includes(kind)) {
      errors.push(`Strumento non valido: ${symbol || "?"}`);
      continue;
    }
    const prev = old.get(symbol);
    const qty = num(r.qty);
    if (prev && prev.kind === kind) {
      out.push({ ...prev, qty, leverage: kind === "etp" || MARGIN_KINDS.includes(kind) ? num(r.leverage, prev.leverage) : prev.leverage });
      continue;
    }
    try {
      const i = await instrument(symbol, date);
      if (i.quoteType && !kindMatches(kind, i.quoteType)) {
        errors.push(`${symbol}: per Yahoo è ${i.quoteType}, non ${KIND_LABEL[kind]}`);
        continue;
      }
      if (kind === "option" && !i.option) {
        errors.push(`${symbol}: sono ammesse solo opzioni con codice standard (es. AAPL261218C00250000)`);
        continue;
      }
      out.push({
        symbol,
        name: i.name,
        kind,
        currency: i.currency,
        qty,
        multiplier: kind === "option" ? 100 : 1,
        leverage: kind === "etp" || MARGIN_KINDS.includes(kind) ? num(r.leverage, 1) : 1,
        margin: 0,
        refPrice: null,
        expiry: i.option?.expiry ?? null,
        underlying: i.option?.underlying ?? null,
        strike: i.option?.strike ?? null,
        optType: i.option?.optType ?? null,
      });
    } catch {
      errors.push(`${symbol}: prezzo di chiusura non trovato`);
    }
  }
  return { positions: out, errors };
}

export async function saveLineup(userId: string, raw: unknown[]) {
  const w = currentWindow();
  if (!w) return { status: 400, body: { errors: ["Il mercato è chiuso"] } };
  const ctx = await lineupContext(userId, w);
  if (ctx.profile.eliminated_on) return { status: 400, body: { errors: ["Sei stato eliminato"] } };
  if (!w.demo && !ctx.profile.paid) return { status: 400, body: { errors: ["Prima di schierare la formazione devi versare la quota a Pier"] } };
  const s = await sanitize(raw, ctx.active, w.priceDate);
  if (s.errors.length) return { status: 400, body: { errors: s.errors } };
  const db = adminClient();
  const { prices, fx } = await pricesFor(db, [...ctx.active, ...s.positions], w.priceDate);
  let r;
  try {
    r = applyLineup(ctx.active, ctx.profile.cash, s.positions, prices, fx, { first: w.first });
  } catch (err) {
    return { status: 400, body: { errors: [String((err as Error).message)] } };
  }
  if (r.errors.length) return { status: 400, body: { errors: r.errors } };
  // I minimi del 5% si possono sistemare con gli ordini successivi: si salva lo stesso.
  const { error } = await db.from("lineups").upsert({ user_id: userId, window_id: w.id, positions: r.positions, cash: r.cash, updated_at: new Date().toISOString() });
  if (error) return { status: 500, body: { errors: [error.message] } };
  return { status: 200, body: { ok: true, cash: r.cash, sold: r.sold, warnings: r.warnings } };
}
