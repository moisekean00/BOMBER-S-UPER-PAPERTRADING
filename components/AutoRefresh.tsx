"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Ricarica i dati della pagina ogni 2 minuti (prezzi live, classifica), tranne sul Mercato. */
export function AutoRefresh() {
  const router = useRouter();
  const path = usePathname();
  useEffect(() => {
    if (path.startsWith("/mercato")) return;
    const t = setInterval(() => document.visibilityState === "visible" && router.refresh(), 120_000);
    return () => clearInterval(t);
  }, [router, path]);
  return null;
}
