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
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
          <Countdown />
          {w && (
            <Link className="btn" href="/portfolio" style={{ position: "relative", zIndex: 1 }}>
              {w.demo ? "Prova a schierare" : "Schiera la formazione"}
            </Link>
          )}
        </div>
        {w?.demo && (
          <div className="notice info" style={{ marginTop: 14, position: "relative", zIndex: 1 }}>
            Mercato di prova: usa le chiusure del 23 ottobre per fare pratica. Venerdì 30 alle 18:00 si chiude e a mezzanotte tutti ripartono da 100.000 €.
          </div>
        )}
      </div>

      {me && (
        <div className="grid-3">
          <div className="stat">
            <div className="label">Posizione</div>
            <div className="value">{me.rank}° <span className="muted" style={{ fontSize: 14 }}>su {list.length}</span></div>
          </div>
          <div className="stat">
            <div className="label">Valore ufficiale</div>
            <div className="value num">{eur(me.official)}</div>
            <div className={cls(me.official - START_CAPITAL)}>{pctChange(me.official / START_CAPITAL - 1)}</div>
          </div>
          <div className="stat">
            <div className="label">Stima live</div>
            <div className="value num">{eur(me.live)}</div>
            <div className="muted" style={{ fontSize: 13 }}>Cash {eur(me.profile.cash)}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Classifica</h2>
          <span className="muted" style={{ fontSize: 13 }}>Ufficiale ai prezzi del venerdì · live con ~15&apos; di ritardo</span>
        </div>
        <Leaderboard list={list} me={user?.id} />
      </div>
    </div>
  );
}
