import { test } from "node:test";
import assert from "node:assert/strict";
import { applyLineup, settle, forcedSale, valuePortfolio, positionValue, type Position, type Prices } from "./rules.ts";

const pos = (symbol: string, kind: Position["kind"], qty: number, extra: Partial<Position> = {}): Position => ({
  symbol, name: symbol, kind, currency: "EUR", qty, multiplier: 1, leverage: 1, margin: 0,
  refPrice: null, expiry: null, underlying: null, strike: null, optType: null, ...extra,
});
const prices = { ENI: 10, VWCE: 100, AGGH: 50, ES: 5000, AAPL: 200, AAPLC: 5 };
const fx = { USD: 1.25 };
const base = [pos("ENI", "stock", 1000), pos("VWCE", "etf_equity", 500), pos("AGGH", "etf_bond", 1000)];
// 10k + 50k + 50k = 110k investiti

test("prima formazione da 100k: ok e cash residuo", () => {
  const r = applyLineup([], 100_000, [pos("ENI", "stock", 1000), pos("VWCE", "etf_equity", 400), pos("AGGH", "etf_bond", 200)], prices, fx, { first: true });
  assert.deepEqual(r.errors, []);
  assert.equal(r.cash, 100_000 - 10_000 - 40_000 - 10_000);
});

test("minimo 5% per tipo obbligatorio", () => {
  const r = applyLineup([], 100_000, [pos("ENI", "stock", 1000), pos("VWCE", "etf_equity", 400)], prices, fx, { first: true });
  assert.ok(r.warnings.some((e) => e.includes("ETF obbligazionario")));
});

test("limite del 50% sulle vendite", () => {
  // investito 110k -> si possono vendere 55k
  const ok = applyLineup(base, 0, [pos("ENI", "stock", 1000), pos("VWCE", "etf_equity", 60), pos("AGGH", "etf_bond", 800)], prices, fx, { first: false });
  assert.deepEqual(ok.errors, []);
  const tooMuch = applyLineup(base, 0, [pos("ENI", "stock", 1000), pos("VWCE", "etf_equity", 50), pos("AGGH", "etf_bond", 0.1)], prices, fx, { first: false });
  assert.ok(tooMuch.errors.some((e) => e.startsWith("Vendite")));
});

test("nessun cambio: nessun controllo sui minimi", () => {
  const r = applyLineup([pos("ENI", "stock", 1)], 99_990, [pos("ENI", "stock", 1)], prices, fx, { first: false });
  assert.equal(r.changed, false);
  assert.deepEqual(r.errors, []);
});

test("future: margine 20% in USD e regolamento del venerdì", () => {
  // 10 unità a 5000 USD = 50.000 USD = 40.000 € -> margine 8.000 €
  const fut = pos("ES", "future", 10, { currency: "USD" });
  const r = applyLineup(base, 20_000, [...base, fut], prices, fx, { first: false });
  assert.deepEqual(r.errors, []);
  const f = r.positions.find((p) => p.symbol === "ES")!;
  assert.equal(Math.round(f.margin), 8000);
  assert.equal(Math.round(r.cash), 12_000);
  // il venerdì dopo sale del 12%: +4.800 €
  const s = settle(r.positions, r.cash, { ...prices, ES: 5600 }, fx, {}, "2026-11-06");
  assert.equal(Math.round(s.cash), 16_800);
  assert.equal(s.positions.find((p) => p.symbol === "ES")!.refPrice, 5600);
});

test("future: chiusura conta nel 50% per il margine", () => {
  const fut = pos("ES", "future", 10, { currency: "USD", margin: 8000, refPrice: 5000 });
  const r = applyLineup([...base, fut], 0, base, prices, fx, { first: false });
  assert.equal(Math.round(r.sold), 8000);
  assert.equal(Math.round(r.cash), 8000);
});

test("opzione scaduta: valore intrinseco in cash", () => {
  const opt = pos("AAPLC", "option", 2, { currency: "USD", multiplier: 100, expiry: "2026-11-06", underlying: "AAPL", strike: 190, optType: "C" });
  const s = settle([opt], 0, prices, fx, {}, "2026-11-06");
  assert.equal(s.positions.length, 0);
  assert.equal(Math.round(s.cash), 1600); // 2*100*10/1.25
});

test("dividendi accreditati in cash", () => {
  const s = settle(base, 0, prices, fx, { ENI: 0.5 }, "2026-11-06");
  assert.equal(s.cash, 500);
});

test("vendita forzata proporzionale", () => {
  const r = forcedSale(base, -11_000, prices, fx);
  assert.ok(Math.abs(r.cash) < 1e-6);
  assert.equal(Math.round(valuePortfolio(r.positions, 0, prices, fx).invested), 99_000);
});

test("leva oltre 5x e scoperto rifiutati", () => {
  const r = applyLineup([], 100_000, [pos("X", "etp", 1, { leverage: 7 }), pos("ENI", "stock", -1)], { ...prices, X: 1 }, fx, { first: true });
  assert.ok(r.errors.some((e) => e.includes("leva")));
  assert.ok(r.errors.some((e) => e.includes("scoperto")));
});

test("acquisto a leva: capitale 10.000 con leva 3x, poi il titolo sale del 10%", () => {
  const p = { ENI: 10 } as Prices;
  const r = applyLineup([], 100_000, [pos("ENI", "stock", 3000, { leverage: 3 })], p, {}, { first: true });
  assert.equal(Math.round(r.cash), 90_000);
  const held = r.positions[0];
  assert.equal(Math.round(held.debt!), 20_000);
  assert.equal(Math.round(positionValue(held, { ENI: 11 }, {})), 13_000);
  assert.deepEqual(applyLineup([], 100_000, [pos("ENI", "stock", 10, { leverage: 6 })], p, {}, { first: true }).errors.filter((e) => e.includes("leva")).length, 1);
});

test("acquisto a leva: interessi settimanali sul prestito", () => {
  const held = pos("ENI", "stock", 3000, { leverage: 3, debt: 52_000 });
  const s = settle([held], 1000, { ENI: 10 }, {}, {}, "2026-11-06");
  assert.equal(Math.round(s.cash), 1000 - 50);
  assert.equal(s.ledger[0].kind, "interest");
});

test("acquisto a leva: vendere tutto restituisce solo il capitale netto e conta nel 50%", () => {
  const held = pos("ENI", "stock", 3000, { leverage: 3, debt: 20_000 });
  const keep = pos("VWCE", "etf_equity", 100);
  const r = applyLineup([held, keep], 0, [keep], { ENI: 11, VWCE: 100 }, {}, { first: false });
  assert.equal(Math.round(r.cash), 13_000);
  assert.equal(Math.round(r.sold), 13_000);
});
