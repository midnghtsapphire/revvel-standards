"use client";

import Link from "next/link";
import slideRows from "../../../sales/slides.json";

// 2026-11-11 MarketShipper, WR #18334: the page renders sales/slides.json,
// generated from sales/deck.md. The 2026-11-10 inline array is kept below as
// a comment. Deleting it would hide the previous wording from anyone who opens
// this file without git history. It is not executed.
/*
const slides = [
  ["Engineering capacity, with an explicit plan", "REVVEL GOAP agent operations", "A scoped service for repeatable engineering workflows. $2,000–$5,000 per agent/month, subject to agreed scope and service levels."],
  ["Start with the work that repeats", "Choose one measurable workflow", "Examples for pilot discovery: repository hygiene, test triage, research-to-build handoffs, or release preparation. Agree on the accepted output before assigning an agent."],
  ["Buy accepted outcomes", "Count results and review cost", "Track accepted tasks, cycle time, supervision hours, failure recovery, and total cost. Compare the pilot against your existing workflow using the same acceptance criteria."],
  ["Make the plan inspectable", "Goals → preconditions → actions", "The working GOAP console searches a symbolic state space. Every planned action exposes its conditions, effects, role, and cost. The report records what the planner selected."],
  ["Coordinate specialist capacity", "Role-aware assignments and resource leases", "The console allocates actions to compatible agents with capacity constraints. Inspect the assignment board and export it as CSV to review a proposed work split."],
  ["Recovery is part of the workflow", "Anomalies and escalation are visible", "The planner reports awareness checks, predicted execution outcomes, and escalation signals. Production recovery actions and access controls must be validated for each customer environment."],
  ["Try the evidence yourself", "A working planner, with exportable reports", "Open the console, select a scenario, change the world state, and inspect the recomputed plan. This is a product demonstration, not a claim that customer production outcomes have been achieved."],
  ["Estimate capacity value", "Replace defaults with your measurements", "Illustration: 30 task hours/week × 52/12 × 50% automation × $60/hour = $3,900 monthly capacity value. At $2,000/month, estimated net capacity value is $1,900/month before additional costs."],
  ["Agree on a bounded pilot", "Baseline, scope, acceptance, review", "Record baseline effort and failure rate. Choose one workflow. Set integration and data boundaries. Nominate an owner. Define pass/fail criteria, review checkpoints, and the pilot end date."],
  ["Price the actual engagement", "$2,000–$5,000 per agent/month", "Price depends on volume, integrations, support, service levels, and review requirements. Cloud compute and third-party services must be specified in the proposal; no unpriced unlimited usage assumption."],
  ["Expand when the numbers support it", "Use measured results as the case study", "The pilot report should include the baseline, period, sample size, accepted output count, cost, review time, and exceptions. Customer references and production revenue require separate evidence."],
  // 2026-11-10 Codex: previous draft referenced audrey@midnghtsapphire.com,
  // which exists in the old console but lacks a confirmed business-contact record.
  ["Bring one workflow", "Discuss a GOAP agent pilot", "Request a pilot through github.com/midnghtsapphire/revvel-standards/discussions/18238. Share a non-sensitive workflow summary and acceptance criteria. Calendar booking is unavailable. Try the interactive planner and ROI calculator before the conversation."],
];
*/

const slides = slideRows;

export default function SalesDeck() {
  return <main className="mx-auto max-w-5xl px-6 py-10">
    <style>{`@media print { @page { size: landscape; margin: 12mm; } nav { display: none !important; } main { padding: 0 !important; max-width: none !important; } .slide { break-after: page; border: none !important; min-height: 155mm; margin: 0 !important; color: #0f172a !important; background: white !important; } .slide:last-child { break-after: auto; } .slide p { color: #334155 !important; } }`}</style>
    <nav className="mb-8 flex flex-wrap justify-between gap-4"><Link href="/agent-as-fte" className="text-cyan-300">← Pilot and ROI calculator</Link><button onClick={() => window.print()} className="rounded-lg bg-cyan-300 px-5 py-2 font-semibold text-slate-950">Print / save {slides.length}-slide PDF</button></nav>
    {slides.map(([title, subtitle, body], index) => <section key={title} className="slide my-8 flex min-h-[28rem] flex-col justify-center gap-7 rounded-2xl border border-slate-700 bg-slate-900 p-12"><p className="text-sm uppercase tracking-widest text-cyan-300">REVVEL · {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}</p><h1 className="text-4xl font-bold">{title}</h1><h2 className="text-2xl text-cyan-300">{subtitle}</h2><p className="max-w-3xl text-xl leading-relaxed text-slate-300">{body}</p></section>)}
  </main>;
}
