import Link from "next/link";
import { standingsWithMarket } from "@/lib/standings";
import { currentUser } from "@/lib/supabase/server";
import { START_CAPITAL } from "@/lib/calendar";
import { weeklyReturns, volatility, sharpe, maxDrawdown, grossLeverage, topWeight, topPick } from "@/lib/metrics";
import { eur, pctChange, cls, initials, shortDate } from "@/components/format";

export const dynamic = "force-dynamic";

const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : pctChange(n));
const plain = (n: number | null | undefined, d = 2) => (n === null || n === undefined || !isFinite(n) ? "—" : n.toLocaleString("it-IT", { maximumFractionDigits: d, minimumFractionDigits: d }));

export default async function RankingPage() {
  const user = await currentUser();
  const { list, market } = await standingsWithMarket();
  const rows = list.map((s) => {
    const r = weeklyReturns(s.history);
    const nav = s.live ?? s.official;
    return {
      s,
      total: s.official / START_CAPITAL - 1,
      week: r.length ? r[r.length - 1] : null,
      vol: volatility(r),
      sharpe: sharpe(r),
      mdd: maxDrawdown(s.history),
      lev: grossLeverage(s.positions, nav, market.live, market.fx),
      top: topWeight(s.positions, nav, market.live, market.fx),
      pick: topPick(s.positions, market.live, market.ref, market.daily),
      liveDelta: s.live === null ? null : s.live / s.official - 1,
    };
  });
  const date = list.find((s) => s.officialDate)?.officialDate ?? null;
  const best = (f: (r: (typeof rows)[number]) => number | null) => {
    const vals = rows.map(f).filter((v): v is number => v !== null);
    return vals.length ? Math.max(...vals) : null;
  };
  const bestWeek = best((r) => r.week);
  const bestSharpe = best((r) => r.sharpe);

  return (
    <div className="stack">
      <div className="card">
        <div className="eyebrow">Classifica{date ? ` · NAV ufficiale al ${shortDate(date)}` : ""}</div>
        <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Performance report</h1>
        <p className="muted" style={{ margin: "6px 0 0" }}>NAV e rendimenti ai prezzi ufficiali del venerdì. Volatilità e Sharpe annualizzati sui rendimenti settimanali (servono almeno 3 venerdì), tasso privo di rischio a zero. Leva lorda: futures al nozionale, ETP per la loro leva.</p>
      </div>

      <div className="grid-3">
        <div className="stat"><div className="label">Leader</div><div className="value" style={{ fontSize: "1.2rem" }}>{list[0]?.profile.trader_name ?? "—"}</div><div className="muted num" style={{ fontSize: 13 }}>{eur(list[0]?.official)}</div></div>
        <div className="stat"><div className="label">Miglior settimana</div><div className="value num" style={{ fontSize: "1.2rem" }}>{pct(bestWeek)}</div><div className="muted" style={{ fontSize: 13 }}>{rows.find((r) => r.week === bestWeek)?.s.profile.trader_name ?? "—"}</div></div>
        <div className="stat"><div className="label">Miglior Sharpe</div><div className="value num" style={{ fontSize: "1.2rem" }}>{plain(bestSharpe)}</div><div className="muted" style={{ fontSize: 13 }}>{rows.find((r) => r.sharpe === bestSharpe)?.s.profile.trader_name ?? "—"}</div></div>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table style={{ minWidth: 980 }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Trader</th>
                <th className="r">NAV</th>
                <th className="r">Rend. totale</th>
                <th className="r">Settimana</th>
                <th className="r">Live</th>
                <th className="r">Volatilità</th>
                <th className="r">Sharpe</th>
                <th className="r">Max DD</th>
                <th className="r">Leva lorda</th>
                <th>Top weight</th>
                <th>Top pick</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.s.profile.id} style={r.s.profile.id === user?.id ? { background: "#f0f4ff" } : undefined}>
                  <td><span className={`rank ${r.s.rank <= 3 && !r.s.profile.eliminated_on ? `g${r.s.rank}` : ""}`}>{r.s.rank}</span></td>
                  <td>
                    <Link href={`/squadre/${r.s.profile.id}`} className="row" style={{ color: "var(--text)", fontWeight: 600, flexWrap: "nowrap" }}>
                      <span className="avatar" style={{ width: 30, height: 30, borderRadius: 9, fontSize: 12 }}>{initials(r.s.profile.trader_name)}</span>
                      {r.s.profile.trader_name}
                    </Link>
                  </td>
                  <td className="r num" style={{ fontWeight: 600 }}>{eur(r.s.official)}</td>
                  <td className={`r num ${cls(r.total)}`}>{pct(r.total)}</td>
                  <td className={`r num ${cls(r.week)}`}>{pct(r.week)}</td>
                  <td className={`r num ${cls(r.liveDelta)}`}>{pct(r.liveDelta)}</td>
                  <td className="r num">{r.vol === null ? "—" : pctChange(r.vol).replace("+", "")}</td>
                  <td className="r num">{plain(r.sharpe)}</td>
                  <td className="r num down">{r.mdd === null || r.mdd === 0 ? "—" : pctChange(r.mdd)}</td>
                  <td className="r num">{r.lev === null ? "—" : `${plain(r.lev, 1)}x`}</td>
                  <td>{r.top ? <span className="tag">{r.top.symbol} · {(r.top.weight * 100).toFixed(0)}%</span> : "—"}</td>
                  <td>{r.pick ? <span className="tag" style={{ color: r.pick.move >= 0 ? "var(--up)" : "var(--down)" }}>{r.pick.symbol} {pctChange(r.pick.move)}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 12, margin: "12px 0 0" }}>Live: variazione stimata del NAV da venerdì ai prezzi di adesso (~15&apos; di ritardo). Top pick: il titolo in portafoglio che ha fatto meglio da venerdì.</p>
      </div>
    </div>
  );
}
