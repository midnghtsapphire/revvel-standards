import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AccessibilityControls } from "@/components/AccessibilityControls";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Life Wizard | High-Quality Insurance Leads",
  description: "Get premium, pre-qualified insurance leads for ACA, Life, Health, and Medicare agents. Boost your sales with our exclusive live transfers and outbound leads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 min-h-screen flex flex-col`}>
        <header className="bg-gray-900 text-white p-4">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold">Life Wizard</h1>
            <nav>
              <ul className="flex space-x-4">
                <li><a href="#" className="hover:text-gray-300">Home</a></li>
                <li><a href="#what-we-offer" className="hover:text-gray-300">What We Offer</a></li>
                <li><a href="#how-it-works" className="hover:text-gray-300">How It Works</a></li>
              </ul>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto p-6 w-full">
          {children}
        </main>

        <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm border-t border-gray-800 mt-auto">
          <div className="container mx-auto px-4">
            <p>&copy; {new Date().getFullYear()} Life Wizard. All rights reserved.</p>
            <p className="mt-2">High-Quality Insurance Leads - Live Transfers & Exclusive Outbound</p>
          </div>
        </footer>

        <AccessibilityControls />
      </body>
    </html>
  );
}
