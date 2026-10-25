import { NextResponse } from "next/server";
import { ensureState } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron: sabato e lunedì a mezzanotte (ora italiana).
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await ensureState();
  return NextResponse.json({ ok: true });
}
