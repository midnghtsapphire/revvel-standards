import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chat Deployment Organizer | Revvel Finishers",
  description:
    "Filter huge research chats and organize them into the correct Finisher deployment order with paste-ready Work Requests.",
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
