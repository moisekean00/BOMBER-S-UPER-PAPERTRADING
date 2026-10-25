import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { TickerRail } from "@/components/TickerRail";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { ensureState } from "@/lib/engine";
import { isAdminEmail } from "@/lib/game";

export const dynamic = "force-dynamic";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  await ensureState().catch((e) => console.error("ensureState", e));
  const db = adminClient();
  const [{ data: profile }, { data: mine }] = await Promise.all([
    db.from("profiles").select("trader_name").eq("id", user.id).single(),
    db.from("positions").select("symbol,name,kind").eq("user_id", user.id),
  ]);
  return (
    <>
      <Nav trader={profile?.trader_name ?? "Trader"} admin={isAdminEmail(user.email)} />
      <div className="shell">
        <main style={{ minWidth: 0 }}>{children}</main>
        <TickerRail mine={(mine ?? []).filter((m) => m.kind !== "option").map((m) => ({ symbol: m.symbol, name: m.name }))} />
      </div>
    </>
  );
}
