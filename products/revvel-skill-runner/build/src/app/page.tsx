import AccessibilityControls from "@/components/AccessibilityControls";
import Newsletter from "@/components/Newsletter";
import AffiliateMarketing from "@/components/AffiliateMarketing";

export default function Home() {
  const polarCheckoutUrl =
    process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL ??
    "https://polar.sh/revvel/products/revvel-skill-runner";

  return (
    <main className="min-h-screen px-6 py-12 max-w-4xl mx-auto">
      <AccessibilityControls />
      <section className="text-center mb-16">
        <h1 className="text-5xl font-bold mb-4">Revvel Skill Runner</h1>
        <p className="text-xl opacity-80">
          Production skill execution engine. Launch automations and monetize from
          day one.
        </p>
        <a
          href={polarCheckoutUrl}
          className="inline-block mt-6 px-6 py-3 bg-black text-white rounded-lg dark:bg-white dark:text-black"
        >
          Start Pro on Polar.sh
        </a>
      </section>
      <section className="my-16 grid gap-4 sm:grid-cols-3">
        <article className="border rounded-xl p-6">
          <h2 className="font-semibold text-xl">Starter</h2>
          <p className="mt-2 text-3xl font-bold">$19/mo</p>
          <p className="mt-2 opacity-80 text-sm">Run 5 active skill automations.</p>
        </article>
        <article className="border rounded-xl p-6">
          <h2 className="font-semibold text-xl">Pro</h2>
          <p className="mt-2 text-3xl font-bold">$79/mo</p>
          <p className="mt-2 opacity-80 text-sm">
            Unlimited runners + priority support.
          </p>
        </article>
        <article className="border rounded-xl p-6">
          <h2 className="font-semibold text-xl">Agency</h2>
          <p className="mt-2 text-3xl font-bold">$299/mo</p>
          <p className="mt-2 opacity-80 text-sm">
            Multi-client workspaces and team seats.
          </p>
        </article>
      </section>
      <Newsletter />
      <AffiliateMarketing />
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
