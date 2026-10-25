import Link from "next/link";
import type { Standing } from "@/lib/standings";
import { START_CAPITAL } from "@/lib/calendar";
import { eur, pctChange, cls, shortDate, initials } from "./format";

export function Leaderboard({ list, me }: { list: Standing[]; me?: string }) {
  const date = list.find((s) => s.officialDate)?.officialDate ?? null;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Trader</th>
            <th className="r">Ufficiale {date ? `(${shortDate(date)})` : ""}</th>
            <th className="r">Rend.</th>
            <th className="r">Live</th>
          </tr>
        </thead>
        <tbody>
          {list.map((s) => {
            const ret = s.official / START_CAPITAL - 1;
            return (
              <tr key={s.profile.id} style={s.profile.id === me ? { background: "rgba(25,195,125,0.06)" } : undefined}>
                <td><span className={`rank ${s.rank <= 3 && !s.profile.eliminated_on ? `g${s.rank}` : ""}`}>{s.rank}</span></td>
                <td>
                  <Link href={`/squadre/${s.profile.id}`} className="row" style={{ color: "var(--text)", fontWeight: 600, flexWrap: "nowrap" }}>
                    <span className="avatar" style={{ width: 32, height: 32, borderRadius: 10, fontSize: 13 }}>{initials(s.profile.trader_name)}</span>
                    {s.profile.trader_name}
                    {s.profile.eliminated_on && <span className="tag">eliminato</span>}
                  </Link>
                </td>
                <td className="r num">{eur(s.official)}</td>
                <td className={`r num ${cls(ret)}`}>{pctChange(ret)}</td>
                <td className={`r num ${cls(s.live === null ? null : s.live - s.official)}`}>{eur(s.live)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
