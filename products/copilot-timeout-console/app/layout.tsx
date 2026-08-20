import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Copilot Timeout Console — 60m visiting-LLM floor',
  description:
    'Status console for the revvel-standards copilot / OpenRouter / visiting-LLM job timeout floor (60 minutes). Stops “maximum execution time of 10m0s” failures on long coding-agent runs.',
  keywords: [
    'GitHub Actions timeout-minutes',
    'OpenRouter timeout',
    'Copilot timeout',
    'visiting LLM',
    'agent-fallback',
    'maximum execution time of 10m0s',
    'revvel-standards',
  ],
  openGraph: {
    title: 'Copilot Timeout Console — revvel-standards',
    description:
      'Is the 60-minute floor held for Copilot, OpenRouter, and visiting LLM jobs?',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
