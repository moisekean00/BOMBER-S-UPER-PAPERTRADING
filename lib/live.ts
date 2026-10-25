import "server-only";
import { liveFx, quotes } from "./prices";
import type { Position, Prices, Fx } from "./rules";

export async function livePrices(positions: Position[]): Promise<{ prices: Prices; fx: Fx }> {
  const prices: Prices = {};
  let fx: Fx = {};
  try {
    for (const q of await quotes(positions.map((p) => p.symbol))) prices[q.symbol] = q.price;
    fx = await liveFx(positions.map((p) => p.currency));
  } catch (err) {
    console.error("prezzi live", err);
  }
  return { prices, fx };
}
