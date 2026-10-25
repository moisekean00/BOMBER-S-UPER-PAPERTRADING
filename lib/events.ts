// Calendario degli eventi che muovono i mercati durante la stagione.
// Date verificate il 25/10/2026 sui siti ufficiali (Fed, BCE, BoE, BLS) e su ElectionGuide.
// Le trimestrali arrivano da Yahoo (lib/earnings.ts) perché cambiano spesso.

export type EventKind = "banche" | "macro" | "trimestrali" | "elezioni" | "mercati";
export type MarketEvent = { date: string; time?: string; kind: EventKind; title: string; note?: string; symbol?: string };

export const EVENT_LABEL: Record<EventKind, string> = {
  banche: "Banche centrali",
  macro: "Dati macro",
  trimestrali: "Trimestrali",
  elezioni: "Elezioni",
  mercati: "Mercati",
};

export const STATIC_EVENTS: MarketEvent[] = [
  // Banche centrali
  { date: "2026-10-28", time: "19:00", kind: "banche", title: "Fed: decisione sui tassi (FOMC)", note: "Riunione del 27-28 ottobre" },
  { date: "2026-10-29", time: "14:15", kind: "banche", title: "BCE: decisione sui tassi", note: "Conferenza stampa alle 14:45" },
  { date: "2026-11-05", time: "13:00", kind: "banche", title: "Bank of England: decisione sui tassi", note: "Con il Monetary Policy Report" },
  { date: "2026-12-09", time: "20:00", kind: "banche", title: "Fed: decisione sui tassi (FOMC)", note: "Con le nuove proiezioni economiche (dot plot)" },
  { date: "2026-12-17", time: "14:15", kind: "banche", title: "BCE: decisione sui tassi", note: "Con le proiezioni macro dello staff" },
  { date: "2026-12-17", time: "13:00", kind: "banche", title: "Bank of England: decisione sui tassi" },
  { date: "2026-12-17", kind: "banche", title: "Bank of Japan: riunione di politica monetaria" },
  // Dati macro USA (orari italiani)
  { date: "2026-11-03", time: "16:00", kind: "macro", title: "USA: JOLTS, posti di lavoro vacanti", note: "Dati di settembre" },
  { date: "2026-11-06", time: "14:30", kind: "macro", title: "USA: rapporto sul lavoro (payrolls)", note: "Dati di ottobre" },
  { date: "2026-11-10", time: "14:30", kind: "macro", title: "USA: inflazione CPI", note: "Dati di ottobre" },
  { date: "2026-11-13", time: "14:30", kind: "macro", title: "USA: prezzi alla produzione PPI", note: "Dati di ottobre" },
  { date: "2026-12-01", time: "16:00", kind: "macro", title: "USA: JOLTS, posti di lavoro vacanti", note: "Dati di ottobre" },
  { date: "2026-12-04", time: "14:30", kind: "macro", title: "USA: rapporto sul lavoro (payrolls)", note: "Dati di novembre" },
  { date: "2026-12-10", time: "14:30", kind: "macro", title: "USA: inflazione CPI", note: "Dati di novembre" },
  { date: "2026-12-15", time: "14:30", kind: "macro", title: "USA: prezzi alla produzione PPI", note: "Dati di novembre" },
  // Elezioni
  { date: "2026-11-03", kind: "elezioni", title: "USA: elezioni di metà mandato", note: "Si rinnovano la Camera e un terzo del Senato" },
  { date: "2026-11-07", kind: "elezioni", title: "Nuova Zelanda: elezioni politiche" },
  { date: "2026-11-29", kind: "elezioni", title: "Spagna: elezioni politiche", note: "Congresso e Senato" },
  // Mercati
  { date: "2026-11-20", kind: "mercati", title: "Scadenza mensile delle opzioni", note: "Terzo venerdì del mese" },
  { date: "2026-11-26", kind: "mercati", title: "USA: borse chiuse (Thanksgiving)" },
  { date: "2026-11-27", kind: "mercati", title: "USA: seduta corta (Black Friday)" },
  { date: "2026-12-18", kind: "mercati", title: "Quadruple witching", note: "Scadenza trimestrale di opzioni e futures: occhio al rollover" },
  { date: "2026-12-24", kind: "mercati", title: "Borsa Italiana chiusa, USA seduta corta" },
  { date: "2026-12-25", kind: "mercati", title: "Natale: borse chiuse", note: "La finestra 9 usa l'ultima chiusura disponibile" },
  { date: "2026-12-31", kind: "mercati", title: "Ultimo giorno: valutazione finale", note: "Borsa Italiana chiusa, vale l'ultima chiusura disponibile" },
];
