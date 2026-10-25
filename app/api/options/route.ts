import { NextResponse } from "next/server";
import { optionChain } from "@/lib/prices";

export async function GET(req: Request) {
  const p = new URL(req.url).searchParams;
  const s = p.get("s")?.trim().toUpperCase();
  if (!s) return NextResponse.json({ error: "Manca il sottostante" }, { status: 400 });
  try {
    return NextResponse.json(await optionChain(s, p.get("date") ?? undefined));
  } catch {
    return NextResponse.json({ error: `Nessuna opzione quotata su ${s}` }, { status: 404 });
  }
}
