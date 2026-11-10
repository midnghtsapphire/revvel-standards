import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mac Screen Recorder Finder - Find Your Perfect Tool",
  description: "Compare the best Mac screen recording software. Find the perfect tool for demos, tutorials, team communication, and professional content creation.",
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
