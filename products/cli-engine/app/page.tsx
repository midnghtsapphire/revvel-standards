/* ──────────────────────────────────────────────────────────
   Revvel CLI Engine — Glassmorphic Landing Page
   Port 3008  |  WR: upgrade cli engine in revvel-standards
   ────────────────────────────────────────────────────────── */

const terminalLines = [
  { prefix: "$", text: "revvel-cli run --job generate-report", color: "text-emerald-400" },
  { prefix: "›", text: "Loading engine v2.4.1 …", color: "text-slate-300" },
  { prefix: "›", text: "Connecting to data pipeline …", color: "text-slate-300" },
  { prefix: "✓", text: "Pipeline ready [12 tasks queued]", color: "text-emerald-300" },
  { prefix: "$", text: "revvel-cli exec --task=pdf-export --format=A4", color: "text-amber-300" },
  { prefix: "›", text: "Compiling templates …", color: "text-slate-300" },
  { prefix: "›", text: "Injecting data stream 4.2 MB …", color: "text-slate-300" },
  { prefix: "✓", text: "report-2026-05.pdf  [3.8 MB]  DONE", color: "text-emerald-300" },
  { prefix: "$", text: "revvel-cli stripe checkout --plan=pro", color: "text-cyan-300" },
  { prefix: "✓", text: "Session created  →  checkout.stripe.com/…", color: "text-emerald-300" },
  { prefix: " ", text: "", color: "" },
  { prefix: "$", text: "█", color: "text-emerald-400 cursor-blink" },
];

const features = [
  {
    icon: "⚡",
    title: "Real-Time Execution",
    description:
      "Queue and execute any automation job from the terminal UI. Watch live compilation logs stream as your pipeline processes tasks.",
    color: "border-emerald-400/30 bg-emerald-400/5",
    iconColor: "text-emerald-400",
  },
  {
    icon: "📄",
    title: "PDF Report Export",
    description:
      "One command generates a polished, branded PDF report from any data source. Ray-traced typography, data tables, and charts included.",
    color: "border-amber-400/30 bg-amber-400/5",
    iconColor: "text-amber-400",
  },
  {
    icon: "🔐",
    title: "Auth & Admin Panel",
    description:
      "Built-in user authentication, role-based access control, and a full admin dashboard for managing pipelines, users, and export history.",
    color: "border-cyan-400/30 bg-cyan-400/5",
    iconColor: "text-cyan-400",
  },
  {
    icon: "💳",
    title: "Stripe Checkout",
    description:
      "Native Stripe integration for subscription billing. Accept one-time payments or recurring plans with zero third-party friction.",
    color: "border-violet-400/30 bg-violet-400/5",
    iconColor: "text-violet-400",
  },
  {
    icon: "🔄",
    title: "Pipeline Orchestration",
    description:
      "Chain multi-step automation tasks, set triggers, and inspect execution trees. Every run is logged and replay-safe.",
    color: "border-fuchsia-400/30 bg-fuchsia-400/5",
    iconColor: "text-fuchsia-400",
  },
  {
    icon: "📡",
    title: "API & MCP Bridge",
    description:
      "Expose every pipeline task via a versioned REST API or through the Model Context Protocol (MCP) for AI-agent orchestration.",
    color: "border-sky-400/30 bg-sky-400/5",
    iconColor: "text-sky-400",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$29",
    period: "/mo",
    description: "For solo developers and early-stage automation builders.",
    features: [
      "50 pipeline runs / month",
      "PDF export (up to 100 pages)",
      "1 admin seat",
      "REST API access",
      "Community support",
    ],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/mo",
    description: "For teams shipping production-grade automation at scale.",
    features: [
      "Unlimited pipeline runs",
      "Unlimited PDF export",
      "5 admin seats + user auth",
      "MCP bridge + webhooks",
      "Stripe billing integration",
      "Priority support",
    ],
    cta: "Start Pro Trial",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "White-label CLI engine with dedicated infrastructure.",
    features: [
      "Custom run quotas",
      "On-premise deployment",
      "Custom branding",
      "SLA + dedicated engineer",
      "SSO / SAML auth",
    ],
    cta: "Contact Sales",
    highlight: false,
  },
];

const shipSteps = [
  "Week 1 — Launch waitlist page and developer preview; seed product-hunt + HN threads.",
  "Week 2 — Open Starter tier; onboard first 25 paying developers; gather run logs.",
  "Week 3 — Publish Pro tier; wire Stripe checkout; announce MCP bridge and PDF export.",
  "Week 4 — Enterprise outreach; co-create 3 real-world pipeline demos for content marketing.",
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">

      {/* ── Ambient light orbs ── */}
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-10 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 left-1/3 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-amber-400/10 blur-3xl" />

      {/* ── HERO ── */}
      <section className="relative mx-auto max-w-6xl px-6 pb-4 pt-20">
        <div className="inline-flex rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 backdrop-blur">
          revvel-cli · glassmorphic execution engine · v2.4
        </div>
        <h1 className="mt-6 max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
          The CLI Agent
          <span className="block bg-gradient-to-r from-emerald-300 via-cyan-200 to-amber-200 bg-clip-text text-transparent">
            That Ships Real Product
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-relaxed text-slate-300">
          A premium command-line engine with a glassmorphic terminal UI. Queue automation pipelines,
          export polished PDF reports, bill users through Stripe, and orchestrate AI agents — all
          from a single, production-grade interface.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a
            href="#run"
            className="rounded-full border border-emerald-300/40 bg-emerald-400/20 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-emerald-400/30"
          >
            ▶ Run &amp; Export
          </a>
          <a
            href="#pricing"
            className="rounded-full border border-white/20 bg-white/8 px-6 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-white/12"
          >
            View Pricing
          </a>
          <a
            href="#waitlist"
            className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-6 py-3 text-sm font-semibold text-cyan-100 backdrop-blur transition hover:bg-cyan-400/15"
          >
            Join Developer Waitlist
          </a>
        </div>
      </section>

      {/* ── TERMINAL WINDOW ── */}
      <section id="run" className="relative mx-auto max-w-6xl px-6 py-12">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-1 shadow-2xl backdrop-blur-xl">
          {/* Title bar */}
          <div className="flex items-center gap-2 rounded-t-2xl border-b border-white/10 bg-slate-900/70 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400/80" />
            <span className="h-3 w-3 rounded-full bg-amber-400/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
            <span className="ml-4 text-xs text-slate-400 tracking-widest">
              revvel-cli — execution terminal
            </span>
          </div>

          {/* Terminal body */}
          <div className="overflow-hidden rounded-b-2xl bg-slate-950/90 px-6 py-5">
            <ol className="space-y-1 text-sm leading-relaxed" aria-label="Terminal output">
              {terminalLines.map((line, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-4 shrink-0 text-slate-500">{line.prefix}</span>
                  <span className={`${line.color} font-mono`}>{line.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Floating PDF card */}
        <div className="absolute -right-4 top-8 hidden w-56 rounded-2xl border border-amber-400/30 bg-slate-900/80 p-4 shadow-xl backdrop-blur-lg md:block">
          <p className="text-xs font-semibold text-amber-300">📄 Export Ready</p>
          <p className="mt-1 text-sm font-bold text-white">report-2026-05.pdf</p>
          <p className="mt-1 text-xs text-slate-400">3.8 MB · A4 · 24 pages</p>
          <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-center text-xs font-semibold text-emerald-300">
            ↓ Download Report
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative mx-auto max-w-6xl px-6 pb-14">
        <h2 className="mb-8 text-2xl font-black text-white">Engine Capabilities</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className={`rounded-3xl border ${feature.color} p-6 backdrop-blur-md`}
            >
              <p className={`text-2xl ${feature.iconColor}`} aria-hidden="true">{feature.icon}</p>
              <h3 className="mt-3 text-lg font-bold text-white">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── SHIP PLAN ── */}
      <section className="relative mx-auto max-w-6xl px-6 pb-14">
        <div className="rounded-3xl border border-white/15 bg-white/5 p-8 backdrop-blur-md">
          <h2 className="text-2xl font-black text-white">Ship Plan</h2>
          <ul className="mt-6 space-y-4">
            {shipSteps.map((step) => (
              <li key={step} className="flex items-start gap-3 text-slate-200">
                <span className="mt-0.5 text-emerald-400">▸</span>
                <span className="text-sm leading-relaxed">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="relative mx-auto max-w-6xl px-6 pb-14">
        <h2 className="mb-8 text-2xl font-black text-white">Pricing</h2>
        <div className="grid gap-6 md:grid-cols-3">
          {pricing.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col rounded-3xl border p-6 backdrop-blur-md ${
                tier.highlight
                  ? "border-emerald-400/50 bg-emerald-400/10 shadow-lg shadow-emerald-500/10"
                  : "border-white/15 bg-white/5"
              }`}
            >
              {tier.highlight && (
                <p className="mb-3 inline-flex self-start rounded-full border border-emerald-300/40 bg-emerald-400/20 px-2 py-0.5 text-xs font-bold text-emerald-200">
                  Most Popular
                </p>
              )}
              <p className="text-sm font-semibold text-slate-300">{tier.name}</p>
              <p className="mt-2 text-4xl font-black text-white">
                {tier.price}
                <span className="text-base font-normal text-slate-400">{tier.period}</span>
              </p>
              <p className="mt-2 text-xs text-slate-400">{tier.description}</p>
              <ul className="mt-5 flex-1 space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-200">
                    <span className="text-emerald-400">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#waitlist"
                className={`mt-6 rounded-full px-4 py-3 text-center text-sm font-bold transition ${
                  tier.highlight
                    ? "border border-emerald-300/50 bg-emerald-400/25 text-white hover:bg-emerald-400/35"
                    : "border border-white/20 bg-white/8 text-slate-100 hover:bg-white/12"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* ── RUN & EXPORT CTA ── */}
      <section className="relative mx-auto max-w-6xl px-6 pb-14">
        <div className="relative overflow-hidden rounded-3xl border border-amber-400/30 bg-amber-400/5 p-10 backdrop-blur-md text-center">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-400/10 via-transparent to-emerald-400/10" />
          <h2 className="relative text-3xl font-black text-white">
            Ready to Execute?
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-slate-200 text-sm leading-relaxed">
            Launch the CLI engine, queue your first pipeline, and export a polished PDF report in
            under 60 seconds. No configuration required.
          </p>
          <a
            href="#waitlist"
            className="relative mt-8 inline-flex items-center gap-2 rounded-full border border-amber-300/50 bg-amber-400/25 px-8 py-4 text-sm font-black text-white shadow-lg shadow-amber-500/20 backdrop-blur transition hover:bg-amber-400/35"
          >
            <span>▶ Run &amp; Export</span>
            <span className="text-amber-300">→</span>
          </a>
        </div>
      </section>

      {/* ── WAITLIST / EARLY ACCESS ── */}
      <section id="waitlist" className="relative mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-cyan-300/25 bg-cyan-400/5 p-8 backdrop-blur-md">
          <h2 className="text-2xl font-black text-white">Developer Early Access</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200">
            Join the waitlist to be among the first developers to run pipelines, export PDF reports,
            and access the MCP bridge. Early-access users lock in 40% off Pro for 12 months.
          </p>
          <p id="waitlist-hint" className="mt-4 text-xs text-cyan-200">
            Use your professional or GitHub email for priority access.
          </p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="waitlist-email" className="mb-1 block text-xs font-semibold text-slate-400">
                Email address
              </label>
              <input
                id="waitlist-email"
                type="email"
                aria-describedby="waitlist-hint"
                placeholder="you@domain.com"
                className="w-full rounded-full border border-white/20 bg-slate-950/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-300"
              />
            </div>
            <button
              type="submit"
              className="rounded-full border border-cyan-300/40 bg-cyan-400/20 px-6 py-3 text-sm font-bold text-white backdrop-blur transition hover:bg-cyan-400/30"
            >
              Get Early Access
            </button>
          </form>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative border-t border-white/10 py-8 text-center text-xs text-slate-500">
        <p>
          © {new Date().getFullYear()} Revvel CLI Engine · Built on{" "}
          <span className="text-emerald-400">revvel-standards</span> · Deployed on{" "}
          <span className="text-cyan-400">Vercel</span>
        </p>
        <p className="mt-2">
          <a href="#pricing" className="text-slate-400 hover:text-white">Pricing</a>
          {" · "}
          <a href="#run" className="text-slate-400 hover:text-white">Terminal</a>
          {" · "}
          <a href="#waitlist" className="text-slate-400 hover:text-white">Join Waitlist</a>
        </p>
      </footer>
    </main>
  );
}
