import Link from "next/link";
import { KIND_LABEL } from "@/lib/rules";
import type { Order } from "@/lib/orders";
import { eur } from "./format";

const n = (v: number, d = 4) => v.toLocaleString("it-IT", { maximumFractionDigits: d });

/** Lista di operazioni: ogni riga si apre e mostra il dettaglio dell'ordine. */
export function OrderList({ orders, status }: { orders: (Order & { date?: string })[]; status: string }) {
  if (!orders.length) return <p className="muted">Nessuna operazione.</p>;
  return (
    <div className="orders">
      {orders.map((o, i) => (
        <details key={`${o.symbol}-${o.date ?? ""}-${i}`} className="order">
          <summary>
            <span className={`side ${o.side === "BUY" ? "buy" : "sell"}`}>{o.side}</span>
            <span className="grow" style={{ minWidth: 0 }}>
              <b>{o.symbol}</b> <span className="muted" style={{ fontSize: 13 }}>{o.name}</span>
              {o.date && <div className="muted" style={{ fontSize: 12 }}>prezzi del {new Date(`${o.date}T12:00:00Z`).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</div>}
            </span>
            <span className={`num ${o.amount >= 0 ? "" : "up"}`} style={{ fontWeight: 700 }}>{o.amount >= 0 ? "−" : "+"}{eur(Math.abs(o.amount))}</span>
          </summary>
          <dl>
            <dt>Stato</dt><dd>{status}</dd>
            <dt>Strumento</dt><dd>{KIND_LABEL[o.kind]}</dd>
            <dt>Prezzo di esecuzione</dt><dd className="num">{o.price === null ? "—" : `${n(o.price)} ${o.currency}`} <span className="muted">(chiusura del venerdì)</span></dd>
            <dt>{o.kind === "future" ? "Unità" : o.kind === "option" ? "Contratti" : "Quote"}</dt><dd className="num">{n(o.qtyBefore, 3)} → <b>{n(o.qtyAfter, 3)}</b></dd>
            <dt>{o.amount >= 0 ? "Cash impegnato" : "Cash liberato"}</dt><dd className="num">{eur(Math.abs(o.amount))}</dd>
            <dt>Esposizione dopo</dt><dd className="num">{eur(o.exposure)}</dd>
            {o.leverage > 1 && <><dt>Leva</dt><dd className="num">{o.leverage}x · prestito {eur(o.debt)}</dd></>}
            {o.kind === "future" && <><dt>Margine</dt><dd className="num">{eur(o.margin)}</dd></>}
          </dl>
          <Link href={`/analytics?s=${encodeURIComponent(o.symbol)}`} className="btn ghost small">Analisi del titolo</Link>
        </details>
      ))}
    </div>
  );
}
