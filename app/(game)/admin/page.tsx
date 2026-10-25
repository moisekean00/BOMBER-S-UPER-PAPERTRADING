import { redirect } from "next/navigation";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/game";
import { PaidToggle } from "@/components/PaidToggle";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await currentUser();
  if (!isAdminEmail(user?.email)) redirect("/dashboard");
  const db = adminClient();
  const [{ data: profiles }, { data: jobs }] = await Promise.all([
    db.from("profiles").select("*").order("created_at"),
    db.from("jobs").select("*").order("started_at", { ascending: false }).limit(20),
  ]);
  return (
    <div className="stack">
      <div className="card">
        <h2>Commissario</h2>
        <p className="muted" style={{ marginTop: -6 }}>Segna chi ha versato i 50 €: senza quota non si può schierare la prima formazione.</p>
        <table>
          <thead><tr><th>Trader</th><th>Iscritto</th><th className="r">Quota</th></tr></thead>
          <tbody>
            {(profiles ?? []).map((p) => (
              <tr key={p.id}>
                <td style={{ fontWeight: 700 }}>{p.trader_name}</td>
                <td className="muted">{new Date(p.created_at).toLocaleDateString("it-IT")}</td>
                <td className="r"><PaidToggle userId={p.id} paid={p.paid} /></td>
              </tr>
            ))}
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
