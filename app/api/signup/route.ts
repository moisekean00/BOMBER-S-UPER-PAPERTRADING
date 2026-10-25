import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/server";

// Iscrizione senza email di conferma: l'utente nasce già confermato.
// Funziona anche se su Supabase "Confirm email" è rimasto acceso.
export async function POST(req: Request) {
  const { email, password, trader_name } = await req.json().catch(() => ({}));
  const name = String(trader_name ?? "").trim();
  const mail = String(email ?? "").trim().toLowerCase();
  if (!mail || String(password ?? "").length < 6 || name.length < 2 || name.length > 24) {
    return NextResponse.json({ error: "Servono email, password di almeno 6 caratteri e un nome da trader (2-24 caratteri)" }, { status: 400 });
  }
  const db = adminClient();
  const { data: taken } = await db.from("profiles").select("id").ilike("trader_name", name).maybeSingle();

  const created = await db.auth.admin.createUser({ email: mail, password, email_confirm: true, user_metadata: { trader_name: name } });
  if (!created.error) return NextResponse.json({ ok: true });

  if (!/already|registered|exists/i.test(created.error.message)) {
    const dup = /database|unique|duplicate/i.test(created.error.message) || taken;
    return NextResponse.json({ error: dup ? "Questo nome da trader è già preso, scegline un altro" : created.error.message }, { status: 400 });
  }

  // Email già usata: se l'iscrizione era rimasta in attesa di conferma, la completiamo.
  const { data: list } = await db.auth.admin.listUsers({ perPage: 1000 });
  const user = list?.users.find((u) => u.email?.toLowerCase() === mail);
  if (!user || user.email_confirmed_at) {
    return NextResponse.json({ error: "Questa email è già iscritta: accedi" }, { status: 400 });
  }
  if (taken && taken.id !== user.id) {
    return NextResponse.json({ error: "Questo nome da trader è già preso, scegline un altro" }, { status: 400 });
  }
  const upd = await db.auth.admin.updateUserById(user.id, { email_confirm: true, password, user_metadata: { trader_name: name } });
  if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 400 });
  await db.from("profiles").upsert({ id: user.id, trader_name: name }, { onConflict: "id" });
  return NextResponse.json({ ok: true });
}
