import { redirect } from "next/navigation";
import Link from "next/link";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/game";
import { standingsWithMarket } from "@/lib/standings";
import { currentWindow, START_CAPITAL } from "@/lib/calendar";
import { PaidToggle } from "@/components/PaidToggle";
import { PositionsTable } from "@/components/PositionsTable";
import { eur, pctChange, cls } from "@/components/format";

export const dynamic = "force-dynamic";

const BUY_IN = 50;

export default async function AdminPage() {
  const user = await currentUser();
  if (!(await isAdmin(user))) redirect("/dashboard");
  const db = adminClient();
  const w = currentWindow();
  const [{ list, market }, { data: jobs }, { data: lineups }, users, { data: ledger }] = await Promise.all([
    standingsWithMarket(),
    db.from("jobs").select("*").order("started_at", { ascending: false }).limit(30),
    w ? db.from("lineups").select("*").eq("window_id", w.id) : Promise.resolve({ data: [] as any[] }),
    db.auth.admin.listUsers({ perPage: 200 }),
    db.from("ledger").select("*").order("created_at", { ascending: false }).limit(40),
  ]);
  const emails = new Map((users.data?.users ?? []).map((u) => [u.id, u.email ?? ""]));
  const drafts = new Map((lineups ?? []).map((l: any) => [l.user_id, l]));
  const names = new Map(list.map((s) => [s.profile.id, s.profile.trader_name]));
  const paid = list.filter((s) => s.profile.paid).length;
  const prices: Record<string, number> = { ...market.ref, ...market.live };
  const fx = market.fx;

  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Admin view</div>
        <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Sala di controllo</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>Vedi tutto tranne il contenuto degli ordini della finestra in corso: restano segreti anche per l&apos;admin fino alla chiusura, perché anche tu giochi.</p>
      </div>

      <div className="grid-3">
        <div className="stat"><div className="label">Trader iscritti</div><div className="value">{list.length}</div><div className="muted" style={{ fontSize: 13 }}>{emails.size} account creati</div></div>
        <div className="stat"><div className="label">Quote pagate</div><div className="value">{paid}/{list.length}</div><div className="muted" style={{ fontSize: 13 }}>Montepremi {eur(paid * BUY_IN)}</div></div>
        <div className="stat"><div className="label">{w ? w.label : "Mercato chiuso"}</div><div className="value">{drafts.size}/{list.length}</div><div className="muted" style={{ fontSize: 13 }}>{w ? "book con ordini salvati" : "nessuna finestra aperta"}</div></div>
      </div>

      <div className="card">
        <h3>Trader</h3>
        <div className="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Trader</th><th>Email</th><th className="r">Cash</th><th className="r">NAV ufficiale</th><th className="r">Live</th><th className="r">Ordini</th><th className="r">Quota</th></tr></thead>
            <tbody>
              {list.map((s) => {
                const d = drafts.get(s.profile.id);
                return (
                  <tr key={s.profile.id}>
                    <td className="muted">{s.rank}</td>
                    <td style={{ fontWeight: 700 }}><Link href={`/squadre/${s.profile.id}`}>{s.profile.trader_name}</Link>{s.profile.is_admin && <span className="tag" style={{ marginLeft: 6 }}>admin</span>}{s.profile.eliminated_on && <span className="tag down" style={{ marginLeft: 6 }}>eliminato</span>}</td>
                    <td className="muted" style={{ fontSize: 13 }}>{emails.get(s.profile.id)}</td>
                    <td className="r num">{eur(s.profile.cash)}</td>
                    <td className="r num">{eur(s.official)} <div className={cls(s.official - START_CAPITAL)} style={{ fontSize: 12 }}>{pctChange(s.official / START_CAPITAL - 1)}</div></td>
                    <td className="r num">{s.live === null ? "—" : eur(s.live)}</td>
                    <td className="r">{d ? <span className="tag">salvati {new Date(d.updated_at).toLocaleString("it-IT", { weekday: "short", hour: "2-digit", minute: "2-digit" })}</span> : <span className="muted">—</span>}</td>
                    <td className="r"><PaidToggle userId={s.profile.id} paid={s.profile.paid} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {list.map((s) => {
        const d = drafts.get(s.profile.id);
        return (
          <details key={s.profile.id} className="card">
            <summary style={{ cursor: "pointer", fontWeight: 700 }}>{s.profile.trader_name} · book attivo</summary>
            <h4>Book attivo</h4>
            <PositionsTable positions={s.positions} cash={s.profile.cash} prices={prices} fx={fx} />
            {d && <p className="muted" style={{ fontSize: 13 }}>Ha salvato ordini per {w?.label}: li vedrai alla chiusura.</p>}
          </details>
        );
      })}

      <div className="card">
        <h3>Movimenti di cassa</h3>
        <p className="muted" style={{ marginTop: -6 }}>Dividendi, P&L dei futures, interessi sulla leva, opzioni scadute, vendite forzate.</p>
        <table>
          <tbody>
            {(ledger ?? []).map((l) => (
              <tr key={l.id}><td>{l.date}</td><td>{names.get(l.user_id)}</td><td>{l.symbol}</td><td className="muted">{l.kind} · {l.note}</td><td className={`r num ${cls(Number(l.amount))}`}>{eur(Number(l.amount))}</td></tr>
            ))}
            {!ledger?.length && <tr><td className="muted">Ancora nessun movimento.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>Lavori automatici</h3>
        <p className="muted" style={{ marginTop: -6 }}>Chiusura delle finestre e valutazioni del venerdì. Se uno va in errore si riprova da solo al prossimo accesso.</p>
        <table>
          <tbody>
            {(jobs ?? []).map((j) => (
              <tr key={j.key}>
                <td>{j.key}</td>
                <td><span className={`tag ${j.status === "error" ? "down" : ""}`}>{j.status}</span></td>
                <td className="muted" style={{ fontSize: 12 }}>{j.error ?? new Date(j.started_at).toLocaleString("it-IT")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
