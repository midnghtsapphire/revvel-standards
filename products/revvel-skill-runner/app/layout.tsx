import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revvel Skill Runner — Run AI Skills Instantly",
  description:
    "Browse and run AI-powered skills from the Revvel skills registry. Automate workflows, generate content, and ship products faster with one click.",
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
