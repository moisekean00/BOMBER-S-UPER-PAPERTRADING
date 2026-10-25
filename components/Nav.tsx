"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { Logo } from "./Logo";
import { Countdown } from "./Countdown";

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const LINKS: { href: string; label: string; icon: JSX.Element }[] = [
  { href: "/dashboard", label: "Home", icon: icon("M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z") },
  { href: "/mercato", label: "Mercato", icon: icon("M3 7h18l-1.5 12a2 2 0 0 1-2 1.8H6.5a2 2 0 0 1-2-1.8zM8 7a4 4 0 0 1 8 0") },
  { href: "/squadra", label: "La mia squadra", icon: icon("M4 19V9m6 10V5m6 14v-7m4 7H2") },
  { href: "/squadre", label: "Squadre", icon: icon("M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6m13 9v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8") },
  { href: "/regolamento", label: "Regole", icon: icon("M4 4h11l5 5v11H4zM14 4v6h6M8 13h8M8 17h5") },
];

export function Nav({ trader, admin }: { trader: string; admin: boolean }) {
  const path = usePathname();
  const router = useRouter();
  async function logout() {
    await browserClient().auth.signOut();
    router.push("/");
    router.refresh();
  }
  const links = admin ? [...LINKS.slice(0, 4), { href: "/admin", label: "Commissario", icon: LINKS[4].icon }, LINKS[4]] : LINKS;
  return (
    <>
      <header className="topbar">
        <Link href="/dashboard"><Logo size={32} light /></Link>
        <nav>
          {links.map((l) => <Link key={l.href} href={l.href} className={path.startsWith(l.href) ? "active" : ""}>{l.label}</Link>)}
        </nav>
        <div className="spacer" />
        <Countdown compact />
        <span className="who">{trader}</span>
        <button className="btn ghost small" onClick={logout}>Esci</button>
      </header>
      <nav className="tabbar">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={path.startsWith(l.href) ? "active" : ""}>
            {l.icon}
            {l.label === "La mia squadra" ? "Squadra" : l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
