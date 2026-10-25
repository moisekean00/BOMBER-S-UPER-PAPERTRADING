import Link from "next/link";
import { PositionsTable } from "@/components/PositionsTable";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { toPosition } from "@/lib/db";
import { ensureProfile } from "@/lib/game";
import { livePrices } from "@/lib/live";
import { standings } from "@/lib/standings";
import { currentWindow, START_CAPITAL } from "@/lib/calendar";
import { eur, pctChange, cls, shortDate, initials } from "@/components/format";

export const dynamic = "force-dynamic";

const LEDGER: Record<string, string> = { futures_pnl: "Regolamento future", dividend: "Dividendo", option_expiry: "Opzione scaduta", forced_sale: "Vendita forzata" };

export default async function MyTeamPage() {
  const user = (await currentUser())!;
  const db = adminClient();
  const profile = await ensureProfile(user);
  const [{ data: rows }, { data: ledger }, list] = await Promise.all([
    db.from("positions").select("*").eq("user_id", user.id),
    db.from("ledger").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    standings(),
  ]);
  const me = list.find((s) => s.profile.id === user.id);
  const positions = (rows ?? []).map(toPosition);
  const { prices, fx } = await livePrices(positions);
  const w = currentWindow();
  return (
    <div className="stack">
      <div className="card">
        <div className="team-head">
          <span className="avatar" style={{ width: 56, height: 56, borderRadius: 16, fontSize: 20 }}>{initials(profile.trader_name)}</span>
          <div style={{ flex: 1 }}>
            <div className="eyebrow">La mia squadra</div>
            <h1 style={{ margin: 0, fontSize: "1.8rem" }}>{profile.trader_name}</h1>
          </div>
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
      <div className="card">
        <div className="section-head">
          <h2>Rosa attiva</h2>
          <span className="muted" style={{ fontSize: 13 }}>Prezzi live · i cambi del mercato entrano alla chiusura</span>
        </div>
        <PositionsTable positions={positions} cash={profile.cash} prices={prices} fx={fx} />
      </div>
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
