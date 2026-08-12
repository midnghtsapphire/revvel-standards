import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Awesome Grok Build — Skill Browser & Install Planner",
  description:
    "Browse, search, and generate install plans for xAI Grok Build skills. Vendored from DominikTobureto/awesome-grok-build and wired into revvel-standards.",
  keywords: [
    "grok build",
    "xai",
    "awesome grok build",
    "coding agent skills",
    "AGENTS.md",
    "grokignore",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
