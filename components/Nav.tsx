"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { Logo } from "./Logo";
import { Countdown } from "./Countdown";

const LINKS = [
  ["/dashboard", "Home"],
  ["/portfolio", "Il mio portafoglio"],
  ["/lega", "La lega"],
  ["/regolamento", "Regolamento"],
];

export function Nav({ trader, admin }: { trader: string; admin: boolean }) {
  const path = usePathname();
  const router = useRouter();
  async function logout() {
    await browserClient().auth.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <header className="topbar">
      <Link href="/dashboard" style={{ textDecoration: "none" }}><Logo size={34} /></Link>
      <nav>
        {[...LINKS, ...(admin ? [["/admin", "Commissario"]] : [])].map(([href, label]) => (
          <Link key={href} href={href} className={path.startsWith(href) ? "active" : ""}>{label}</Link>
        ))}
      </nav>
      <div className="spacer" />
      <Countdown compact />
      <span className="chip">{trader}</span>
      <button className="btn ghost small" onClick={logout}>Esci</button>
    </header>
  );
}
