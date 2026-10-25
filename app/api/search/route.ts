import { NextResponse } from "next/server";
import { search } from "@/lib/prices";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);
  try {
    return NextResponse.json(await search(q));
  } catch {
    return NextResponse.json({ error: "Ricerca non disponibile" }, { status: 502 });
  }
}
