import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Terraform Lint Guard — fmt CI + live checker',
  description:
    'Interactive Terraform formatting checker and CI snippet for ShubhamTatvamasi/terraform-lint-action. Catch fmt drift before merge.',
  keywords: [
    'terraform lint',
    'terraform fmt',
    'github action',
    'infrastructure as code',
    'CI/CD',
    'HCL formatting',
    'terraform-lint-action',
    'DevOps quality gate',
  ],
  openGraph: {
    title: 'Terraform Lint Guard',
    description:
      'Live Terraform fmt checker plus the CI workflow that runs ShubhamTatvamasi/terraform-lint-action@v1.',
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
