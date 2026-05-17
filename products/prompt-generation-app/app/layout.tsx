import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Revvel PromptForge - Research-Backed Prompt Generator',
  description: 'Generate source-backed prompt packets with market facts, competitor gaps, audience proof, and code-review checklists.',
  keywords: ['prompt generator', 'prompt engineering', 'AI prompt research', 'Revvel', 'market research prompts'],
  alternates: {
    canonical: 'https://promptforge.revvel.co'
  },
  openGraph: {
    title: 'Revvel PromptForge',
    description: 'A prompt generation app that turns rough ideas into research-backed build packets.',
    url: 'https://promptforge.revvel.co',
    siteName: 'Revvel PromptForge',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Revvel PromptForge',
    description: 'Generate source-backed prompt packets for products, WRs, and PRs.'
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MIDNGHTSAPPHIRE',
    url: 'https://revvel.co',
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        contactOption: 'TDDService',
        telephone: '711'
      }
    ]
  };

  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Revvel PromptForge',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'Research-backed prompt packet generator for product, marketing, and code-review workflows.'
  };

  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd, appJsonLd])
          }}
        />
        {children}
      </body>
    </html>
  );
}
