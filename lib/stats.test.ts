import { test } from "node:test";
import assert from "node:assert/strict";
import { alignedReturns, beta, bookIndex, correlation, maxDD, rebase } from "./stats.ts";

test("rebase e max drawdown", () => {
  assert.deepEqual(rebase([null, 50, 75]), [null, 100, 150]);
  assert.equal(maxDD([100, 120, 90, 130]), 90 / 120 - 1);
});

test("beta e correlazione di una serie che amplifica il benchmark", () => {
  const bench = [100, 101, 99, 102, 100, 103, 104];
  const asset = [100]; // rendimenti doppi
  const rb = alignedReturns(bench);
  for (let i = 1; i < bench.length; i++) asset.push(asset[i - 1] * (1 + 2 * rb[i]!));
  const ra = alignedReturns(asset);
  assert.ok(Math.abs(beta(ra, rb)! - 2) < 1e-9);
  assert.ok(Math.abs(correlation(ra, rb)! - 1) < 1e-9);
});

test("book a pesi costanti: 50% su un titolo che sale del 20%", () => {
  const idx = bookIndex({ A: [10, 11, 12] }, { A: 0.5 }, 3);
  assert.deepEqual(idx.map((v) => Math.round(v! * 100) / 100), [100, 105, 110]);
});
