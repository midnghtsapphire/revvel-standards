import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Groq Code Review — AI PR reviewer with large-diff chunking",
  description:
    "Production SaaS and GitHub Action bundle that reviews pull request diffs with Groq LLMs, automatic chunking, local fallback, and consolidated PR comments.",
  keywords: [
    "Groq code review",
    "AI pull request review",
    "GitHub Action LLM review",
    "diff chunking",
    "llama code review",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-aurora">{children}</body>
    </html>
  );
}
