import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BRAND_FULL, TAGLINE } from "@/lib/brand";

const body = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: BRAND_FULL,
  description: TAGLINE,
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={body.variable}>
      <body>{children}</body>
    </html>
  );
}
