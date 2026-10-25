import { NextResponse } from "next/server";
import { currentWindow } from "@/lib/calendar";
import { instrument } from "@/lib/game";

export const dynamic = "force-dynamic";

// Chiusura del venerdì della finestra aperta, per l'anteprima nell'editor.
export async function GET(req: Request) {
  const symbol = new URL(req.url).searchParams.get("s")?.trim().toUpperCase();
  const w = currentWindow();
  if (!symbol || !w) return NextResponse.json({ error: "Mercato chiuso" }, { status: 400 });
  try {
    return NextResponse.json(await instrument(symbol, w.priceDate));
  } catch {
    return NextResponse.json({ error: `Nessuna chiusura per ${symbol} al ${w.priceDate}` }, { status: 404 });
  }
}
