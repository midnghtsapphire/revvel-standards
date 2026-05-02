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
      <body className="antialiased">{children}</body>
    </html>
  );
}
