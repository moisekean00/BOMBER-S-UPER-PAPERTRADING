import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { Leaderboard } from "@/components/Leaderboard";
import { eur, pctChange, cls } from "@/components/format";
import { standings } from "@/lib/standings";
import { currentUser } from "@/lib/supabase/server";
import { currentWindow, START_CAPITAL } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await currentUser();
  const list = await standings();
  const me = list.find((s) => s.profile.id === user?.id);
  const w = currentWindow();
  return (
    <div className="stack">
      <div className="card hero">
        <Countdown />
        {w && (
          <div className="row" style={{ marginTop: 18, position: "relative" }}>
            <Link className="btn white" href="/mercato">{w.demo ? "Prova il mercato" : "Vai al mercato"}</Link>
            {w.demo && <span className="muted" style={{ fontSize: 13 }}>Prova con le chiusure del 23 ottobre. Venerdì 30 a mezzanotte tutti ripartono da 100.000 €.</span>}
          </div>
        )}
      </div>

      {me && (
        <div className="grid-3">
          <div className="stat">
            <div className="label">Posizione</div>
            <div className="value">{me.rank}° <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>su {list.length}</span></div>
          </div>
          <div className="stat">
            <div className="label">Valore ufficiale</div>
            <div className="value num">{eur(me.official)}</div>
            <div className={cls(me.official - START_CAPITAL)} style={{ fontWeight: 600, fontSize: 14 }}>{pctChange(me.official / START_CAPITAL - 1)}</div>
          </div>
          <div className="stat">
            <div className="label">Stima live</div>
            <div className="value num">{eur(me.live)}</div>
            <div className="muted" style={{ fontSize: 13 }}>Cash {eur(me.profile.cash)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="section-head">
          <h2>Classifica</h2>
          <Link href="/classifica" style={{ fontSize: 14, fontWeight: 600 }}>Performance report →</Link>
        </div>
        <Leaderboard list={list} me={user?.id} />
      </div>
    </div>
  );
}
