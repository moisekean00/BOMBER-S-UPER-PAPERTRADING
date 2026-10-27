import Link from "next/link";
import type { Star, stars } from "@/lib/stars";

const pct = (v: number | null) => (v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toLocaleString("it-IT", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%`);
const price = (v: number | null) => (v === null ? "—" : v.toLocaleString("it-IT", { maximumFractionDigits: v < 10 ? 3 : 2, minimumFractionDigits: 2 }));
const cap = (v: number | null) => (v === null ? null : v >= 1e12 ? `${(v / 1e12).toLocaleString("it-IT", { maximumFractionDigits: 2 })} T` : `${Math.round(v / 1e9)} Mld`);

function Card({ s, open, held }: { s: Star; open: boolean; held: boolean }) {
  const t = s.low52 !== null && s.high52 !== null && s.price !== null && s.high52 > s.low52 ? (s.price - s.low52) / (s.high52 - s.low52) : null;
  return (
    <div className="star">
      <Link href={`/analytics?s=${encodeURIComponent(s.symbol)}`} className="star-top">
        <div style={{ minWidth: 0 }}>
          <b>{s.symbol}</b>
          <div className="muted ellipsis" style={{ fontSize: 12 }}>{s.name}</div>
          {held && <span className="tag" style={{ fontSize: 10, marginTop: 4, display: "inline-block" }}>nel tuo book</span>}
        </div>
        <span className={`pill ${s.change === null ? "" : s.change >= 0 ? "up" : "down"}`}>{pct(s.change)}</span>
      </Link>
      <div className="num" style={{ fontSize: 20, fontWeight: 700, margin: "8px 0 2px" }}>{price(s.price)} <span className="muted" style={{ fontSize: 12, fontWeight: 500 }}>{s.currency}</span></div>
      <div className="muted" style={{ fontSize: 11 }}>{[cap(s.marketCap), s.exchange].filter(Boolean).join(" · ")}</div>
      {t !== null && (
        <div title={`52 settimane: ${price(s.low52)} – ${price(s.high52)}`} style={{ marginTop: 10 }}>
          <div style={{ position: "relative", height: 4, background: "var(--bg)", borderRadius: 2 }}>
            <span style={{ position: "absolute", left: `calc(${t * 100}% - 4px)`, top: -2, width: 8, height: 8, borderRadius: 4, background: "var(--navy)" }} />
          </div>
          <div className="muted" style={{ fontSize: 10, display: "flex", justifyContent: "space-between", marginTop: 4 }}><span>min 52s</span><span>max 52s</span></div>
        </div>
      )}
      <div className="star-actions">
        {open ? <Link href={`/mercato?buy=${encodeURIComponent(s.symbol)}`} className="btn small">Compra</Link> : <span className="btn small ghost" style={{ opacity: 0.6 }}>Chiuso</span>}
        <Link href={`/analytics?s=${encodeURIComponent(s.symbol)}`} className="btn small ghost">Analisi</Link>
      </div>
    </div>
  );
}

function Movers({ title, list, open, held }: { title: string; list: Star[]; open: boolean; held: Set<string> }) {
  if (!list.length) return null;
  return (
    <div className="card">
      <h3>{title}</h3>
      {list.map((s) => (
        <div key={s.symbol} className="roster-row">
          <Link href={`/analytics?s=${encodeURIComponent(s.symbol)}`} style={{ minWidth: 0, color: "inherit" }}>
            <b>{s.symbol}</b> <span className="muted" style={{ fontSize: 12 }}>{s.name}</span>
          </Link>
          <div className="row" style={{ gap: 8, flexWrap: "nowrap" }}>
            <span className={`num ${s.change === null ? "" : s.change >= 0 ? "up" : "down"}`} style={{ fontWeight: 700, fontSize: 13 }}>{pct(s.change)}</span>
            {open && !held.has(s.symbol) && <Link href={`/mercato?buy=${encodeURIComponent(s.symbol)}`} className="btn small ghost">Compra</Link>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StarsView({ data, open, held }: { data: Awaited<ReturnType<typeof stars>>; open: boolean; held: Set<string> }) {
  const flat = data.groups.flatMap((g) => g.stars);
  const best = [...flat].filter((s) => s.change !== null).sort((a, b) => b.change! - a.change!);
  return (
    <div className="stack">
      <div className="card hero">
        <div className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>Star del mercato</div>
        <h1 style={{ margin: "4px 0 6px", fontSize: "1.9rem", color: "#fff" }}>I titoli di cui parlano tutti</h1>
        <p style={{ margin: 0, color: "rgba(255,255,255,0.8)" }}>Magnifiche 7, AI, Piazza Affari e i trending del giorno. Prezzi Yahoo con ~15&apos; di ritardo; nel torneo si compra comunque alla chiusura del venerdì.</p>
        {best.length > 0 && (
          <div className="row" style={{ gap: 8, marginTop: 14 }}>
            <span className="pill up" style={{ background: "rgba(18,161,80,0.2)" }}>🔥 {best[0].symbol} {pct(best[0].change)}</span>
            <span className="pill down" style={{ background: "rgba(229,72,77,0.2)" }}>❄️ {best.at(-1)!.symbol} {pct(best.at(-1)!.change)}</span>
          </div>
        )}
      </div>

      {data.trending.length > 0 && (
        <section>
          <div className="section-head"><div><div className="eyebrow">Trending ora</div><h2 style={{ margin: 0 }}>I più cercati su Yahoo Finance</h2></div></div>
          <div className="stars">{data.trending.slice(0, 8).map((s) => <Card key={s.symbol} s={s} open={open} held={held.has(s.symbol)} />)}</div>
        </section>
      )}

      {data.groups.map((g) => g.stars.length > 0 && (
        <section key={g.id}>
          <div className="section-head"><div><div className="eyebrow">{g.note}</div><h2 style={{ margin: 0 }}>{g.title}</h2></div></div>
          <div className="stars">{g.stars.map((s) => <Card key={s.symbol} s={s} open={open} held={held.has(s.symbol)} />)}</div>
        </section>
      ))}

      <div className="grid-3">
        <Movers title="🚀 Top gainer USA" list={data.gainers} open={open} held={held} />
        <Movers title="📉 Top loser USA" list={data.losers} open={open} held={held} />
        <Movers title="🔊 Più scambiati USA" list={data.actives} open={open} held={held} />
      </div>
      <p className="muted" style={{ fontSize: 12 }}>Aggiornato alle {new Date(data.at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })}. Gainer e loser solo sopra i 2 miliardi di capitalizzazione.</p>
    </div>
  );
}
