import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UGC Review Generator",
  description: "Generate UGC review prompts and Zeely-style local lead ad packets.",
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
