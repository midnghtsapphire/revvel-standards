import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Creator Payout Tracker — Compare Platform Earnings 2025",
  description:
    "Compare creator platform payout rates across YouTube, TikTok, Patreon, Substack, Twitch, Kick, OnlyFans, and more. Free earnings calculator for content creators.",
  keywords: [
    "creator platform payout comparison",
    "which platform pays creators the most 2025",
    "creator earnings calculator",
    "youtube vs tiktok earnings",
    "kick vs twitch payout",
    "patreon vs substack creator revenue",
    "influencer monetization tracking",
    "platform payout rates influencer",
    "creator economy analytics",
    "social media monetization comparison",
  ],
  openGraph: {
    title: "Creator Payout Tracker — Compare Platform Earnings 2025",
    description:
      "Free tool: Compare creator platform payout rates and calculate estimated earnings across YouTube, TikTok, Patreon, Substack, Twitch, Kick and 8 more platforms.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-950 text-gray-100">{children}</body>
    </html>
  );
}
