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
      <body className="antialiased">{children}</body>
    </html>
  );
}
