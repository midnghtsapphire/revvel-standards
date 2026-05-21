const featureCards = [
  {
    title: "Glassmorphic Site Builder",
    description:
      "Launch conversion-ready landing pages from proven templates in minutes, with OpenMythos branding and story hooks baked in.",
  },
  {
    title: "Myth Engine Workspace",
    description:
      "Build characters, factions, artifacts, and timelines with structured prompts tuned for productized worldbuilding.",
  },
  {
    title: "Ship-to-Market Toolkit",
    description:
      "Generate sales copy, waitlist campaigns, launch checklists, and offer bundles to move from idea to revenue.",
  },
];

const shipSteps = [
  "Template-led MVP launch page with waitlist capture",
  "Offer packaging (Starter, Pro, Studio) and checkout wiring",
  "Weekly content + community loop to convert waitlist into buyers",
];

const monetization = [
  { name: "Starter", price: "$19", value: "Template pack + launch page" },
  { name: "Pro", price: "$79/mo", value: "Workspace + campaign automations" },
  { name: "Studio", price: "$399", value: "Done-with-you world launch sprint" },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute -left-32 top-20 h-80 w-80 rounded-full bg-fuchsia-500/30 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-400/25 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-20">
        <div className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold text-cyan-100 backdrop-blur">
          openmythos · glassmorphic launch engine
        </div>
        <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
          OpenMythos
          <span className="block bg-gradient-to-r from-cyan-200 via-violet-200 to-fuchsia-200 bg-clip-text text-transparent">
            Creative worlds turned into sellable products
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-slate-200">
          This UI ships with a glassmorphic visual system and template-first workflow so teams can
          create mythic product experiences, publish faster, and monetize from day one.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#waitlist"
            className="rounded-full border border-cyan-200/40 bg-cyan-300/20 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-cyan-300/30"
          >
            Join Early Access
          </a>
          <a
            href="#ship"
            className="rounded-full border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-slate-100 backdrop-blur transition hover:bg-white/15"
          >
            See Ship Plan
          </a>
        </div>
      </section>

      <section className="relative mx-auto grid max-w-6xl gap-4 px-6 pb-14 md:grid-cols-3">
        {featureCards.map((card) => (
          <article
            key={card.title}
            className="rounded-3xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur-md"
          >
            <h2 className="text-xl font-bold text-white">{card.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-100">{card.description}</p>
          </article>
        ))}
      </section>

      <section id="ship" className="relative mx-auto max-w-6xl px-6 pb-14">
        <div className="rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md">
          <h2 className="text-2xl font-bold text-white">Ship-to-Market Plan</h2>
          <ul className="mt-5 space-y-3 text-slate-100">
            {shipSteps.map((step) => (
              <li key={step} className="flex items-start gap-3">
                <span className="mt-1 text-fuchsia-200">✦</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-14">
        <div className="rounded-3xl border border-white/20 bg-white/10 p-8 backdrop-blur-md">
          <h2 className="text-2xl font-bold text-white">Offer Stack</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {monetization.map((tier) => (
              <div
                key={tier.name}
                className="rounded-2xl border border-white/20 bg-slate-900/50 p-4"
              >
                <p className="text-sm font-semibold text-cyan-200">{tier.name}</p>
                <p className="mt-1 text-2xl font-black text-white">{tier.price}</p>
                <p className="mt-2 text-sm text-slate-200">{tier.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="waitlist" className="relative mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-fuchsia-200/30 bg-fuchsia-400/10 p-8 backdrop-blur-md">
          <h2 className="text-2xl font-bold text-white">OpenMythos Waitlist</h2>
          <p className="mt-3 max-w-2xl text-slate-100">
            Collect qualified creators before full launch. Connect this form to your CRM webhook for
            segmented onboarding and paid-plan conversion.
          </p>
          <p id="waitlist-email-hint" className="mt-4 text-sm text-cyan-100">
            Use your creator email to join early access.
          </p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              aria-label="Email address"
              aria-describedby="waitlist-email-hint"
              className="w-full rounded-full border border-white/30 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300"
            />
            <button
              type="submit"
              aria-label="Submit waitlist form"
              className="rounded-full border border-cyan-200/40 bg-cyan-300/20 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-cyan-300/30"
            >
              Get Early Access
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
