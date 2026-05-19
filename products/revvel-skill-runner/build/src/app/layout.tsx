import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revvel Skill Runner",
  description: "Production skill execution engine — monetized via Polar.sh.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
