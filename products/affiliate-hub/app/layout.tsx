import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "High-Ticket Affiliate Hub - Best Programs for 2026",
  description: "Discover the most lucrative high-ticket affiliate programs with detailed commission structures, lifetime values, and audience targeting.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 2026-11-10 Codex WR #18330-18332: original body retained; navigation added below.
      <body className="antialiased">{children}</body>
      */}
      <body className="antialiased"><nav aria-label="Product navigation" className="px-6 py-3"><a href="/pricing" className="underline">Pricing</a></nav>{children}</body>
    </html>
  );
}
