import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greenfield UI Lab | revvel-standards",
  description:
    "Modernized idea board and day-wallet lab extracted from rgn/greenfield-ui patterns for the revvel-standards monorepo.",
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
