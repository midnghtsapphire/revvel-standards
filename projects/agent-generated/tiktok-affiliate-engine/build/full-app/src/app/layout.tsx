import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "TikTok Affiliate Engine",
  description: "TikTok Affiliate Engine helps creators and brands scale affiliate revenue with a focused TikTok growth and conversion workflow.",
  openGraph: {
    title: "TikTok Affiliate Engine",
    description: "TikTok Affiliate Engine helps creators and brands scale affiliate revenue with a focused TikTok growth and conversion workflow.",
    siteName: "TikTok Affiliate Engine",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TikTok Affiliate Engine",
    description: "TikTok Affiliate Engine helps creators and brands scale affiliate revenue with a focused TikTok growth and conversion workflow.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
