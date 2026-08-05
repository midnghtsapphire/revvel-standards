import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevOps Dashboard — Self-Healing & CI Visibility',
  description:
    'Real-time DevOps monitoring dashboard: track self-healing PRs, CI/CD pipeline health, agent status, and workflow run history for the revvel-standards repo.',
  keywords: [
    'DevOps dashboard',
    'self-healing',
    'CI/CD monitoring',
    'GitHub Actions',
    'pipeline visibility',
    'automated code review',
    'PR tracking',
    'agent health',
  ],
  openGraph: {
    title: 'DevOps Dashboard — Self-Healing & CI Visibility',
    description:
      'Monitor self-healing PRs, CI/CD pipelines, and agent health in real time.',
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
