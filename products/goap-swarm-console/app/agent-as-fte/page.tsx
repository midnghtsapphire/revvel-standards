"use client";

import Link from "next/link";
import Script from "next/script";
import { useState } from "react";
import { calculateAgentRoi } from "../../lib/agent-roi";
import { calendlyEmbedUrl } from "../../lib/calendly-url";

const usd = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

export default function AgentAsFtePage() {
  const [hoursPerWeek, setHours] = useState(30);
  const [hourlyCost, setCost] = useState(60);
  const [automationPercent, setAutomation] = useState(50);
  const [monthlyPrice, setPrice] = useState(2000);
  const roi = calculateAgentRoi({ hoursPerWeek, hourlyCost, automationPercent, monthlyPrice });
  // CALENDLY_URL is mapped onto NEXT_PUBLIC_CALENDLY_URL in next.config.js.
  // Empty or non-calendly.com values leave the embed off. No path is invented.
  const calendly = calendlyEmbedUrl(process.env.NEXT_PUBLIC_CALENDLY_URL || "");
  // 2026-11-10 Codex, WR #18334: the older console mailto address has no
  // canonical business-contact confirmation. Use the verified owner repository
  // contact surface until an owner-provided Calendly destination is configured.
  // Previous draft used mailto:audrey@midnghtsapphire.com.
  const contact = "https://github.com/midnghtsapphire/revvel-standards/discussions/18238";
  return <main className="mx-auto max-w-5xl space-y-14 px-6 py-12">
    <nav className="flex flex-wrap justify-between gap-4"><Link href="/" className="text-cyan-300">GOAP Swarm Console</Link><Link href="/agent-as-fte/deck" className="text-cyan-300">Sales deck →</Link><a href="/goap-agent-sales-deck.pdf" className="text-cyan-300" download>Download PDF</a></nav>
    <section className="space-y-6"><p className="text-cyan-300">REVVEL · AGENT OPERATIONS</p><h1 className="text-5xl font-bold tracking-tight">Give repeatable engineering work a dedicated agent.</h1><p className="max-w-3xl text-xl text-slate-300">GOAP turns goals into explicit plans, assigns work across agents, and surfaces recovery paths. Buy measurable delivery capacity with a scoped pilot and reviewable outputs.</p><div className="flex flex-wrap gap-4"><a href={contact} className="rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950">Discuss a pilot</a><Link href="/" className="rounded-lg border border-slate-600 px-5 py-3">Try the working planner</Link></div></section>
    <section className="grid gap-6 md:grid-cols-3">{[["Plan", "Define a goal, world state, preconditions, and an observable finish line."], ["Coordinate", "Allocate actions by role and capacity, with resource leases and an assignment report."], ["Review", "Inspect anomalies, escalation signals, predicted outcomes, and exported evidence."]].map(([title, body]) => <article key={title} className="rounded-xl border border-slate-700 p-6"><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-3 text-slate-300">{body}</p></article>)}</section>
    <section className="space-y-6 rounded-2xl border border-cyan-900 bg-slate-900 p-8"><h2 className="text-3xl font-semibold">Estimate recovered capacity</h2><p className="text-slate-300">Change every assumption. These are estimates to validate in your pilot; recovered time only has cash value if your team can use it.</p><div className="grid gap-6 sm:grid-cols-2">{[
      { label: "Repeatable task hours per week", value: hoursPerWeek, max: 1000, set: setHours },
      { label: "Loaded cost per hour ($)", value: hourlyCost, max: 10000, set: setCost },
      { label: "Estimated automation (%)", value: automationPercent, max: 100, set: setAutomation },
      { label: "Agent price per month ($)", value: monthlyPrice, max: 100000, set: setPrice },
    ].map(({ label, value, max, set }) => <label key={label} className="space-y-2"><span className="block">{label}</span><input type="number" min="0" max={max} value={value} onChange={event => set(Math.min(max, Math.max(0, Number(event.target.value) || 0)))} className="w-full rounded border border-slate-600 bg-slate-950 p-3" /></label>)}</div><div aria-live="polite" className="grid gap-5 sm:grid-cols-3"><div><p>Monthly hours recovered</p><strong className="text-3xl">{roi.monthlyHours.toFixed(1)}</strong></div><div><p>Monthly net capacity value</p><strong className="text-3xl">{usd(roi.monthlyNetValue)}</strong></div><div><p>Annual net capacity value</p><strong className="text-3xl">{usd(roi.annualNetValue)}</strong></div></div><p className="text-sm text-slate-400">Formula: hours/week × 52 ÷ 12 × automation fraction × hourly cost − monthly agent price. Review and supervision time must be included in the automation assumption.</p></section>
    <section className="space-y-4"><h2 className="text-3xl font-semibold">A scoped engagement, from $2,000–$5,000 per agent/month</h2><p className="text-slate-300">Final pricing depends on workflow volume, integrations, service levels, and supervision. A pilot defines the baseline, accepted outputs, review checkpoints, and a stop condition before work begins.</p><ol className="list-decimal space-y-3 pl-6"><li>Choose a repeatable workflow and measure current effort.</li><li>Agree on acceptance tests, access boundaries, and reviewer ownership.</li><li>Compare accepted work, total cost, review time, and failure recovery against the baseline.</li><li>Expand only after the measured result supports it.</li></ol></section>
    <section className="space-y-4"><h2 className="text-3xl font-semibold">Inspect the evidence</h2><p className="text-slate-300">The public console runs a deterministic symbolic planner. It demonstrates planning and allocation; it does not execute production code or establish customer results. Explore it and export a run report before discussing a pilot.</p><p className="text-slate-300">Proof pending: checked 2026-11-11, no product in this repository was at a live URL that can be cited as a customer deployment. No name, quote, or result is shown. A case study waits on issue 18330.</p></section>
    <section className="space-y-4" id="book"><h2 className="text-3xl font-semibold">Request a pilot</h2>
      {/* 2026-11-10 Codex sentence, kept because the GitHub discussion is still the fallback:
          "Calendar booking is unavailable. Use the owner's GitHub discussion to request a pilot without sharing private business details publicly."
          2026-11-11 MarketShipper: the embed renders only when CALENDLY_URL passes calendlyEmbedUrl. */}
      {calendly ? <>
        <div className="calendly-inline-widget" data-url={calendly} style={{ minWidth: "320px", height: "700px" }} />
        <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />
      </> : <p className="text-sm text-slate-400">CALENDLY_URL is not set. The calendar embed appears when that build value is an https link on calendly.com with a scheduling path.</p>}
      <a href={contact} className="inline-block rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950">Discuss a pilot on GitHub</a>
    </section>
  </main>;
}
