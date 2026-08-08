import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "pplx-api Skills Console — Perplexity tools, BOM & research",
  description:
    "Production-ready Perplexity API integration with skills/tools framework, authentication, rate limiting, BOM lookup, and monitoring.",
  keywords: [
    "perplexity api",
    "pplx-api",
    "perplexity skills",
    "perplexity agent api tools",
    "web_search tool",
    "mcp perplexity",
    "sonar pro api",
    "ai research api integration",
    "bill of materials api registry",
    "revvel pplx skills",
  ],
  openGraph: {
    title: "pplx-api Skills Console",
    description:
      "Integrate Perplexity chat + Agent skills with auth, rate limits, BOM mapping, and live monitoring.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
