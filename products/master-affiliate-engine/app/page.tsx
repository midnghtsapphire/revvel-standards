"use client";

import Link from "next/link";

const agents = [
  {
    id: "workflows",
    label: "Automated Workflows",
    icon: "⚡",
    color: "from-emerald-500/20 to-emerald-900/10 border-emerald-400/30",
    glyph: "text-emerald-300",
    description:
      "Zero-touch link rotation, UTM tagging, and commission tracking across every platform — triggered by events, not timers.",
  },
  {
    id: "crm",
    label: "Smart CRM Integration",
    icon: "🔗",
    color: "from-cyan-500/20 to-cyan-900/10 border-cyan-400/30",
    glyph: "text-cyan-300",
    description:
      "Sync lead data and click events to HubSpot, Airtable, or any webhook-ready CRM in real time. Qualify buyers automatically.",
  },
  {
    id: "reports",
    label: "Instant Report Generator",
    icon: "📊",
    color: "from-amber-500/20 to-amber-900/10 border-amber-400/30",
    glyph: "text-amber-300",
    description:
      "Daily revenue snapshots, top-converting links, and click-to-commission ratios delivered to your inbox or Slack channel.",
  },
];

const affiliateLinks = [
  { name: "Polar.sh Funding", url: "https://polar.sh?ref=mae", clicks: 2841, commission: "$1,420", status: "Active" },
  { name: "Vercel Pro", url: "https://vercel.com?ref=mae", clicks: 1590, commission: "$795", status: "Active" },
  { name: "Resend Email API", url: "https://resend.com?ref=mae", clicks: 980, commission: "$294", status: "Active" },
  { name: "OpenRouter AI", url: "https://openrouter.ai?ref=mae", clicks: 3210, commission: "$2,247", status: "Active" },
  { name: "Stripe Payments", url: "https://stripe.com?ref=mae", clicks: 1102, commission: "$551", status: "Active" },
];

const pricingTiers = [
  {
    name: "Launch",
    price: "$29/mo",
    highlight: false,
    perks: [
      "Up to 25 affiliate links",
      "Automated UTM tagging",
      "Weekly email reports",
      "1 CRM integration",
    ],
  },
  {
    name: "Scale",
    price: "$79/mo",
    highlight: true,
    perks: [
      "Unlimited affiliate links",
      "Multi-agent workflow engine",
      "Real-time CRM sync",
      "Instant report generator",
      "Stripe revenue dashboard",
      "Priority support",
    ],
  },
  {
    name: "Agency",
    price: "$299/mo",
    highlight: false,
    perks: [
      "Everything in Scale",
      "White-label dashboard",
      "Team seats (up to 10)",
      "Custom webhook pipelines",
      "Done-for-you onboarding",
    ],
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gray-950 text-slate-100">
      {/* Atmospheric background glows */}
      <div className="pointer-events-none absolute -left-40 top-10 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl fog-layer" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400/15 blur-3xl fog-layer" style={{ animationDelay: "3s" }} />
      <div className="pointer-events-none absolute bottom-20 left-1/3 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl fog-layer" style={{ animationDelay: "6s" }} />
      <div className="pointer-events-none absolute bottom-0 right-10 h-64 w-64 rounded-full bg-emerald-400/10 blur-2xl fog-layer" style={{ animationDelay: "9s" }} />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-tight text-white">
            Master<span className="text-emerald-400">Affiliate</span>Engine
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 backdrop-blur transition hover:bg-white/10"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-emerald-500/30"
          >
            Dashboard →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-6 pb-10 pt-14">
        <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200 backdrop-blur">
          master-affiliate-engine · multi-agent pipeline · MCP-ready
        </div>
        <h1 className="mt-5 max-w-4xl text-5xl font-black tracking-tight text-white md:text-7xl">
          Stop Building.
          <span className="block bg-gradient-to-r from-emerald-300 via-cyan-200 to-amber-200 bg-clip-text text-transparent">
            Start Deploying.
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
          Your automated multi-agent affiliate pipeline — link rotation, CRM sync, and revenue
          reporting on autopilot. Deploy your exact snapshot in one click.
        </p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            href="/checkout"
            className="cta-glow rounded-full border border-emerald-300/50 bg-gradient-to-r from-emerald-500/30 to-cyan-500/20 px-8 py-4 text-base font-bold text-white backdrop-blur transition hover:from-emerald-500/50 hover:to-cyan-500/35"
          >
            🚀 Deploy This Snapshot Instantly
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/20 bg-white/8 px-7 py-4 text-base font-medium text-slate-200 backdrop-blur transition hover:bg-white/12"
          >
            View Live Dashboard
          </Link>
        </div>
      </section>

      {/* Pipeline Map */}
      <section className="relative mx-auto max-w-7xl px-6 pb-14 pt-6">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
          <p className="mb-6 text-xs font-semibold uppercase tracking-widest text-emerald-400">
            Live Agent Pipeline
          </p>

          {/* Central core + flowing lines diagram */}
          <div className="flex flex-col items-center gap-0">
            {/* Core node */}
            <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 border-emerald-400/60 bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 shadow-lg shadow-emerald-400/20 backdrop-blur-sm">
              <span className="text-3xl">🧠</span>
            </div>

            {/* Pipeline connector */}
            <div className="h-8 w-0.5 bg-gradient-to-b from-emerald-400 to-cyan-400 pipeline-line" />

            {/* Three-column agent nodes */}
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
              {agents.map((agent) => (
                <div
                  key={agent.id}
                  className={`relative rounded-2xl border bg-gradient-to-br p-5 shadow-lg backdrop-blur-md ${agent.color}`}
                >
                  {/* Top connector line — hidden on mobile */}
                  <div className="absolute -top-8 left-1/2 hidden h-8 w-0.5 -translate-x-1/2 bg-gradient-to-b from-cyan-400 to-emerald-400 pipeline-line sm:block" />
                  <span className={`text-2xl ${agent.glyph}`}>{agent.icon}</span>
                  <h3 className="mt-2 text-base font-bold text-white">{agent.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{agent.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Live Affiliate Links Table */}
      <section className="relative mx-auto max-w-7xl px-6 pb-14">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-8 shadow-xl backdrop-blur-xl">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Active Affiliate Links</h2>
            <Link
              href="/dashboard"
              className="rounded-full border border-white/20 bg-white/8 px-4 py-2 text-xs font-semibold text-slate-200 backdrop-blur transition hover:bg-white/12"
            >
              Manage All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="pb-3 pr-4">Program</th>
                  <th className="pb-3 pr-4">Clicks</th>
                  <th className="pb-3 pr-4">Commission</th>
                  <th className="pb-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {affiliateLinks.map((link) => (
                  <tr key={link.name} className="border-b border-white/5 last:border-0">
                    <td className="py-3 pr-4 font-medium text-white">
                      <a
                        href={link.url}
                        rel="sponsored noopener noreferrer"
                        target="_blank"
                        className="hover:text-emerald-300 transition-colors"
                      >
                        {link.name}
                      </a>
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{link.clicks.toLocaleString()}</td>
                    <td className="py-3 pr-4 font-semibold text-emerald-300">{link.commission}</td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {link.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative mx-auto max-w-7xl px-6 pb-16">
        <h2 className="mb-8 text-center text-3xl font-black text-white">
          Choose Your{" "}
          <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
            Pipeline Tier
          </span>
        </h2>
        <div className="grid gap-5 md:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-3xl border p-7 backdrop-blur-xl transition ${
                tier.highlight
                  ? "border-emerald-400/50 bg-gradient-to-br from-emerald-500/25 to-cyan-500/15 shadow-2xl shadow-emerald-500/10"
                  : "border-white/15 bg-white/5 shadow-xl"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-emerald-400/50 bg-emerald-500/30 px-3 py-0.5 text-xs font-bold text-emerald-200 backdrop-blur">
                  Most Popular
                </span>
              )}
              <p className="text-sm font-semibold text-slate-400">{tier.name}</p>
              <p className="mt-1 text-3xl font-black text-white">{tier.price}</p>
              <ul className="mt-5 space-y-2">
                {tier.perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-sm text-slate-200">
                    <span className="text-emerald-400">✓</span>
                    {perk}
                  </li>
                ))}
              </ul>
              <Link
                href="/checkout"
                className={`mt-7 block rounded-full px-5 py-3 text-center text-sm font-bold transition ${
                  tier.highlight
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-gray-950 hover:from-emerald-400 hover:to-cyan-400"
                    : "border border-white/20 bg-white/8 text-white hover:bg-white/15"
                }`}
              >
                Get Started →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-3xl border border-emerald-400/25 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 p-10 text-center backdrop-blur-xl">
          <h2 className="text-3xl font-black text-white md:text-4xl">
            Your Pipeline Is Ready to Deploy
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            Stop spending months coding your tech stack. Import our exact master snapshot — MCP
            workflows, autonomous agent pipelines, and CRM wiring — directly into your account in
            one click.
          </p>
          <Link
            href="/checkout"
            className="cta-glow mt-8 inline-block rounded-full border border-emerald-300/50 bg-gradient-to-r from-emerald-500/30 to-cyan-500/20 px-10 py-4 text-lg font-bold text-white backdrop-blur transition hover:from-emerald-500/50 hover:to-cyan-500/35"
          >
            🚀 Deploy This Snapshot Instantly
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-white/10 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-6 text-center text-xs text-slate-500">
          <p>© 2026 Master Affiliate Engine · Built with revvel-standards</p>
          <p>
            <Link href="/admin" className="hover:text-slate-300 transition-colors">Admin</Link>
            {" · "}
            <Link href="/login" className="hover:text-slate-300 transition-colors">Sign In</Link>
            {" · "}
            <a href="mailto:support@masteraffiliateengine.com" className="hover:text-slate-300 transition-colors">Support</a>
          </p>
        </div>
      </footer>
    </main>
  );
}
