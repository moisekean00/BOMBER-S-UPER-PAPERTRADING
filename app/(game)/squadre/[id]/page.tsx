import { notFound } from "next/navigation";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/server";
import { toPosition, toProfile } from "@/lib/db";
import { livePrices } from "@/lib/live";
import { PositionsTable } from "@/components/PositionsTable";
import { eur, shortDate, initials } from "@/components/format";

export const dynamic = "force-dynamic";

export default async function TraderPage({ params }: { params: { id: string } }) {
  const db = adminClient();
  const { data: prof } = await db.from("profiles").select("*").eq("id", params.id).maybeSingle();
  if (!prof) notFound();
  const profile = toProfile(prof);
  const [{ data: rows }, { data: snaps }] = await Promise.all([
    db.from("positions").select("*").eq("user_id", profile.id),
    db.from("snapshots").select("*").eq("user_id", profile.id).order("date"),
  ]);
  const positions = (rows ?? []).map(toPosition);
  const { prices, fx } = await livePrices(positions);
  return (
    <div className="stack">
      <Link href="/squadre" className="muted">← Traders</Link>
      <div className="card">
        <div className="team-head" style={{ marginBottom: 16 }}>
          <span className="avatar" style={{ width: 52, height: 52, borderRadius: 16, fontSize: 18 }}>{initials(profile.trader_name)}</span>
          <h1 style={{ margin: 0, fontSize: "1.7rem" }}>{profile.trader_name}</h1>
        </div>
        {profile.eliminated_on && <div className="notice err">Eliminato il {shortDate(profile.eliminated_on)}</div>}
        <PositionsTable positions={positions} cash={profile.cash} prices={prices} fx={fx} />
      </div>
      {(snaps ?? []).length > 0 && (
        <div className="card">
          <h3>Valutazioni del venerdì</h3>
          <table>
            <tbody>
              {(snaps ?? []).map((s) => (
                <tr key={s.date}><td>{shortDate(s.date)}</td><td className="r num">{eur(Number(s.total))}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
