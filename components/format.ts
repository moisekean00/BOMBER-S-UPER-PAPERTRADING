export const eur = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || !isFinite(n)
    ? "—"
    : n.toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: digits, minimumFractionDigits: digits });

export const pctChange = (n: number | null | undefined) =>
  n === null || n === undefined || !isFinite(n) ? "—" : `${n >= 0 ? "+" : ""}${(n * 100).toLocaleString("it-IT", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`;

export const cls = (n: number | null | undefined) => (n === null || n === undefined ? "muted" : n >= 0 ? "up" : "down");

export const shortDate = (d: string | null) =>
  d ? new Date(`${d}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "short" }) : "";

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
