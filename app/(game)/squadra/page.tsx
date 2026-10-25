import Link from "next/link";
import { PositionsTable } from "@/components/PositionsTable";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { pricesFor, toPosition } from "@/lib/db";
import { diffOrders, type Order } from "@/lib/orders";
import { OrderList } from "@/components/OrderList";
import type { Position } from "@/lib/rules";
import { ensureProfile } from "@/lib/game";
import { livePrices } from "@/lib/live";
import { standings } from "@/lib/standings";
import { currentWindow, START_CAPITAL } from "@/lib/calendar";
import { eur, pctChange, cls, shortDate, initials } from "@/components/format";

export const dynamic = "force-dynamic";

const LEDGER: Record<string, string> = { futures_pnl: "Regolamento future", dividend: "Dividendo", option_expiry: "Opzione scaduta", forced_sale: "Vendita forzata", interest: "Interessi leva" };

export default async function MyTeamPage() {
  const user = (await currentUser())!;
  const db = adminClient();
  const profile = await ensureProfile(user);
  const w = currentWindow();
  const [{ data: rows }, { data: ledger }, list, { data: draft }, { data: trades }] = await Promise.all([
    db.from("positions").select("*").eq("user_id", user.id),
    db.from("ledger").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    standings(),
    w ? db.from("lineups").select("*").eq("user_id", user.id).eq("window_id", w.id).maybeSingle() : Promise.resolve({ data: null }),
    db.from("trades").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
  ]);
  const me = list.find((s) => s.profile.id === user.id);
  const positions = (rows ?? []).map(toPosition);
  const { prices, fx } = await livePrices(positions);
  // Ordini della finestra aperta, ai prezzi del venerdì: visibili subito, eseguiti alla chiusura.
  let pending: Order[] = [];
  const after = (draft?.positions ?? null) as Position[] | null;
  if (w && after) {
    try {
      const official = await pricesFor(db, [...positions, ...after], w.priceDate);
      pending = diffOrders(positions, after, official.prices, official.fx);
    } catch (e) { console.error("ordini in attesa", e); }
  }
  const { prices: afterPrices, fx: afterFx } = after ? await livePrices(after) : { prices, fx };
  const closes = w ? new Date(w.closesAt).toLocaleString("it-IT", { weekday: "long", hour: "2-digit", minute: "2-digit" }) : "";
  const history: (Order & { date: string })[] = (trades ?? []).map((t) => ({
    symbol: t.symbol, name: t.name, kind: t.kind, side: t.side, qtyBefore: Number(t.qty_before), qtyAfter: Number(t.qty_after),
    price: t.price === null ? null : Number(t.price), currency: t.currency, amount: Number(t.amount), exposure: Number(t.exposure),
    leverage: Number(t.leverage), debt: 0, margin: 0, date: t.date,
  }));
  return (
    <div className="stack">
      <div className="card">
        <div className="team-head">
          <span className="avatar" style={{ width: 56, height: 56, borderRadius: 16, fontSize: 20 }}>{initials(profile.trader_name)}</span>
          <div style={{ flex: 1 }}>
            <div className="eyebrow">My Super Bomber Book</div>
            <h1 style={{ margin: 0, fontSize: "1.8rem" }}>{profile.trader_name}</h1>
          </div>
          <Link className="btn ghost small" href="/impostazioni">Impostazioni</Link>
          <Link className="btn ghost small" href="/analytics">Analytics</Link>
          {w && <Link className="btn" href="/mercato">Vai al mercato</Link>}
        </div>
      </div>
      {me && (
        <div className="grid-3">
          <div className="stat"><div className="label">Posizione</div><div className="value">{me.rank}° <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>su {list.length}</span></div></div>
          <div className="stat"><div className="label">Valore ufficiale</div><div className="value num">{eur(me.official)}</div><div className={cls(me.official - START_CAPITAL)} style={{ fontWeight: 600, fontSize: 14 }}>{pctChange(me.official / START_CAPITAL - 1)}</div></div>
          <div className="stat"><div className="label">Stima live</div><div className="value num">{eur(me.live)}</div><div className="muted" style={{ fontSize: 13 }}>Cash {eur(profile.cash)}</div></div>
        </div>
      )}
      {w && after && (
        <div className="card" style={{ borderTop: "4px solid var(--gold)" }}>
          <div className="section-head">
            <div>
              <div className="eyebrow">{w.label} · in attesa di esecuzione</div>
              <h2>I tuoi ordini</h2>
            </div>
            <Link className="btn small" href="/mercato">Modifica</Link>
          </div>
          <p className="muted" style={{ marginTop: -6, fontSize: 13 }}>Si eseguono {closes} ai prezzi di chiusura del venerdì. Tocca un&apos;operazione per il dettaglio. Gli altri li vedono solo dopo la chiusura.</p>
          <OrderList orders={pending} status={`In attesa, si esegue ${closes}`} />
          <h3 style={{ marginTop: 20 }}>Il book dopo gli ordini</h3>
          <PositionsTable positions={after} cash={Number(draft!.cash)} prices={afterPrices} fx={afterFx} />
        </div>
      )}
      <div className="card">
        <div className="section-head">
          <h2>Book attivo</h2>
          <span className="muted" style={{ fontSize: 13 }}>Prezzi live · gli ordini entrano alla chiusura del mercato</span>
        </div>
        <PositionsTable positions={positions} cash={profile.cash} prices={prices} fx={fx} />
      </div>
      {history.length > 0 && (
        <div className="card">
          <h2>Storico operazioni</h2>
          <OrderList orders={history} status="Eseguito" />
        </div>
      )}
      {(ledger ?? []).length > 0 && (
        <div className="card">
          <h2>Movimenti di cash</h2>
          <table>
            <tbody>
              {(ledger ?? []).map((l) => (
                <tr key={l.id}>
                  <td className="muted">{shortDate(l.date)}</td>
                  <td style={{ fontWeight: 600 }}>{l.symbol}</td>
                  <td><span className="tag">{LEDGER[l.kind] ?? l.kind}</span></td>
                  <td className={`r num ${Number(l.amount) >= 0 ? "up" : "down"}`}>{eur(Number(l.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
