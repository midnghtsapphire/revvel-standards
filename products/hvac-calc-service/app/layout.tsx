import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HVAC Load Calculator — Free BTU & Equipment Sizing Tool",
  description:
    "Free HVAC load calculator: compute heating & cooling loads (Manual J), size equipment (Manual S), size ducts (Manual D), and estimate annual energy costs. For contractors, engineers, and homeowners.",
  keywords: [
    "HVAC load calculator",
    "Manual J calculation",
    "BTU calculator",
    "HVAC equipment sizing",
    "cooling load calculator",
    "heating load calculator",
    "SEER2 energy calculator",
    "duct sizing calculator",
    "HVAC contractor tools",
    "air conditioning BTU calculator",
    "heat pump sizing",
    "ACCA Manual J online",
  ],
  openGraph: {
    title: "HVAC Load Calculator — Free BTU & Equipment Sizing Tool",
    description:
      "Calculate HVAC heating and cooling loads, size equipment and ducts, and estimate energy costs. Based on ACCA Manual J/D/S and ASHRAE standards.",
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
