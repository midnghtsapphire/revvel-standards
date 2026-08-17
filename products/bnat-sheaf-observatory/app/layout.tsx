import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BNAT Sheaf Observatory",
  description:
    "Interactive cellular sheaf cohomology, Laplacian energy, and topological fingerprints for multi-agent fleets.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-grid antialiased">{children}</body>
    </html>
  );
}
