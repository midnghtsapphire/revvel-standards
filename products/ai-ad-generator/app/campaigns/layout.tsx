import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Campaigns — AI Ad Generator',
  description: 'Manage all your AI-generated ad campaigns. Track status, budget, ROAS, and CTR in one place.',
};

export default function CampaignsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
