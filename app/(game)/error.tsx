"use client";

export default function GameError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card">
      <h2>Qualcosa non ha funzionato</h2>
      <p className="muted">Riprova tra un attimo. Se l&apos;errore resta, manda questo codice al commissario: {error.digest ?? error.message}</p>
      <button className="btn" onClick={reset}>Riprova</button>
    </div>
  );
}
