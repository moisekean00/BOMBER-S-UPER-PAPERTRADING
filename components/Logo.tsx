import { BRAND } from "@/lib/brand";

/** Pallone con la traiettoria di un lancio lungo che sale come un grafico. */
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lb-g" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0f9a60" />
          <stop offset="1" stopColor="#19c37d" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="#0c1d16" stroke="url(#lb-g)" strokeWidth="4" />
      <path d="M32 21 l8.5 6.2 -3.2 10 h-10.6 l-3.2 -10z" fill="#e8f3ec" opacity="0.9" />
      <path d="M32 21 v-9 M40.5 27.2 l8.5 -2.8 M37.3 37.2 l5.3 7.3 M26.7 37.2 l-5.3 7.3 M23.5 27.2 l-8.5 -2.8" stroke="#e8f3ec" strokeWidth="2" opacity="0.35" />
      <path d="M8 50 C 20 46, 26 40, 34 34 S 48 18, 56 12" fill="none" stroke="#f5c542" strokeWidth="4" strokeLinecap="round" />
      <path d="M48 11 L57 11 L56 20" fill="none" stroke="#f5c542" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = 40, big = false }: { size?: number; big?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: big ? 16 : 10 }}>
      <LogoMark size={size} />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          fontSize: big ? size * 0.62 : size * 0.5,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          color: "var(--text)",
          lineHeight: 1,
        }}
      >
        {BRAND}
      </span>
    </span>
  );
}
