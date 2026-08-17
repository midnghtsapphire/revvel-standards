import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revvel CLI Engine — Glassmorphic Command Execution Platform",
  description:
    "A premium CLI agent engine that executes automations, generates PDF reports, and ships production-grade outputs — all from a beautifully designed glassmorphic terminal interface.",
  keywords: [
    "CLI engine",
    "command line agent",
    "terminal UI",
    "PDF export automation",
    "glassmorphic developer tool",
    "run and export",
    "revvel CLI",
  ],
  openGraph: {
    title: "Revvel CLI Engine",
    description: "Execute. Generate. Export. The premium CLI agent for production-grade automation.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-mono">{children}</body>
    </html>
  );
}
