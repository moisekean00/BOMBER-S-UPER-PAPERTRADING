import { KIND_LABEL, notional, positionValue, type Position, type Prices, type Fx } from "@/lib/rules";
import { eur, pctChange, cls } from "./format";

/** Portafoglio attivo con valori live (se disponibili). */
export function PositionsTable({ positions, cash, prices, fx }: { positions: Position[]; cash: number; prices: Prices; fx: Fx }) {
  const rows = positions.map((p) => {
    let value: number | null = null;
    let exposure: number | null = null;
    try {
      value = positionValue(p, prices, fx, true);
      if (p.kind === "future") exposure = notional(p, prices[p.symbol], fx);
    } catch {}
    return { p, value, exposure };
  });
  const total = cash + rows.reduce((s, r) => s + (r.value ?? 0), 0);
  if (!positions.length) return <p className="muted">Nessuna posizione: solo cash ({eur(cash)}).</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Titolo</th>
            <th>Tipo</th>
            <th className="r">Quantità</th>
            <th className="r">Prezzo</th>
            <th className="r">Valore</th>
            <th className="r">Peso</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ p, value, exposure }) => (
            <tr key={p.symbol}>
              <td>
                <div style={{ fontWeight: 700 }}>{p.symbol}</div>
                <div className="muted" style={{ fontSize: 12 }}>{p.name}</div>
              </td>
              <td>
                <span className="tag">{KIND_LABEL[p.kind]}{p.kind === "etp" || (p.debt ?? 0) > 0 ? ` ${p.leverage}x` : ""}</span>
                {(p.debt ?? 0) > 0 && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>prestito {eur(p.debt ?? 0)}</div>}
                {p.kind === "future" && <div className={`num ${p.qty >= 0 ? "up" : "down"}`} style={{ fontSize: 12, marginTop: 4 }}>{p.qty >= 0 ? "Long" : "Short"} {eur(Math.abs(exposure ?? 0))}</div>}
              </td>
              <td className="r num">{p.qty.toLocaleString("it-IT", { maximumFractionDigits: 4 })}</td>
              <td className="r num">{prices[p.symbol]?.toLocaleString("it-IT", { maximumFractionDigits: 4 }) ?? "—"} <span className="muted" style={{ fontSize: 12 }}>{p.currency}</span></td>
              <td className="r num">
                {eur(value)}
                {p.kind === "future" && value !== null && <div className={cls(value - p.margin)} style={{ fontSize: 12 }}>P&L sett. {eur(value - p.margin)}</div>}
              </td>
              <td className="r num">{value === null ? "—" : pctChange(value / total).replace("+", "")}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} style={{ fontWeight: 700 }}>Cash</td>
            <td className="r num">{eur(cash)}</td>
            <td className="r num">{pctChange(cash / total).replace("+", "")}</td>
          </tr>
          <tr>
            <td colSpan={4} style={{ fontWeight: 800 }}>Totale (live)</td>
            <td className="r num" style={{ fontWeight: 800 }}>{eur(total)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}
