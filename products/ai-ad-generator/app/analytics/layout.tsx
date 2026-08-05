import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics — AI Ad Generator',
  description: 'Track CTR, ROAS, spend vs. revenue, and conversions across all your AI-generated ad campaigns over the last 14 days.',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
