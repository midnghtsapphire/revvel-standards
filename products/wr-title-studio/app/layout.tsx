import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WR Title Studio",
  description:
    "Autocreate clean generic Work Request titles from messy notes. Deterministic templates, no API key.",
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
