import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { quotes } from "@/lib/prices";
import { dbUrl, migrate } from "@/lib/migrate";

export const dynamic = "force-dynamic";

// Diagnostica pubblica: dice solo cosa funziona, senza dati né chiavi.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out: Record<string, unknown> = {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url ? url.replace(/^https:\/\/([a-z]{4}).*/, "https://$1…") : false,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anon ? `${anon.slice(0, 12)}…` : false,
      SUPABASE_SERVICE_ROLE_KEY: service ? `${service.slice(0, 9)}… (${service.length} car.)` : false,
      ADMIN_EMAILS: !!process.env.ADMIN_EMAILS,
      CRON_SECRET: !!process.env.CRON_SECRET,
      POSTGRES_URL: dbUrl() ? dbUrl().replace(/\/\/[^@]*@/, "//***@").replace(/^(postgres(?:ql)?:\/\/\*\*\*@[^:/]+).*/, "$1…") : false,
    },
    migrate: await migrate(),
  };
  if (url && service) {
    const db = createClient(url, service, { auth: { persistSession: false } });
    for (const t of ["profiles", "positions", "lineups", "prices", "snapshots", "ledger", "jobs"]) {
      const r = await db.from(t).select("*", { count: "exact" }).limit(1);
      out[`table_${t}`] = r.error ? `ERRORE: ${r.error.message}` : `ok (${r.count ?? 0} righe)`;
    }
    const users = await db.auth.admin.listUsers({ perPage: 50 });
    out.auth_users = users.error ? `ERRORE: ${users.error.message}` : users.data.users.length;
    const { data: jobs } = await db.from("jobs").select("key,status,error");
    out.jobs = jobs;
  }
  try {
    const q = await quotes(["ENI.MI", "^GSPC"]);
    out.yahoo = q.map((x) => `${x.symbol} ${x.price}`);
  } catch (e) {
    out.yahoo = `ERRORE: ${(e as Error).message}`;
  }
  return NextResponse.json(out);
}
