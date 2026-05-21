const pillars = [
  {
    title: "Lore Engine",
    description:
      "Capture world rules, cosmology, and canon guardrails so every story stays consistent.",
  },
  {
    title: "Character Forge",
    description:
      "Build protagonist and faction profiles with motivations, conflicts, and relationship maps.",
  },
  {
    title: "Launch Kit",
    description:
      "Turn world assets into production-ready landing pages, social hooks, and pitch copy.",
  },
];

const roadmap = [
  "MVP website launch with waitlist + feature voting",
  "Creator workspace for worlds, timelines, and character arcs",
  "Template marketplace for monetized story IP packs",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20">
        <p className="mb-4 inline-block rounded-full border border-violet-400/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
          production-app · vercel-ready
        </p>
        <h1 className="max-w-4xl text-4xl font-black tracking-tight text-white md:text-6xl">
          OpenMythos
          <span className="block bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
            Mythic worlds, shipped as products
          </span>
        </h1>
        <p className="mt-6 max-w-3xl text-lg text-slate-300">
          A focused website UI for designing story universes and turning them into
          launchable digital products. OpenMythos helps creators move from lore notes to
          market-ready experiences.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="#waitlist"
            className="rounded-full bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-400"
          >
            Join Waitlist
          </a>
          <a
            href="#roadmap"
            className="rounded-full border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
          >
            View Roadmap
          </a>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-16 md:grid-cols-3">
        {pillars.map((pillar) => (
          <article
            key={pillar.title}
            className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-white">{pillar.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{pillar.description}</p>
          </article>
        ))}
      </section>

      <section id="roadmap" className="border-y border-slate-800 bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <h2 className="text-2xl font-bold text-white">Launch Roadmap</h2>
          <ul className="mt-5 space-y-3 text-slate-200">
            {roadmap.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1 text-violet-300">✦</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="waitlist" className="mx-auto max-w-6xl px-6 py-16">
        <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-8">
          <h2 className="text-2xl font-bold text-white">OpenMythos Waitlist</h2>
          <p className="mt-3 max-w-2xl text-slate-200">
            Collect early users, validate demand, and prioritize features before full build-out.
            Replace this CTA endpoint with your email/CRM webhook during deployment.
          </p>
          <form className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              aria-label="Email address"
              placeholder="creator@email.com"
              className="w-full rounded-full border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400"
            />
            <button
              type="submit"
              aria-label="Submit waitlist form"
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Get Early Access
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
