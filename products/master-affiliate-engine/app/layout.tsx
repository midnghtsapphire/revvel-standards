import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Master Affiliate Engine — Deploy Your Automated Pipeline",
  description:
    "A glassmorphic multi-agent affiliate link engine. Automate workflows, CRM integration, and report generation — deploy your snapshot in one click.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-gray-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
