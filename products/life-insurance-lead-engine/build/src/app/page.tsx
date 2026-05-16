'use client';

import LeadGenerator from '@/components/LeadGenerator/LeadGenerator';
import Dedupe from '@/components/Dedupe/Dedupe';
import AffiliateMarketing from '@/components/AffiliateMarketing';
import Newsletter from '@/components/Newsletter';

export default function Home() {
  return (
    <main className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-brand-dark">
          Life Insurance Lead Engine
        </h1>
        <p className="text-slate-600 mt-2">
          Generate high-value medical professional leads from the NPPES NPI Registry,
          score them by income tier, and produce tailored pitch scripts.
        </p>
      </header>

      <section className="mb-12">
        <LeadGenerator />
      </section>

      <section className="mb-12">
        <Dedupe />
      </section>

      <section className="grid md:grid-cols-2 gap-6 mb-12">
        <AffiliateMarketing />
        <Newsletter />
      </section>

      <footer className="text-center text-sm text-slate-500 mt-12 pb-6">
        © {new Date().getFullYear()} Life Insurance Lead Engine. NPPES data is public
        domain. Use responsibly. TCPA/GDPR/CCPA compliant operation required.
      </footer>
    </main>
  );
}
