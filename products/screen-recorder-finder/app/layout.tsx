import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mac Screen Recorder Finder - Find Your Perfect Tool",
  description: "Compare the best Mac screen recording software. Find the perfect tool for demos, tutorials, team communication, and professional content creation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
