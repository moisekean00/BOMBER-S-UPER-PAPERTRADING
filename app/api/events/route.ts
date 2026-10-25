import { NextResponse } from "next/server";
import { STATIC_EVENTS } from "@/lib/events";
import { earningsEvents } from "@/lib/earnings";
import { adminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await adminClient().from("positions").select("symbol,kind");
  const held = [...new Set((data ?? []).filter((p) => p.kind === "stock").map((p) => p.symbol as string))];
  const earnings = await earningsEvents(held, today, "2026-12-31").catch(() => []);
  const events = [...STATIC_EVENTS, ...earnings].filter((e) => e.date >= today).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
  return NextResponse.json(events);
}
