import { PositionsTable } from "@/components/PositionsTable";
import { LineupEditor } from "@/components/LineupEditor";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { toPosition, toProfile } from "@/lib/db";
import { livePrices } from "@/lib/live";
import { currentWindow } from "@/lib/calendar";
import { eur, shortDate } from "@/components/format";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const user = (await currentUser())!;
  const db = adminClient();
  const [{ data: prof }, { data: rows }, { data: ledger }] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).single(),
    db.from("positions").select("*").eq("user_id", user.id),
    db.from("ledger").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
  ]);
  const profile = toProfile(prof);
  const positions = (rows ?? []).map(toPosition);
  const { prices, fx } = await livePrices(positions);
  const w = currentWindow();
  return (
    <div className="stack">
      {w ? (
        <LineupEditor />
      ) : (
        <div className="card">
          <h2>Mercato chiuso</h2>
          <p className="muted">La formazione si cambia da sabato alle 00:00 a domenica alle 23:59, ai prezzi di chiusura del venerdì.</p>
        </div>
      )}
      <div className="card">
        <h2>Portafoglio attivo</h2>
        <p className="muted" style={{ marginTop: -6 }}>Quello che sta giocando adesso, ai prezzi live. I cambi della finestra diventano attivi alla chiusura.</p>
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
                  <td>{l.symbol}</td>
                  <td><span className="tag">{({ futures_pnl: "Regolamento future", dividend: "Dividendo", option_expiry: "Opzione scaduta", forced_sale: "Vendita forzata" } as Record<string, string>)[l.kind] ?? l.kind}</span></td>
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
