import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Self-Optimizing Star Magnet | Organic GitHub Growth Engine",
  description:
    "TOS-compliant GitHub star growth dashboard: priority scoring, topic SEO, live badges, and PRIORITIZED_STARS.md generation — no paid APIs.",
  keywords: [
    "github stars",
    "github seo",
    "open source growth",
    "repository topics",
    "developer tools discovery",
    "mcp",
    "llm agents",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
