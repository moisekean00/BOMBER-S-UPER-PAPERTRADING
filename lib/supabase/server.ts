import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Client con la sessione del giocatore: legge rispettando le regole di accesso. */
export function userClient() {
  const store = cookies();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // chiamato da un Server Component: il middleware rinnova la sessione
        }
      },
    },
  });
}

/** Client di servizio: solo lato server, per le scritture già validate. */
export function adminClient() {
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

export async function currentUser() {
  const { data } = await userClient().auth.getUser();
  return data.user;
}
