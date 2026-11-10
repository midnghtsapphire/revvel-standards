import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Video Toolkit - Faceless YouTube Automation Tools",
  description: "Complete resource guide for building automated faceless YouTube channels with AI tools. Scripts, voiceovers, editing, and more.",
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
