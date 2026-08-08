import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blue Team Audit Console — Agent Trace Review (Greenfield Compatible)',
  description:
    'Production blue-team SaaS console for auditing agent traces. Timeline review, flags, notes, groups, and greenfield-ui-compatible AI_AUDIT.md export.',
  keywords: [
    'blue team audit',
    'agent trace review',
    'greenfield ui',
    'redlogs',
    'AI audit',
    'commit timeline audit',
    'agent observability',
    'defensive security audit UI',
    'AI_AUDIT.md',
    'SaaS audit console',
  ],
  openGraph: {
    title: 'Blue Team Audit Console',
    description:
      'Audit agent sessions event-by-event. Flag, annotate, group, and export greenfield-compatible audit bundles.',
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
      <body>{children}</body>
    </html>
  );
}
