import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GoSQLX SQL Linter — Multi-Dialect SQL Playground',
  description:
    'Free multi-dialect SQL linter and formatter playground aligned with GoSQLX rules (L001–L010). Validate PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite, Snowflake, and ClickHouse SQL in the browser.',
  keywords: [
    'SQL linter',
    'GoSQLX',
    'SQL formatter',
    'PostgreSQL lint',
    'MySQL lint',
    'SQL best practices',
    'CTE validator',
    'multi-dialect SQL',
    'SQL CI',
    'SQL injection prevention style',
  ],
  openGraph: {
    title: 'GoSQLX SQL Linter — Multi-Dialect SQL Playground',
    description:
      'Lint, validate, and format SQL across eight dialects. Browser playground + REST API + GitHub Action integration.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
