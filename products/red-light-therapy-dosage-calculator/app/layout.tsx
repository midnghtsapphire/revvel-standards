import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red Light Therapy Dosage Calculator",
  description:
    "Mobile-friendly universal dosage calculator for red light therapy and photobiomodulation sessions.",
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
