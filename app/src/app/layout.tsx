import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./game.css";

// Pages are rendered per request: the CSP nonce (set in proxy.ts) can only be applied to dynamic renders.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "MeriQuest", template: "%s · MeriQuest" },
  description: "Internal learning game for Meristem staff.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
