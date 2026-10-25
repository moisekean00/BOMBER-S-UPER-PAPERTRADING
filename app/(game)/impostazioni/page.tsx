import { currentUser } from "@/lib/supabase/server";
import { ensureProfile } from "@/lib/game";
import { SettingsForm } from "@/components/SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = (await currentUser())!;
  const profile = await ensureProfile(user);
  return (
    <div className="stack">
      <div>
        <div className="eyebrow">Account</div>
        <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Impostazioni</h1>
      </div>
      <SettingsForm name={profile.trader_name} email={user.email ?? ""} paid={profile.paid} />
    </div>
  );
}
