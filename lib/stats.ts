// Statistiche di rischio su serie di prezzi giornalieri. Funzioni pure.

export type Series = (number | null)[];

/** Rendimenti giornalieri (salta i giorni senza prezzo). */
export function returns(s: Series) {
  const out: number[] = [];
  let prev: number | null = null;
  for (const v of s) {
    if (v === null || !isFinite(v)) continue;
    if (prev !== null && prev > 0) out.push(v / prev - 1);
    prev = v;
  }
  return out;
}

/** Rendimenti allineati per data: null dove manca un prezzo. */
export function alignedReturns(s: Series): (number | null)[] {
  const out: (number | null)[] = [null];
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1], b = s[i];
    out.push(a !== null && b !== null && a > 0 ? b / a - 1 : null);
  }
  return out;
}

const mean = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;

export function annualVol(r: number[]) {
  if (r.length < 5) return null;
  const m = mean(r);
  return Math.sqrt(r.reduce((s, v) => s + (v - m) ** 2, 0) / (r.length - 1)) * Math.sqrt(252);
}

function pairs(a: (number | null)[], b: (number | null)[]) {
  const x: number[] = [], y: number[] = [];
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== null && b[i] !== null) { x.push(a[i]!); y.push(b[i]!); }
  }
  return { x, y };
}

export function correlation(a: (number | null)[], b: (number | null)[]) {
  const { x, y } = pairs(a, b);
  if (x.length < 5) return null;
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : null;
}

/** Beta rispetto al benchmark. */
export function beta(asset: (number | null)[], bench: (number | null)[]) {
  const { x, y } = pairs(asset, bench);
  if (x.length < 5) return null;
  const mx = mean(x), my = mean(y);
  let cov = 0, v = 0;
  for (let i = 0; i < x.length; i++) {
    cov += (x[i] - mx) * (y[i] - my);
    v += (y[i] - my) ** 2;
  }
  return v ? cov / v : null;
}

export function maxDD(s: Series) {
  let peak = -Infinity, dd = 0;
  for (const v of s) {
    if (v === null) continue;
    peak = Math.max(peak, v);
    dd = Math.min(dd, v / peak - 1);
  }
  return dd;
}

/** Serie in base 100 dal primo prezzo disponibile. */
export function rebase(s: Series): Series {
  const first = s.find((v) => v !== null && v > 0);
  return first ? s.map((v) => (v === null ? null : (v / first) * 100)) : s.map(() => null);
}

/** Book a pesi costanti di oggi (buy and hold dall'inizio del periodo).
 *  weights: esposizione / NAV, con segno; il resto è cash a rendimento zero. */
export function bookIndex(series: Record<string, Series>, weights: Record<string, number>, length: number): Series {
  const reb = Object.fromEntries(Object.entries(series).map(([k, s]) => [k, rebase(s)]));
  const out: Series = [];
  for (let i = 0; i < length; i++) {
    let v = 100;
    for (const [k, w] of Object.entries(weights)) {
      const s = reb[k];
      if (!s) continue;
      // Prima che il titolo abbia un prezzo vale 100 (nessuna variazione).
      let p: number | null = null;
      for (let j = i; j >= 0 && p === null; j--) p = s[j];
      v += w * ((p ?? 100) - 100);
    }
    out.push(v);
  }
  return out;
}

/** VaR parametrico a 1 giorno al 95%, in percentuale del NAV (numero positivo = perdita). */
export function var95(r: number[]) {
  const vol = annualVol(r);
  return vol === null ? null : 1.645 * (vol / Math.sqrt(252)) - mean(r);
}
