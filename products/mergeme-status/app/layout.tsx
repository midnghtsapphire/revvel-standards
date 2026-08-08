import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MergeMe.dev Status — revvel-standards wiring',
  description:
    'Live answer to whether mergeme.dev is wired into midnghtsapphire/revvel-standards: repo surfaces, setup checklist, and Slack PR card integration status.',
  keywords: [
    'mergeme.dev',
    'MergeMe',
    'Slack PR cards',
    'GitHub PR Slack integration',
    'revvel-standards',
    'wiring status',
    'engineering notifications',
  ],
  openGraph: {
    title: 'MergeMe.dev Status — revvel-standards',
    description:
      'Is MergeMe.dev wired into revvel-standards? Live checklist, docs, and setup steps.',
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
