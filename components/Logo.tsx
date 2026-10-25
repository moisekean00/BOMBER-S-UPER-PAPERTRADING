import { BRAND, BRAND_SUB } from "@/lib/brand";

/** Icona stile app: pallone e moneta da un euro su fondo blu notte. */
export function LogoMark({ size = 40 }: { size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" width={size} height={size} alt="" style={{ display: "block", borderRadius: size * 0.23 }} />;
}

export function Logo({ size = 40, light = false, stacked = false }: { size?: number; light?: boolean; stacked?: boolean }) {
  const color = light ? "#fff" : "var(--navy)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: size * 0.3 }}>
      <LogoMark size={size} />
      <span style={{ display: "flex", flexDirection: stacked ? "column" : "row", alignItems: stacked ? "flex-start" : "baseline", gap: stacked ? 0 : size * 0.15, lineHeight: 1 }}>
        <span style={{ fontWeight: 800, fontSize: size * 0.46, letterSpacing: "-0.03em", color }}>{BRAND}</span>
        <span style={{ fontWeight: 500, fontSize: size * (stacked ? 0.3 : 0.46), letterSpacing: "-0.02em", color, opacity: 0.6, marginTop: stacked ? size * 0.08 : 0 }}>{BRAND_SUB}</span>
      </span>
    </span>
  );
}
