import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AccessibilityControls } from "@/components/AccessibilityControls";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Graphify Evaluator | Codebase Graphing Analysis",
  description: "Evaluate Graphify and other codebase visualization tools for production use.",
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
            <h1 className="text-xl font-bold">Graphify Evaluator</h1>
            <nav>
              <ul className="flex space-x-4">
                <li><a href="#" className="hover:text-gray-300">Home</a></li>
                <li><a href="#analysis" className="hover:text-gray-300">Analysis</a></li>
              </ul>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-5xl mx-auto p-6 w-full">
          {children}
        </main>

        <footer className="bg-gray-100 py-8 border-t border-gray-200 mt-auto">
          <div className="max-w-5xl mx-auto px-6 text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Revvel Standards. All rights reserved.
          </div>
        </footer>

        <AccessibilityControls />
      </body>
    </html>
  );
}
