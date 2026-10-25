import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { currentWindow } from "@/lib/calendar";
import { ensureState } from "@/lib/engine";
import { lineupContext, saveLineup } from "@/lib/game";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  await ensureState().catch((e) => console.error(e));
  const w = currentWindow();
  if (!w) return NextResponse.json({ window: null });
  const ctx = await lineupContext(user.id, w);
  return NextResponse.json({ window: w, ...ctx });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const r = await saveLineup(user.id, Array.isArray(body.positions) ? body.positions : []);
  return NextResponse.json(r.body, { status: r.status });
}
