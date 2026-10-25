// Calendario degli eventi che muovono i mercati durante la stagione.
// Date verificate il 25/10/2026 sui siti ufficiali (Fed, BCE, BoE, BLS, NBS cinese, Istat)
// e su ElectionGuide/Wikipedia; Eurostat, BoJ e rating da calendari pubblici di settore.
// Le trimestrali arrivano da Yahoo (lib/earnings.ts) perché cambiano spesso.

export type EventKind = "banche" | "macro" | "trimestrali" | "elezioni" | "mercati";
export type Area = "USA" | "Europa" | "Italia" | "Asia" | "Mondo";
export const AREAS: Area[] = ["Italia", "Europa", "USA", "Asia", "Mondo"];
export type MarketEvent = { date: string; time?: string; kind: EventKind; area: Area; title: string; note?: string; symbol?: string };

export const EVENT_LABEL: Record<EventKind, string> = {
  banche: "Banche centrali",
  macro: "Dati macro",
  trimestrali: "Trimestrali",
  elezioni: "Elezioni",
  mercati: "Mercati",
};

export const STATIC_EVENTS: MarketEvent[] = [
  // Banche centrali
  { date: "2026-10-28", time: "19:00", area: "USA", kind: "banche", title: "Fed: decisione sui tassi (FOMC)", note: "Riunione del 27-28 ottobre" },
  { date: "2026-10-29", time: "14:15", area: "Europa", kind: "banche", title: "BCE: decisione sui tassi", note: "Conferenza stampa alle 14:45" },
  { date: "2026-11-05", time: "13:00", area: "Europa", kind: "banche", title: "Bank of England: decisione sui tassi", note: "Con il Monetary Policy Report" },
  { date: "2026-12-09", time: "20:00", area: "USA", kind: "banche", title: "Fed: decisione sui tassi (FOMC)", note: "Con le nuove proiezioni economiche (dot plot)" },
  { date: "2026-12-17", time: "14:15", area: "Europa", kind: "banche", title: "BCE: decisione sui tassi", note: "Con le proiezioni macro dello staff" },
  { date: "2026-12-17", time: "13:00", area: "Europa", kind: "banche", title: "Bank of England: decisione sui tassi" },
  { date: "2026-10-30", time: "04:00", area: "Asia", kind: "banche", title: "Bank of Japan: decisione sui tassi", note: "Con l'Outlook Report trimestrale" },
  { date: "2026-12-18", time: "04:00", area: "Asia", kind: "banche", title: "Bank of Japan: decisione sui tassi", note: "Riunione del 17-18 dicembre" },
  // Dati macro USA (orari italiani)
  { date: "2026-11-03", time: "16:00", area: "USA", kind: "macro", title: "USA: JOLTS, posti di lavoro vacanti", note: "Dati di settembre" },
  { date: "2026-11-06", time: "14:30", area: "USA", kind: "macro", title: "USA: rapporto sul lavoro (payrolls)", note: "Dati di ottobre" },
  { date: "2026-11-10", time: "14:30", area: "USA", kind: "macro", title: "USA: inflazione CPI", note: "Dati di ottobre" },
  { date: "2026-11-13", time: "14:30", area: "USA", kind: "macro", title: "USA: prezzi alla produzione PPI", note: "Dati di ottobre" },
  { date: "2026-12-01", time: "16:00", area: "USA", kind: "macro", title: "USA: JOLTS, posti di lavoro vacanti", note: "Dati di ottobre" },
  { date: "2026-12-04", time: "14:30", area: "USA", kind: "macro", title: "USA: rapporto sul lavoro (payrolls)", note: "Dati di novembre" },
  { date: "2026-12-10", time: "14:30", area: "USA", kind: "macro", title: "USA: inflazione CPI", note: "Dati di novembre" },
  { date: "2026-12-15", time: "14:30", area: "USA", kind: "macro", title: "USA: prezzi alla produzione PPI", note: "Dati di novembre" },
  // Europa e Italia
  { date: "2026-11-04", time: "11:00", area: "Europa", kind: "macro", title: "Eurozona: inflazione flash (Eurostat)", note: "Dati di ottobre, orario da confermare" },
  { date: "2026-12-01", time: "11:00", area: "Europa", kind: "macro", title: "Eurozona: inflazione flash (Eurostat)", note: "Dati di novembre, orario da confermare" },
  { date: "2026-11-13", area: "Italia", kind: "macro", title: "S&P: revisione del rating dell'Italia", note: "Esce a borse chiuse, effetto su BTP e banche dal lunedì" },
  { date: "2026-11-17", area: "Italia", kind: "macro", title: "Italia: inflazione definitiva (Istat)", note: "Dati di ottobre" },
  { date: "2026-12-16", area: "Italia", kind: "macro", title: "Italia: inflazione definitiva (Istat)", note: "Dati di novembre" },
  { date: "2026-12-31", area: "Italia", kind: "macro", title: "Italia: termine per approvare la legge di bilancio 2027", note: "Il voto finale di solito arriva negli ultimi giorni di dicembre" },
  // Asia (orari italiani)
  { date: "2026-11-09", time: "02:30", area: "Asia", kind: "macro", title: "Cina: inflazione CPI e PPI", note: "Dati di ottobre (NBS)" },
  { date: "2026-11-10", area: "Asia", kind: "trimestrali", title: "TSMC: ricavi mensili", note: "Escono entro il 10 del mese: termometro della domanda di chip AI" },
  { date: "2026-11-11", area: "Asia", kind: "mercati", title: "Cina: Singles Day", note: "La giornata di shopping più grande al mondo: Alibaba, JD, PDD" },
  { date: "2026-11-16", time: "03:00", area: "Asia", kind: "macro", title: "Cina: produzione industriale e vendite al dettaglio", note: "Dati di ottobre (NBS)" },
  { date: "2026-11-30", time: "02:30", area: "Asia", kind: "macro", title: "Cina: PMI manifatturiero ufficiale", note: "Dati di novembre (NBS)" },
  { date: "2026-12-09", time: "02:30", area: "Asia", kind: "macro", title: "Cina: inflazione CPI e PPI", note: "Dati di novembre (NBS)" },
  { date: "2026-12-10", area: "Asia", kind: "trimestrali", title: "TSMC: ricavi mensili", note: "Dati di novembre" },
  { date: "2026-12-15", time: "03:00", area: "Asia", kind: "macro", title: "Cina: produzione industriale e vendite al dettaglio", note: "Dati di novembre (NBS)" },
  { date: "2026-12-31", time: "02:30", area: "Asia", kind: "macro", title: "Cina: PMI manifatturiero ufficiale", note: "Dati di dicembre (NBS)" },
  // Elezioni
  { date: "2026-11-28", area: "Asia", kind: "elezioni", title: "Taiwan: elezioni locali", note: "Sindaci e consigli di tutte le città: test per il governo, occhio a TSMC e alle tensioni con Pechino" },
  { date: "2026-11-03", area: "USA", kind: "elezioni", title: "USA: elezioni di metà mandato", note: "Si rinnovano la Camera e un terzo del Senato" },
  { date: "2026-11-07", area: "Asia", kind: "elezioni", title: "Nuova Zelanda: elezioni politiche" },
  { date: "2026-11-29", area: "Europa", kind: "elezioni", title: "Spagna: elezioni politiche", note: "Congresso e Senato" },
  // Mercati
  { date: "2026-11-20", area: "Mondo", kind: "mercati", title: "Scadenza mensile delle opzioni", note: "Terzo venerdì del mese" },
  { date: "2026-11-26", area: "USA", kind: "mercati", title: "USA: borse chiuse (Thanksgiving)" },
  { date: "2026-11-27", area: "USA", kind: "mercati", title: "USA: seduta corta (Black Friday)" },
  { date: "2026-12-18", area: "Mondo", kind: "mercati", title: "Quadruple witching", note: "Scadenza trimestrale di opzioni e futures: occhio al rollover" },
  { date: "2026-12-24", area: "USA", kind: "mercati", title: "Borsa Italiana chiusa, USA seduta corta" },
  { date: "2026-12-25", area: "Mondo", kind: "mercati", title: "Natale: borse chiuse", note: "La finestra 9 usa l'ultima chiusura disponibile" },
  { date: "2026-12-31", area: "Italia", kind: "mercati", title: "Ultimo giorno: valutazione finale", note: "Borsa Italiana chiusa, vale l'ultima chiusura disponibile" },
];
