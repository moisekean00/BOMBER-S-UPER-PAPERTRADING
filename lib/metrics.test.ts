import { test } from "node:test";
import assert from "node:assert/strict";
import { weeklyReturns, volatility, sharpe, maxDrawdown, topPick } from "./metrics.ts";

const h = [100, 110, 99, 120].map((total, i) => ({ date: `2026-11-0${i + 1}`, total }));

test("rendimenti, drawdown e volatilità", () => {
  const r = weeklyReturns(h);
  assert.equal(r.length, 3);
  assert.ok(Math.abs(r[0] - 0.1) < 1e-9);
  assert.ok(Math.abs(maxDrawdown(h)! - (99 / 110 - 1)) < 1e-9);
  assert.ok(volatility(r)! > 0);
  assert.ok(sharpe(r)! > 0);
  assert.equal(volatility([0.1]), null);
});

test("top pick con short sui futures", () => {
  const pos = (symbol: string, kind: any, qty: number) => ({ symbol, name: symbol, kind, currency: "EUR", qty, multiplier: 1, leverage: 1, margin: 0, refPrice: null, expiry: null, underlying: null, strike: null, optType: null });
  const t = topPick([pos("A", "stock", 1), pos("F", "future", -1)], { A: 105, F: 80 }, { A: 100, F: 100 }, {});
  assert.deepEqual(t, { symbol: "F", move: 0.19999999999999996 });
});
