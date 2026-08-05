import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FDA Design Controls Tracker — 21 CFR 820.30 Compliance Checklist',
  description:
    'Free interactive tool for medical device teams to track FDA Design Controls compliance per 21 CFR 820.30. Generate a Design History File (DHF) summary and export to Markdown or CSV.',
  keywords: [
    'FDA Design Controls',
    '21 CFR 820.30',
    'Design History File',
    'DHF generator',
    'medical device compliance',
    'design control checklist',
    'FDA quality system regulation',
    'design verification validation',
    'ISO 13485 design controls',
    'medical device development',
    'QSR design controls',
    'FDA 510k design controls',
  ],
  openGraph: {
    title: 'FDA Design Controls Tracker — 21 CFR 820.30 Compliance Checklist',
    description:
      'Interactive checklist for FDA Design Controls (21 CFR 820.30). Track design planning, inputs, outputs, reviews, V&V, transfer, and changes. Export your DHF summary.',
    type: 'website',
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
