import Link from "next/link";
import { standings } from "@/lib/standings";
import { currentUser } from "@/lib/supabase/server";
import { KIND_LABEL } from "@/lib/rules";
import { eur } from "@/components/format";

export const dynamic = "force-dynamic";

export default async function LeaguePage() {
  const user = await currentUser();
  const list = await standings();
  return (
    <div className="stack">
      <div className="card">
        <h2>La lega</h2>
        <p className="muted" style={{ marginTop: -6 }}>I portafogli attivi di tutti. Le formazioni della finestra in corso restano segrete fino alla chiusura del mercato.</p>
      </div>
      {list.map((s) => {
        const top = s.positions.slice(0, 6);
        return (
          <Link key={s.profile.id} href={`/lega/${s.profile.id}`} className="card" style={{ display: "block", color: "var(--text)", textDecoration: "none" }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div className="row">
                <span className={`rank ${s.rank <= 3 ? `g${s.rank}` : ""}`}>{s.rank}</span>
                <h3 style={{ margin: 0 }}>{s.profile.trader_name}{s.profile.id === user?.id ? " (tu)" : ""}</h3>
                {s.profile.eliminated_on && <span className="tag">eliminato</span>}
              </div>
              <div className="num" style={{ fontWeight: 800 }}>{eur(s.official)}</div>
            </div>
            <div className="row" style={{ marginTop: 10, gap: 6 }}>
              {top.length === 0 && <span className="muted">Solo cash</span>}
              {top.map((p) => <span key={p.symbol} className="tag" title={KIND_LABEL[p.kind]}>{p.symbol}</span>)}
              {s.positions.length > top.length && <span className="muted" style={{ fontSize: 12 }}>+{s.positions.length - top.length}</span>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
