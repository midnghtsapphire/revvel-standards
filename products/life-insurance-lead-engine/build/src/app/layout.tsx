import type { Metadata } from 'next';
import './globals.css';
import AccessibilityControls from '@/components/AccessibilityControls';

export const metadata: Metadata = {
  title: 'Life Insurance Lead Engine',
  description: 'Generate high-value life insurance leads from the NPPES NPI Registry.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AccessibilityControls />
        {children}
      </body>
    </html>
  );
}
