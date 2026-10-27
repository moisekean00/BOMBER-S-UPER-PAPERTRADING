import { redirect } from "next/navigation";
import { Nav } from "@/components/Nav";
import { TickerRail } from "@/components/TickerRail";
import { AutoRefresh } from "@/components/AutoRefresh";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { ensureState } from "@/lib/engine";
import { ensureProfile, isAdmin } from "@/lib/game";
import { migrate } from "@/lib/migrate";

export const dynamic = "force-dynamic";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/login");
  await migrate();
  const profile = await ensureProfile(user);
  await ensureState().catch((e) => console.error("ensureState", e));
  const { data: mine } = await adminClient().from("positions").select("symbol,name,kind").eq("user_id", user.id);
  return (
    <>
      <AutoRefresh />
      <Nav trader={profile?.trader_name ?? "Trader"} admin={await isAdmin(user)} />
      <div className="shell">
        <main style={{ minWidth: 0 }}>{children}</main>
        <TickerRail mine={(mine ?? []).filter((m) => m.kind !== "option").map((m) => ({ symbol: m.symbol, name: m.name }))} />
      </div>
    </>
  );
}
