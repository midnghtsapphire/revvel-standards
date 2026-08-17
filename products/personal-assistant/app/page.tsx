"use client";

import { useMemo, useState } from "react";
import {
  PipelineResult,
  RawFragment,
  SAMPLE_FRAGMENTS,
  runPipeline,
} from "./data/pipeline";
import { CATEGORY_LABELS, SOURCE_DEFINITIONS, SourceKind } from "./data/sources";

interface DraftFragment {
  id: string;
  source: SourceKind;
  title: string;
  body: string;
}

function newDraft(partial?: Partial<DraftFragment>): DraftFragment {
  return {
    id: partial?.id || `local-${Math.random().toString(36).slice(2, 9)}`,
    source: partial?.source || "other",
    title: partial?.title || "",
    body: partial?.body || "",
  };
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [drafts, setDrafts] = useState<DraftFragment[]>([
    newDraft({
      source: "gmail",
      title: "",
      body: "",
    }),
  ]);
  const [owner, setOwner] = useState("midnghtsapphire");
  const [repoName, setRepoName] = useState("personal-knowledge-base");
  const [defaultBranch, setDefaultBranch] = useState("main");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkoutUrl =
    process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL ??
    "mailto:audrey@midnghtsapphire.com?subject=Personal%20Assistant%20Pro";

  const livePreview = useMemo(() => {
    const fragments: RawFragment[] = drafts
      .filter((draft) => draft.body.trim())
      .map((draft) => ({
        id: draft.id,
        source: draft.source,
        title: draft.title || undefined,
        body: draft.body,
      }));
    if (fragments.length === 0) return null;
    return runPipeline(fragments, { owner, repoName, defaultBranch });
  }, [drafts, owner, repoName, defaultBranch]);

  const active = result ?? livePreview;

  function updateDraft(id: string, patch: Partial<DraftFragment>) {
    setDrafts((previous) =>
      previous.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)),
    );
  }

  function loadSample() {
    setDrafts(
      SAMPLE_FRAGMENTS.map((fragment) =>
        newDraft({
          id: fragment.id,
          source: fragment.source as SourceKind,
          title: fragment.title || "",
          body: fragment.body,
        }),
      ),
    );
    setResult(null);
    setError(null);
  }

  function runPlan() {
    const fragments: RawFragment[] = drafts
      .filter((draft) => draft.body.trim())
      .map((draft) => ({
        id: draft.id,
        source: draft.source,
        title: draft.title || undefined,
        body: draft.body,
      }));

    if (fragments.length === 0) {
      setError("Add at least one fragment with body text, or load the sample corpus.");
      setResult(null);
      return;
    }

    setError(null);
    setResult(runPipeline(fragments, { owner, repoName, defaultBranch }));
  }

  return (
    <div className="min-h-screen text-slate-100">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="glass rounded-3xl p-6 shadow-2xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <p className="inline-flex rounded-full bg-sky-400/15 px-3 py-1 text-xs font-semibold tracking-wide text-sky-200">
                Revvel Personal Assistant · Port 3012
              </p>
              <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
                Fragmented life data → structured GitHub directories
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-base">
                Paste exports from Gmail, Outlook, Yahoo, Keep, Drive, SMS, or plain notes.
                A five-agent pipeline redacts PII, classifies content, and emits a reviewable
                repository tree plus commit/PR plan — no API key required for the core path.
              </p>
            </div>
            <a
              href={checkoutUrl}
              className="rounded-2xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
            >
              Upgrade to Assistant Pro
            </a>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {[
              ["1. Ingest + Privacy", "Normalize multi-source dumps and redact emails, phones, handles."],
              ["2. Triage + Structure", "Classify into action items, docs, research, meetings, finance, code."],
              ["3. GitHub plan", "Directory tree, markdown files, CSV inventory, and PR steps."],
            ].map(([title, copy]) => (
              <div key={title} className="rounded-2xl border border-slate-700/70 bg-slate-950/40 p-4">
                <h2 className="text-sm font-semibold text-sky-200">{title}</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-400">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="glass rounded-3xl p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Source fragments</h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={loadSample}
                  className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-200"
                >
                  Load sample corpus
                </button>
                <button
                  type="button"
                  onClick={() => setDrafts((previous) => [...previous, newDraft()])}
                  className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-200"
                >
                  Add fragment
                </button>
                <button
                  type="button"
                  onClick={runPlan}
                  className="rounded-xl bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-sky-400"
                >
                  Run multi-agent plan
                </button>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                GitHub owner
                <input
                  value={owner}
                  onChange={(event) => setOwner(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Repository
                <input
                  value={repoName}
                  onChange={(event) => setRepoName(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Default branch
                <input
                  value={defaultBranch}
                  onChange={(event) => setDefaultBranch(event.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                />
              </label>
            </div>

            {error ? (
              <p className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                {error}
              </p>
            ) : null}

            <div className="mt-4 space-y-4">
              {drafts.map((draft, index) => (
                <article
                  key={draft.id}
                  className="rounded-2xl border border-slate-700/80 bg-slate-950/50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-200">
                      Fragment {index + 1}
                    </h3>
                    <button
                      type="button"
                      onClick={() =>
                        setDrafts((previous) =>
                          previous.length === 1
                            ? previous
                            : previous.filter((item) => item.id !== draft.id),
                        )
                      }
                      className="text-xs text-slate-400 hover:text-rose-300"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      Source
                      <select
                        value={draft.source}
                        onChange={(event) =>
                          updateDraft(draft.id, {
                            source: event.target.value as SourceKind,
                          })
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                      >
                        {SOURCE_DEFINITIONS.map((source) => (
                          <option key={source.id} value={source.id}>
                            {source.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-slate-400">
                      Title (optional)
                      <input
                        value={draft.title}
                        onChange={(event) =>
                          updateDraft(draft.id, { title: event.target.value })
                        }
                        placeholder="Short label for the note"
                        className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                      />
                    </label>
                  </div>
                  <label className="mt-3 flex flex-col gap-1 text-xs text-slate-400">
                    Body
                    <textarea
                      value={draft.body}
                      onChange={(event) =>
                        updateDraft(draft.id, { body: event.target.value })
                      }
                      rows={6}
                      placeholder="Paste the email, Keep note, SMS thread, Drive dump, or notepad text…"
                      className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-400"
                    />
                  </label>
                </article>
              ))}
            </div>
          </div>

          <aside className="glass rounded-3xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Pipeline output</h2>
            {!active ? (
              <p className="mt-4 text-sm text-slate-400">
                Load the sample corpus or paste your own fragments to see the live
                multi-agent plan.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Fragments" value={String(active.summary.fragmentCount)} />
                  <Stat label="Files planned" value={String(active.summary.fileCount)} />
                  <Stat
                    label="Emails redacted"
                    value={String(active.summary.redactionTotals.emails)}
                  />
                  <Stat
                    label="Phones redacted"
                    value={String(active.summary.redactionTotals.phones)}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-sky-200">Categories</h3>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    {Object.entries(active.summary.categoryCounts)
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, count]) => (
                        <li key={category} className="flex justify-between gap-3">
                          <span>
                            {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ??
                              category}
                          </span>
                          <span className="font-semibold text-slate-100">{count}</span>
                        </li>
                      ))}
                  </ul>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-sky-200">Directory tree</h3>
                  <pre className="mono mt-2 max-h-48 overflow-auto rounded-2xl border border-slate-700 bg-slate-950/70 p-3 text-[11px] leading-relaxed text-emerald-200">
                    {active.directoryTree.join("\n")}
                  </pre>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-sky-200">Commit plan</h3>
                  <ol className="mt-2 max-h-40 list-decimal space-y-1 overflow-auto pl-5 text-xs text-slate-300">
                    {active.commitPlan.map((step) => (
                      <li key={`${step.order}-${step.target}`}>
                        <span className="font-semibold text-slate-100">{step.action}</span>{" "}
                        <span className="mono text-violet-200">{step.target}</span>
                        <div className="text-slate-400">{step.detail}</div>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-sky-200">Agent log</h3>
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {active.agentLog.map((line) => (
                      <li key={line}>• {line}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadText(
                        "personal-assistant-plan.md",
                        active.markdownExport,
                        "text/markdown;charset=utf-8",
                      )
                    }
                    className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-sky-400"
                  >
                    Download Markdown
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadText(
                        "personal-assistant-files.csv",
                        active.csvExport,
                        "text/csv;charset=utf-8",
                      )
                    }
                    className="rounded-xl border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-100 hover:border-sky-400"
                  >
                    Download CSV
                  </button>
                </div>

                <div className="rounded-2xl border border-violet-400/30 bg-violet-500/10 p-3 text-xs leading-relaxed text-violet-100">
                  Privacy first: emails, phone numbers, and @handles are redacted before
                  classification and export. Do not paste secrets or credentials — use
                  exports that you are comfortable structuring into a private repo.
                </div>
              </div>
            )}
          </aside>
        </section>

        {active ? (
          <section className="glass rounded-3xl p-5 sm:p-6">
            <h2 className="text-xl font-semibold">Classified fragments</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Title</th>
                    <th className="px-3 py-2">Source</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2">Confidence</th>
                    <th className="px-3 py-2">Redactions</th>
                  </tr>
                </thead>
                <tbody>
                  {active.fragments.map((fragment) => (
                    <tr key={fragment.id} className="border-t border-slate-800">
                      <td className="px-3 py-3 font-medium text-slate-100">
                        {fragment.title}
                      </td>
                      <td className="px-3 py-3 text-slate-300">{fragment.source}</td>
                      <td className="px-3 py-3 text-sky-200">
                        {CATEGORY_LABELS[fragment.category]}
                      </td>
                      <td className="px-3 py-3 text-slate-300">
                        {(fragment.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="px-3 py-3 text-slate-400">
                        e{fragment.redactions.emails}/p{fragment.redactions.phones}/h
                        {fragment.redactions.handles}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="glass rounded-3xl p-5 text-sm text-slate-300 sm:p-6">
          <h2 className="text-lg font-semibold text-slate-100">Architecture fit</h2>
          <p className="mt-2 leading-relaxed">
            This product operationalizes the WR-16432 research stack inside revvel-standards:
            n8n/custom scripts (or paste) unify streams → a CrewAI/LangGraph-style multi-agent
            loop classifies and structures → a fine-grained GitHub plan is ready for PAT-backed
            commits. Connectors for live OAuth (Gmail/Drive/Outlook) can attach later via MCP
            without changing the <span className="mono">runPipeline()</span> contract.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            API: <span className="mono">GET/POST /api/plan</span> · Dev port{" "}
            <span className="mono">3012</span>
          </p>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950/50 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-50">{value}</p>
    </div>
  );
}
