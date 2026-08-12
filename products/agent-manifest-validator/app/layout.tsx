import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Agent Manifest Validator',
  description: 'Validate and test your agent manifest configurations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
