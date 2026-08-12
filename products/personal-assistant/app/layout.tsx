import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Personal Assistant',
  description: 'Manage and orchestrate your personal assistant tasks',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
