import { LineupEditor } from "@/components/LineupEditor";
import { Countdown } from "@/components/Countdown";
import { currentWindow } from "@/lib/calendar";

export const dynamic = "force-dynamic";

export default function MarketPage() {
  const w = currentWindow();
  return (
    <div className="stack">
      <div className="card hero"><Countdown /></div>
      {w ? (
        <LineupEditor />
      ) : (
        <div className="card">
          <h2>Il mercato è chiuso</h2>
          <p className="muted">Si compra e si vende da sabato alle 00:00 a domenica alle 23:59, ai prezzi di chiusura del venerdì. Nel frattempo la tua squadra gioca con il portafoglio attivo.</p>
        </div>
      )}
    </div>
  );
}
