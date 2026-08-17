"use client";

import { useMemo, useState } from "react";
import {
  buildCsvExport,
  buildMarkdownReport,
  getDefaults,
  getResearchEvaluation,
  listScenarios,
  runSwarmTick,
  type WorldState,
} from "../lib/goap-engine.js";

const BOOL_ATOMS = [
  "workspaceReady",
  "depsInstalled",
  "testsPassing",
  "testsObserved",
  "lintClean",
  "prOpen",
  "reviewRequested",
  "reviewClean",
  "merged",
  "repoGreen",
  "blocked",
  "researched",
  "guiltHigh",
  "swarmSpawned",
  "codeChanged",
  "learningsWritten",
  "deployed",
] as const;

function StatusPill({ status }: { status: string }) {
  const color =
    status === "ready"
      ? "bg-emerald-900 text-emerald-200 border-emerald-700"
      : status === "watch"
        ? "bg-amber-900 text-amber-100 border-amber-700"
        : "bg-rose-900 text-rose-100 border-rose-700";
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold border ${color}`}>
      {status}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
      <div className="text-[11px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-50">{value}</div>
    </div>
  );
}

export default function HomePage() {
  const defaults = useMemo(() => getDefaults(), []);
  const scenarios = useMemo(() => listScenarios(), []);
  const research = useMemo(() => getResearchEvaluation(), []);

  const [world, setWorld] = useState<WorldState>({ ...defaults.world });
  const [goalId, setGoalId] = useState<string>("repo-green");
  const [scenarioId, setScenarioId] = useState<string>("fresh-repo");
  const [tab, setTab] = useState<"planner" | "research" | "export">("planner");

  const tick = useMemo(
    () =>
      runSwarmTick({
        world,
        goalId,
        goals: defaults.goals,
        actions: defaults.actions,
        agents: defaults.agents,
      }),
    [world, goalId, defaults],
  );

  const markdown = useMemo(() => buildMarkdownReport(tick), [tick]);
  const csv = useMemo(() => buildCsvExport(tick), [tick]);

  const checkoutUrl =
    process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL ??
    "mailto:audrey@midnghtsapphire.com?subject=GOAP%20Swarm%20Console%20Pro";

  function applyScenario(id: string) {
    const scenario = scenarios.find((s: { id: string }) => s.id === id);
    if (!scenario) return;
    setScenarioId(id);
    setWorld({ ...defaults.world, ...scenario.world });
    setGoalId(scenario.goalId);
  }

  function toggleAtom(key: string) {
    setWorld((prev) => ({ ...prev, [key]: !Boolean(prev[key]) }));
  }

  function download(filename: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-4 border-b border-slate-800 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">
              Revvel · WR-16500 · SaaS
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              GOAP Swarm Console
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Symbolic Goal-Oriented Action Planning with centralized swarm allocation,
              awareness / precog / guilt modules, and stigmergic trail bias. Evaluates the
              Grok GOAP+swarm proposal, hardens the bugs, and ships a planner you can click.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={tick.status} />
            <a
              href={checkoutUrl}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Upgrade Pro
            </a>
          </div>
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              ["planner", "Planner"],
              ["research", "Research eval"],
              ["export", "Export"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium border ${
                tab === id
                  ? "border-cyan-500 bg-cyan-950 text-cyan-100"
                  : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "planner" && (
          <div className="grid gap-6 lg:grid-cols-12">
            <section className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <h2 className="text-sm font-semibold text-white">Scenarios</h2>
                <div className="mt-3 grid gap-2">
                  {scenarios.map(
                    (s: { id: string; name: string; description: string }) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => applyScenario(s.id)}
                        className={`rounded-xl border p-3 text-left transition ${
                          scenarioId === s.id
                            ? "border-cyan-600 bg-cyan-950/40"
                            : "border-slate-800 bg-slate-950/40 hover:border-slate-600"
                        }`}
                      >
                        <div className="text-sm font-medium text-slate-100">{s.name}</div>
                        <div className="mt-1 text-xs text-slate-400">{s.description}</div>
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <h2 className="text-sm font-semibold text-white">Goal</h2>
                <select
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
                  className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                >
                  {defaults.goals.map((g: { id: string; name: string; priority: number }) => (
                    <option key={g.id} value={g.id}>
                      {g.name} (p{g.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <h2 className="text-sm font-semibold text-white">World state atoms</h2>
                <p className="mt-1 text-xs text-slate-400">Toggle atoms the planner senses.</p>
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                  {BOOL_ATOMS.map((atom) => {
                    const on = Boolean(world[atom]);
                    return (
                      <button
                        key={atom}
                        type="button"
                        onClick={() => toggleAtom(atom)}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-xs ${
                          on
                            ? "border-emerald-700 bg-emerald-950/40 text-emerald-100"
                            : "border-slate-800 bg-slate-950/50 text-slate-300"
                        }`}
                      >
                        <span className="font-mono">{atom}</span>
                        <span className="font-semibold">{on ? "true" : "false"}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="lg:col-span-8 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Plan length" value={String(tick.metrics.planLength)} />
                <Metric
                  label="Plan cost"
                  value={tick.metrics.planCost == null ? "n/a" : String(tick.metrics.planCost)}
                />
                <Metric
                  label="Success %"
                  value={`${(tick.metrics.successProbability * 100).toFixed(1)}%`}
                />
                <Metric label="Guilt" value={String(tick.metrics.guiltScore)} />
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-white">
                    Plan → {tick.goal.name}
                  </h2>
                  <div className="text-xs text-slate-400">
                    expanded {tick.plan.expanded} nodes · topology {tick.swarm.topology}
                  </div>
                </div>
                {!tick.plan.ok && (
                  <p className="mt-3 rounded-lg border border-rose-900 bg-rose-950/40 px-3 py-2 text-sm text-rose-100">
                    No complete plan ({tick.plan.reason}). Guilt action: {tick.guilt.action}.
                  </p>
                )}
                <ol className="mt-4 space-y-2">
                  {tick.plan.plan.length === 0 && tick.plan.ok && (
                    <li className="text-sm text-slate-400">Goal already satisfied — empty plan.</li>
                  )}
                  {tick.plan.plan.map(
                    (
                      step: { id: string; name: string; role: string; cost: number },
                      index: number,
                    ) => {
                      const asg = tick.swarm.assignments[index];
                      return (
                        <li
                          key={`${step.id}-${index}`}
                          className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-100">
                              {index + 1}. {step.name}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {step.id} · role {step.role} · cost {step.cost}
                            </div>
                          </div>
                          <div className="text-xs text-cyan-200">
                            {asg ? `${asg.agentName} (${asg.agentId})` : "unassigned"}
                          </div>
                        </li>
                      );
                    },
                  )}
                </ol>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <h3 className="text-sm font-semibold text-white">Awareness</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    score {tick.awareness.awarenessScore}
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-slate-300">
                    {tick.awareness.anomalies.length === 0 && <li>No anomalies</li>}
                    {tick.awareness.anomalies.map(
                      (a: { atom: string; expected: unknown; actual: unknown; severity: string }) => (
                        <li key={a.atom} className="rounded-lg bg-slate-950/70 px-2 py-1.5">
                          <span className="font-mono text-amber-200">{a.atom}</span> expected{" "}
                          {String(a.expected)}, got {String(a.actual)} ({a.severity})
                        </li>
                      ),
                    )}
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <h3 className="text-sm font-semibold text-white">Precog</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {(tick.precog.successProbability * 100).toFixed(1)}% ·{" "}
                    {tick.precog.recommendation}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-slate-300">
                    <li>Residual atoms: {tick.precog.residualUnsatisfied}</li>
                    <li>Failed at: {tick.precog.failedAt || "—"}</li>
                    <li>Steps simulated: {tick.precog.steps.length}</li>
                  </ul>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <h3 className="text-sm font-semibold text-white">Guilt / escalate</h3>
                  <p className="mt-1 text-xs text-slate-400">
                    {tick.guilt.guiltScore} / threshold {tick.guilt.threshold}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-slate-300">
                    <li>Action: {tick.guilt.action}</li>
                    <li>Open goals: {tick.guilt.openGoals.length}</li>
                    <li>Multiplier: {tick.guilt.multiplier.toFixed(2)}x</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                <h3 className="text-sm font-semibold text-white">Stigmergic trails</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.keys(tick.trails).length === 0 && (
                    <span className="text-xs text-slate-500">No deposits yet</span>
                  )}
                  {Object.entries(tick.trails as Record<string, number>).map(([k, v]) => (
                    <span
                      key={k}
                      className="rounded-full border border-violet-800 bg-violet-950/50 px-2.5 py-1 text-xs text-violet-100"
                    >
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {tab === "research" && (
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <h2 className="text-lg font-semibold text-white">Research evaluation</h2>
              <p className="mt-2 text-sm text-slate-300">{research.summary}</p>
              <p className="mt-3 text-xs text-slate-400">
                Source: {research.sourceDoc} · Evaluated {research.evaluatedAt}
              </p>
              <p className="mt-4 text-sm text-cyan-200">
                Monetization: {research.monetizationPath}
              </p>
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <h3 className="font-semibold text-emerald-300">Validated claims</h3>
                <ul className="mt-3 space-y-3">
                  {research.validated.map(
                    (item: {
                      id: string;
                      claim: string;
                      verdict: string;
                      confidence: string;
                      evidence: string;
                      starsOrSource: string;
                    }) => (
                      <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                        <div className="text-sm text-slate-100">{item.claim}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {item.verdict} · confidence {item.confidence}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{item.evidence}</div>
                        <div className="mt-1 text-xs text-cyan-500/80">{item.starsOrSource}</div>
                      </li>
                    ),
                  )}
                </ul>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
                <h3 className="font-semibold text-rose-300">Bugs & risks found</h3>
                <ul className="mt-3 space-y-3">
                  {research.bugsAndRisks.map(
                    (item: {
                      id: string;
                      severity: string;
                      issue: string;
                      mitigation: string;
                    }) => (
                      <li key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                        <div className="text-xs uppercase tracking-wide text-rose-300">
                          {item.severity}
                        </div>
                        <div className="mt-1 text-sm text-slate-100">{item.issue}</div>
                        <div className="mt-2 text-xs text-emerald-200/90">
                          Mitigation: {item.mitigation}
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <h3 className="font-semibold text-cyan-300">Better tech recommendations</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {research.betterTech.map(
                  (item: {
                    id: string;
                    title: string;
                    why: string;
                    monetization: string;
                  }) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-800 bg-slate-950/50 p-3"
                    >
                      <div className="text-sm font-medium text-white">{item.title}</div>
                      <div className="mt-1 text-xs text-slate-400">{item.why}</div>
                      <div className="mt-2 text-xs text-cyan-200">{item.monetization}</div>
                    </div>
                  ),
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <h3 className="font-semibold text-white">SEO / marketing keywords</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {research.marketingKeywords.map((kw: string) => (
                  <span
                    key={kw}
                    className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300"
                  >
                    {kw}
                  </span>
                ))}
              </div>
              <h3 className="mt-5 font-semibold text-white">Citations</h3>
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
                {research.citations.map((c: { label: string; url: string; note: string }) => (
                  <li key={c.url}>
                    <span className="text-cyan-300">{c.label}</span> — {c.note}{" "}
                    <span className="text-xs text-slate-500">({c.url})</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === "export" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-white">Markdown report</h2>
                <button
                  type="button"
                  onClick={() => download("goap-swarm-report.md", markdown, "text/markdown")}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-100 hover:border-cyan-500"
                >
                  Download .md
                </button>
              </div>
              <pre className="mt-3 max-h-[28rem] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300 whitespace-pre-wrap">
                {markdown}
              </pre>
            </section>
            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-white">CSV assignments</h2>
                <button
                  type="button"
                  onClick={() => download("goap-swarm-plan.csv", csv, "text/csv")}
                  className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-100 hover:border-cyan-500"
                >
                  Download .csv
                </button>
              </div>
              <pre className="mt-3 max-h-[28rem] overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300 whitespace-pre-wrap">
                {csv}
              </pre>
              <p className="mt-4 text-xs text-slate-400">
                API: <code className="text-cyan-300">POST /api/plan</code> and{" "}
                <code className="text-cyan-300">POST /api/report</code> accept JSON world/goal
                payloads and return the same structures for automations.
              </p>
            </section>
          </div>
        )}

        <footer className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-500">
          Engine v{tick.engineVersion} · Built for midnghtsapphire/revvel-standards WR-16500 ·
          Symbolic planner only (no secrets required for free tier).
        </footer>
      </div>
    </main>
  );
}
