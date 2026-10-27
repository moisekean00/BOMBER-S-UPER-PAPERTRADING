import { stars } from "@/lib/stars";
import { currentWindow } from "@/lib/calendar";
import { adminClient, currentUser } from "@/lib/supabase/server";
import { StarsView } from "@/components/StarsView";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export default async function StarsPage() {
  const user = (await currentUser())!;
  const open = !!currentWindow();
  const [data, { data: mine }] = await Promise.all([
    stars(),
    adminClient().from("positions").select("symbol").eq("user_id", user.id),
  ]);
  const held = new Set((mine ?? []).map((p) => p.symbol as string));
  return <StarsView data={data} open={open} held={held} />;
}
