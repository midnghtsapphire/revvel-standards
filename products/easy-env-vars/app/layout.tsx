import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Easy Env Vars — Safe GitHub Actions Environment Blocks',
  description:
    'Compose, validate, and export briantist/ezenv-compatible environment variable blocks with circular-reference detection and command-injection safeguards.',
  keywords: [
    'GitHub Actions',
    'environment variables',
    'GITHUB_ENV',
    'briantist/ezenv',
    'CI/CD',
    'shell parameter expansion',
    'easy env vars',
  ],
  openGraph: {
    title: 'Easy Env Vars',
    description:
      'Safe sequential env blocks for GitHub Actions with validation and workflow export.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
