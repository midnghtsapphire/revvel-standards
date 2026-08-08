import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Linear API Sync — Agent Factory Automation',
  description:
    'GitHub commit webhook receiver that extracts Linear issue IDs (e.g. ENG-105), marks issues Done, and posts Agent Factory sync comments via the Linear GraphQL API.',
  keywords: [
    'Linear API',
    'GitHub webhook',
    'issue sync',
    'Agent Factory',
    'n8n automation',
    'commit to Linear',
    'SaaS project management sync',
  ],
  openGraph: {
    title: 'Linear API Sync — Agent Factory Automation',
    description:
      'Parse Linear issue keys from commits and synchronize Done state + comments automatically.',
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
