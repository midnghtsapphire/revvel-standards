import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Neon Control Console — API + neonctl + GitHub Actions',
  description:
    'Ship Neon Postgres preview branches with a live API playground, neonctl command builder, and GitHub Actions workflow generator. Uses NEON_API_KEY server-side; demo mode works without secrets.',
  keywords: [
    'Neon',
    'neonctl',
    'Neon API',
    'Postgres branching',
    'GitHub Actions Neon',
    'preview database',
    'serverless Postgres',
    'NEON_API_KEY',
  ],
  openGraph: {
    title: 'Neon Control Console',
    description:
      'Neon API playground + neonctl CLI snippets + PR preview workflow generator.',
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
