import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Star Optimizer | Prioritize GitHub Stars",
  description:
    "Rank starred GitHub repositories by push recency, releases, popularity, and star age. Export Markdown reports or run the scheduled automation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
