import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenMythos — Mythic Worldbuilding Studio",
  description:
    "OpenMythos is a website UI for building characters, factions, timelines, and launch-ready story worlds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
