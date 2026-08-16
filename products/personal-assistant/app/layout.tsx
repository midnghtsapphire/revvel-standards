import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Revvel Personal Assistant — Multi-Source → GitHub Structure",
  description:
    "Unify Gmail, Outlook, Yahoo, Keep, Drive, and SMS dumps into PII-safe GitHub directories, documentation, and commit plans. Multi-agent personal knowledge pipeline for revvel-standards.",
  keywords: [
    "personal assistant github",
    "multi agent inbox to repo",
    "gmail keep drive to markdown",
    "pii redaction personal knowledge base",
    "crewai langgraph alternative saas",
    "n8n personal data github automation",
    "revvel personal assistant",
    "structure emails into git folders",
  ],
  openGraph: {
    title: "Revvel Personal Assistant — Multi-Source → GitHub Structure",
    description:
      "Paste fragmented personal data from email, notes, and messages. Get a redacted, classified GitHub directory tree and commit plan in seconds.",
    type: "website",
  },
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
