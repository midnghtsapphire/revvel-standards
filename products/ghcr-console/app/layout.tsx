import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GHCR Console — GitHub Container Registry setup',
  description:
    'Live answer to whether GitHub Container Registry is wired into midnghtsapphire/revvel-standards: publish workflow, Dockerfiles, image refs, and owner setup checklist.',
  keywords: [
    'GitHub Container Registry',
    'GHCR',
    'ghcr.io',
    'docker publish',
    'packages write',
    'revvel-standards',
    'container image',
    'OCI registry',
  ],
  openGraph: {
    title: 'GHCR Console — revvel-standards',
    description:
      'Is GitHub Container Registry wired into revvel-standards? Live checklist, image pull commands, and setup steps.',
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
