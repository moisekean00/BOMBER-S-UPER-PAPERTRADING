import { NextResponse } from "next/server";
import { ensureState } from "@/lib/engine";
import { migrate } from "@/lib/migrate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron: sabato e lunedì a mezzanotte (ora italiana).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await migrate();
  await ensureState();
  return NextResponse.json({ ok: true });
}
