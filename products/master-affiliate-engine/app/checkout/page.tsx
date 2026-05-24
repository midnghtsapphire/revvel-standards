"use client";

import Link from "next/link";
import { useState } from "react";

const plans = [
  { id: "launch", name: "Launch", price: "$29/mo", priceId: "price_launch" },
  { id: "scale", name: "Scale", price: "$79/mo", priceId: "price_scale", recommended: true },
  { id: "agency", name: "Agency", price: "$299/mo", priceId: "price_agency" },
];

export default function CheckoutPage() {
  const [selected, setSelected] = useState("scale");
  const [email, setEmail] = useState("");
  const [cardName, setCardName] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: wire to Stripe Checkout session via /api/checkout-session
    setNotice("Connect NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY and create the /api/checkout-session route to activate live payments.");
  }

  const activePlan = plans.find((p) => p.id === selected)!;

  return (
    <main className="relative flex min-h-screen items-start justify-center overflow-hidden bg-gray-950 py-14 text-slate-100">
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/15 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        <Link href="/" className="mb-6 block text-center text-lg font-black text-white">
          Master<span className="text-emerald-400">Affiliate</span>Engine
        </Link>

        <h1 className="text-2xl font-black text-white">Deploy Your Snapshot</h1>
        <p className="mt-1 text-sm text-slate-400">Choose a plan and activate your pipeline instantly.</p>

        {/* Plan selector */}
        <div className="mt-6 grid grid-cols-3 gap-2">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              className={`relative rounded-2xl border p-3 text-center transition ${
                selected === plan.id
                  ? "border-emerald-400/60 bg-emerald-500/20 text-white"
                  : "border-white/15 bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {plan.recommended && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-200">
                  Popular
                </span>
              )}
              <p className="text-xs font-semibold">{plan.name}</p>
              <p className="mt-0.5 text-sm font-black">{plan.price}</p>
            </button>
          ))}
        </div>

        {/* Checkout form */}
        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div>
            <label htmlFor="checkout-email" className="mb-1 block text-xs font-semibold text-slate-400">
              Email
            </label>
            <input
              id="checkout-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 placeholder:text-slate-600"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="checkout-name" className="mb-1 block text-xs font-semibold text-slate-400">
              Name on Card
            </label>
            <input
              id="checkout-name"
              type="text"
              required
              autoComplete="cc-name"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400 placeholder:text-slate-600"
              placeholder="Jane Smith"
            />
          </div>

          {/* Stripe Elements placeholder */}
          <div className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-slate-500">
            💳 Card details — Stripe Elements mounts here
          </div>

          <p className="text-center text-xs text-slate-500">
            Selected: <span className="font-semibold text-emerald-300">{activePlan.name} — {activePlan.price}</span>
          </p>

          {notice && (
            <div role="status" className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
              ⚠️ {notice}
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 py-3.5 text-base font-bold text-gray-950 transition hover:from-emerald-400 hover:to-cyan-400"
          >
            🚀 Deploy This Snapshot Instantly
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Secured by Stripe. Cancel anytime. By subscribing you agree to our{" "}
          <a href="#" className="text-slate-400 hover:underline">Terms</a>.
        </p>
      </div>
    </main>
  );
}
