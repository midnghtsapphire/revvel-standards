import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Ad — AI Ad Generator',
  description: 'Turn any product URL into high-converting ad copy, static creatives, and UGC video scripts in 4 steps — powered by AI.',
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
