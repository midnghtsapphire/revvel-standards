import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Revvel PromptForge',
  description: 'Turn rough ideas into source-backed prompt packets.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
