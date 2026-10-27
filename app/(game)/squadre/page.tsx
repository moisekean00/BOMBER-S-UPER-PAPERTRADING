import Link from "next/link";
import { standings } from "@/lib/standings";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { currentWindow } from "@/lib/calendar";
import type { Position } from "@/lib/rules";
import { livePrices } from "@/lib/live";
import { KIND_LABEL, positionValue } from "@/lib/rules";
import { START_CAPITAL } from "@/lib/calendar";
import { eur, pctChange, cls, initials } from "@/components/format";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const user = await currentUser();
  const w = currentWindow();
  const [list, { data: lineups }] = await Promise.all([
    standings(),
    w ? adminClient().from("lineups").select("user_id,positions,cash,updated_at").eq("window_id", w.id) : Promise.resolve({ data: [] as any[] }),
  ]);
  // Chi ha inserito ordini lo vedono tutti; cosa ha comprato lo vede solo lui fino alla chiusura.
  const pending = new Map((lineups ?? []).map((l: any) => [l.user_id as string, l]));
  const mine = user ? pending.get(user.id) : undefined;
  const { prices, fx } = await livePrices([...list.flatMap((s) => s.positions), ...((mine?.positions ?? []) as Position[])]);
  return (
    <div className="stack">
      <div className="card">
        <div className="eyebrow">Traders</div>
        <h1 style={{ margin: 0, fontSize: "1.8rem" }}>I book di tutti i trader</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>I book attivi di tutti. Durante il mercato vedi chi ha inserito ordini (🔒), ma cosa ha comprato si scopre solo alla chiusura{w ? ` di ${new Date(w.closesAt).toLocaleString("it-IT", { weekday: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })}` : ""}. Sul tuo book vedi i tuoi ordini in attesa.</p>
      </div>
      <div className="teams">
        {list.map((s) => {
          const ret = s.official / START_CAPITAL - 1;
          const total = s.live ?? s.official;
          const isMe = s.profile.id === user?.id;
          const order = pending.get(s.profile.id);
          const showOrders = isMe && order;
          const rows = ((showOrders ? order.positions : s.positions) as Position[])
            .map((p) => {
              let v: number | null = null;
              try { v = positionValue(p, prices, fx, true); } catch {}
              return { p, v };
            })
            .sort((a, b) => (b.v ?? 0) - (a.v ?? 0));
          return (
            <Link key={s.profile.id} href={`/squadre/${s.profile.id}`} className="card" style={{ color: "var(--text)", display: "block" }}>
              <div className="team-head">
                <span className="avatar">{initials(s.profile.trader_name)}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 17 }}>{s.profile.trader_name}{s.profile.id === user?.id ? " · tu" : ""}</div>
                  <div className="muted" style={{ fontSize: 13 }}>{s.rank}° posto{s.profile.eliminated_on ? " · eliminato" : ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="num" style={{ fontWeight: 700 }}>{eur(s.official)}</div>
                  <div className={`num ${cls(ret)}`} style={{ fontSize: 13, fontWeight: 600 }}>{pctChange(ret)}</div>
                </div>
              </div>
              {order && (
                <div className="notice info" style={{ marginTop: 12, padding: "8px 12px", fontSize: 13 }}>
                  {showOrders ? `🕒 I tuoi ordini per ${w?.label}: qui sotto il book come sarà dopo la chiusura.` : `🔒 Ordini inseriti per ${w?.label}: si scoprono alla chiusura.`}
                </div>
              )}
              <div style={{ marginTop: 14 }}>
                {rows.length === 0 && <div className="muted" style={{ fontSize: 14 }}>Rosa vuota: solo cash.</div>}
                {rows.map(({ p, v }) => (
                  <div key={p.symbol} className="roster-row">
                    <div style={{ minWidth: 0 }}>
                      <span className="sym">{p.symbol}</span>{" "}
                      <span className="muted" style={{ fontSize: 12 }}>{p.kind === "future" ? (p.qty >= 0 ? "Long" : "Short") : ""}</span>
                    </div>
                    <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
                      <span className="tag">{KIND_LABEL[p.kind]}</span>
                      <span className="num muted" style={{ fontSize: 13, minWidth: 48, textAlign: "right" }}>{v === null || !total ? "—" : `${((v / total) * 100).toFixed(1)}%`}</span>
                    </div>
                  </div>
                ))}
                <div className="roster-row">
                  <span className="sym">Cash</span>
                  <span className="num muted" style={{ fontSize: 13 }}>{eur(showOrders ? Number(order.cash) : s.profile.cash)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
