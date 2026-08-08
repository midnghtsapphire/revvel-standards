import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Agent Manifest Validator | Revvel Standards',
  description:
    'Validate Revvel agent personas against registry_rules.json — skill budget, domain allow-list, and system constraints. SaaS guardrail for agent factory pipelines.',
  keywords: [
    'agent manifest validator',
    'registry_rules',
    'revvel standards',
    'skill budget',
    'n8n validation alert',
    'agent factory guardrail',
  ],
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
