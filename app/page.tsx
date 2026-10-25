import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Countdown } from "@/components/Countdown";
import { TAGLINE } from "@/lib/brand";
import { currentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const user = await currentUser().catch(() => null);
  return (
    <main className="landing">
      <div>
        <Logo size={88} big />
        <p className="tagline">{TAGLINE}</p>
        <div className="row" style={{ justifyContent: "center" }}>
          {user ? (
            <Link className="btn" href="/dashboard">Entra nella lega</Link>
          ) : (
            <>
              <Link className="btn" href="/login?mode=signup">Iscriviti</Link>
              <Link className="btn ghost" href="/login">Accedi</Link>
            </>
          )}
          <Link className="btn ghost" href="/regolamento">Regolamento</Link>
        </div>
        <div className="card hero" style={{ maxWidth: 520, margin: "36px auto 0", textAlign: "left" }}>
          <Countdown />
        </div>
        <div className="features">
          <div className="card"><h3>100.000 € virtuali</h3><p className="muted">Azioni, ETF, futures e opzioni di tutti i mercati. Leva fino a 5x.</p></div>
          <div className="card"><h3>Mercato nel weekend</h3><p className="muted">Cambi dal sabato alla domenica alle 23:59, ai prezzi di chiusura del venerdì.</p></div>
          <div className="card"><h3>Classifica ogni venerdì</h3><p className="muted">Vince chi ha il portafoglio più alto al 31 dicembre.</p></div>
        </div>
      </div>
    </main>
  );
}
