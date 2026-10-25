import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase/server";
import { analysts } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!(await currentUser())) return NextResponse.json({ error: "login" }, { status: 401 });
  const s = new URL(req.url).searchParams.get("s")?.trim().toUpperCase();
  if (!s) return NextResponse.json({ error: "Simbolo mancante" }, { status: 400 });
  try {
    return NextResponse.json(await analysts(s));
  } catch {
    return NextResponse.json({ error: `Nessun dato analisti per ${s}` }, { status: 404 });
  }
}
