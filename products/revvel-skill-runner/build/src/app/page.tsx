'use client';
import AffiliateMarketing from '../components/AffiliateMarketing';
import Newsletter from '../components/Newsletter';
import AccessibilityControls from '../components/AccessibilityControls';

export default function Home() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-4xl font-bold mb-8">Revvel Skill Runner</h1>
      <p className="mb-8">Welcome to the Revvel Skill Runner execution engine.</p>

      <div className="grid gap-8 mt-12">
        <AccessibilityControls />
        <Newsletter />
        <AffiliateMarketing />
      </div>
    </main>
  );
}
