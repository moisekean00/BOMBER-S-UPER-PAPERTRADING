import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";

// Impostazioni del giocatore: per ora il nome da trader.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "login" }, { status: 401 });
  const { traderName } = await req.json().catch(() => ({}));
  const name = String(traderName ?? "").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 24) return NextResponse.json({ error: "Il nome deve avere da 2 a 24 caratteri" }, { status: 400 });
  const db = adminClient();
  const { data: taken } = await db.from("profiles").select("id").ilike("trader_name", name.replace(/[%_\\]/g, "\\$&")).neq("id", user.id).limit(1).maybeSingle();
  if (taken) return NextResponse.json({ error: "Nome già preso da un altro trader" }, { status: 400 });
  const { error } = await db.from("profiles").update({ trader_name: name }).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await db.auth.admin.updateUserById(user.id, { user_metadata: { ...user.user_metadata, trader_name: name } });
  return NextResponse.json({ ok: true });
}
