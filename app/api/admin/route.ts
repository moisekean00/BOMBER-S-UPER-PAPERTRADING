import { NextResponse } from "next/server";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/game";

// Commissario: segna chi ha pagato la quota.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!(await isAdmin(user))) return NextResponse.json({ error: "Solo il commissario" }, { status: 403 });
  const { userId, paid } = await req.json();
  const { error } = await adminClient().from("profiles").update({ paid: !!paid }).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
