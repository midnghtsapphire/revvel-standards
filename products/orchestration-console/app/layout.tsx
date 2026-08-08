import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revvel Orchestration Console",
  description:
    "SaaS console for multi-persona orchestration: structural Markdown heal, file registry validation, and n8n OAuth parameters.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
