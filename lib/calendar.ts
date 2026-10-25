// Calendario del torneo. Tutti gli orari sono in ora italiana (CET, +01:00:
// l'ora legale finisce il 25 ottobre 2026, quindi vale per tutta la stagione).
// Per cambiare la scadenza delle finestre basta cambiare CLOSE_TIME.

export const CLOSE_TIME = "23:59:59";
export const START_CAPITAL = 100_000;

export type Window = {
  id: number;
  label: string;
  opensAt: string; // ISO
  closesAt: string; // ISO
  priceDate: string; // venerdì di riferimento (YYYY-MM-DD)
  first: boolean; // finestra libera, senza limite del 50%
  demo: boolean; // finestra di prova: a fine prova i portafogli si azzerano
};

const tz = "+01:00";
const at = (date: string, time: string) => `${date}T${time}${tz}`;

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Venerdì di riferimento di ogni finestra reale (sezione 3 del regolamento).
const FRIDAYS = [
  "2026-10-30",
  "2026-11-06",
  "2026-11-13",
  "2026-11-20",
  "2026-11-27",
  "2026-12-04",
  "2026-12-11",
  "2026-12-18",
  "2026-12-25", // borse chiuse: vale l'ultima chiusura disponibile
];

export const WINDOWS: Window[] = [
  {
    id: 0,
    label: "Mercato di prova",
    opensAt: at("2026-10-25", "00:00:00"),
    closesAt: at("2026-10-30", "18:00:00"),
    priceDate: "2026-10-23",
    first: true,
    demo: true,
  },
  ...FRIDAYS.map((friday, i) => ({
    id: i + 1,
    label: i === 0 ? "Finestra 1 · prima formazione" : i === FRIDAYS.length - 1 ? `Finestra ${i + 1} · ultima` : `Finestra ${i + 1}`,
    opensAt: at(addDays(friday, 1), "00:00:00"),
    closesAt: at(addDays(friday, 2), CLOSE_TIME),
    priceDate: friday,
    first: i === 0,
    demo: false,
  })),
];

// Date di valutazione ufficiale: ogni venerdì più la chiusura finale del 31/12.
export const FINAL_DATE = "2026-12-31";
export const VALUATION_DATES = [...FRIDAYS, FINAL_DATE];

// La valutazione del venerdì parte alla mezzanotte italiana, dopo la chiusura USA.
export function valuationTime(date: string) {
  return at(addDays(date, 1), "00:00:00");
}

export function currentWindow(now = new Date()): Window | null {
  return WINDOWS.find((w) => now >= new Date(w.opensAt) && now <= new Date(w.closesAt)) ?? null;
}

export function nextWindow(now = new Date()): Window | null {
  return WINDOWS.find((w) => new Date(w.opensAt) > now) ?? null;
}

export function lastValuationDate(now = new Date()): string | null {
  const past = VALUATION_DATES.filter((d) => new Date(valuationTime(d)) <= now);
  return past.at(-1) ?? null;
}

export { addDays };
