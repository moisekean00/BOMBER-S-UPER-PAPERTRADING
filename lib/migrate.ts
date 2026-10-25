import "server-only";
import postgres from "postgres";
import { SCHEMA_SQL } from "./schema";

// Se Vercel ha la connessione diretta a Postgres (integrazione Supabase),
// il sito crea da solo tabelle, trigger e permessi: una volta per avvio.
let done: Promise<string> | null = null;

export function dbUrl() {
  return process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL || process.env.DATABASE_URL || "";
}

export function migrate() {
  if (!done) done = run().catch((e) => { done = null; console.error("migrate", e); return `ERRORE: ${(e as Error).message}`; });
  return done;
}

async function run() {
  const url = dbUrl();
  if (!url) return "nessuna connessione Postgres";
  const sql = postgres(url.replace(/[?&]sslmode=[^&]*/, ""), { ssl: { rejectUnauthorized: false }, max: 1, prepare: false, idle_timeout: 5, connect_timeout: 10 });
  try {
    await sql.unsafe(SCHEMA_SQL);
    await sql.unsafe("notify pgrst, 'reload schema';");
    return "ok";
  } finally {
    await sql.end({ timeout: 5 });
  }
}
