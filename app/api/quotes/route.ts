import { NextResponse } from "next/server";
import { quotes } from "@/lib/prices";

export async function GET(req: Request) {
  const s = (new URL(req.url).searchParams.get("s") ?? "").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 60);
  try {
    return NextResponse.json(await quotes(s));
  } catch {
    return NextResponse.json({ error: "Prezzi non disponibili" }, { status: 502 });
  }
}
