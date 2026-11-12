import Link from 'next/link';
import { stripeCheckoutUrl } from '../lib/checkout';
import { StripeCheckoutButton } from './stripe-checkout-button';

export const metadata = { title: 'AI Video Toolkit pricing' };

export default function Pricing() {
  const checkout = stripeCheckoutUrl(process.env.NEXT_PUBLIC_STRIPE_CHECKOUT_URL);
  return <main className="mx-auto max-w-4xl px-6 py-16">
    <Link href="/" className="underline">Back to AI Video Toolkit</Link>
    <h1 className="mt-8 text-4xl font-bold">Pricing</h1>
    <div className="mt-10 grid gap-8 md:grid-cols-2">
      <section className="rounded-2xl border p-8">
        <h2 className="text-2xl font-semibold">Free directory</h2>
        <p className="my-4 text-3xl">$0</p>
        <p>Browse and compare the tools in this directory.</p>
        <Link href="/" className="mt-6 inline-block underline">Explore the directory</Link>
      </section>
      <section className="rounded-2xl border p-8">
        <h2 className="text-2xl font-semibold">REVVEL Pro</h2>
        <p className="my-4 text-3xl">$99 <span className="text-base">/ month</span></p>
        <p>Review the subscription and included services in secure Stripe checkout before paying.</p>
        {checkout
          ? <a href={checkout} className="mt-6 inline-block rounded-lg bg-blue-700 px-6 py-3 text-white">Review Pro subscription</a>
          : <p className="mt-6" role="status">Paid subscriptions are currently unavailable. The free directory remains available.</p>}
        <p className="mt-4 text-sm">Do not send payment through email or direct messages.</p>
        <StripeCheckoutButton />
      </section>
    </div>
  </main>;
}
