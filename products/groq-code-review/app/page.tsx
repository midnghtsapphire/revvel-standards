"use client";

import { useMemo, useState } from "react";
import { estimateReviewUnits } from "../lib/chunk";
import { buildWorkflowSnippet } from "../lib/review-engine";
import { DEFAULT_CHUNK_SIZE, DEFAULT_MODEL, ReviewResult } from "../lib/types";

const SAMPLE_DIFF = `diff --git a/src/auth.ts b/src/auth.ts
index 1111111..2222222 100644
--- a/src/auth.ts
+++ b/src/auth.ts
@@ -1,8 +1,12 @@
 export function login(user: string, pass: string) {
-  return check(user, pass);
+  const api_key = "sk-live-super-secret-value-12345";
+  console.log("login attempt", user, pass);
+  try {
+    return check(user, pass);
+  } catch (e) {}
+  // TODO: add MFA
+  return null;
 }
`;

type Severity = "critical" | "high" | "medium" | "low" | "info";

const SEV_STYLES: Record<Severity, string> = {
  critical: "bg-red-950 text-red-200 border-red-700",
  high: "bg-orange-950 text-orange-200 border-orange-700",
  medium: "bg-amber-950 text-amber-100 border-amber-700",
  low: "bg-sky-950 text-sky-100 border-sky-700",
  info: "bg-slate-800 text-slate-200 border-slate-600",
};

export default function HomePage() {
  const [diff, setDiff] = useState(SAMPLE_DIFF);
  const [chunkSize, setChunkSize] = useState(DEFAULT_CHUNK_SIZE);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [forceLocal, setForceLocal] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [githubBody, setGithubBody] = useState<string>("");

  const units = useMemo(() => estimateReviewUnits(diff, chunkSize), [diff, chunkSize]);
  const workflow = useMemo(
    () => buildWorkflowSnippet({ model, chunkSize }),
    [model, chunkSize],
  );
  const checkoutUrl =
    process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL ??
    "mailto:audrey@midnghtsapphire.com?subject=Groq%20Code%20Review%20Pro";

  async function runReview() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          diff,
          chunkSize,
          model,
          forceLocal,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || `Review failed (${res.status})`);
      }
      setResult(json as ReviewResult);
      setGithubBody(typeof json.githubReviewBody === "string" ? json.githubReviewBody : "");
    } catch (err) {
      setResult(null);
      setGithubBody("");
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  function downloadMarkdown() {
    if (!result) return;
    const blob = new Blob([result.markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "groq-code-review-report.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyWorkflow() {
    void navigator.clipboard.writeText(workflow);
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-emerald-500/20 bg-slate-950/70 p-6 shadow-2xl backdrop-blur sm:p-8">
        <p className="inline-flex rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold tracking-wide text-emerald-300">
          production-app · saas · WR #16941
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Groq Code Review
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Paste a pull request unified diff. The engine chunks oversized PRs, reviews each
          chunk with Groq (or a deterministic local fallback), consolidates findings, and
          ships a GitHub Action workflow you can drop into any repo.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={checkoutUrl}
            className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400"
          >
            Upgrade / Polar checkout
          </a>
          <a
            href="#action"
            className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-slate-400"
          >
            GitHub Action bundle
          </a>
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5 shadow-xl sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Diff input</h2>
            <button
              type="button"
              onClick={() => setDiff(SAMPLE_DIFF)}
              className="text-xs font-medium text-emerald-300 hover:text-emerald-200"
            >
              Load sample diff
            </button>
          </div>
          <textarea
            value={diff}
            onChange={(e) => setDiff(e.target.value)}
            rows={16}
            spellCheck={false}
            className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-900/80 p-4 font-mono text-xs leading-relaxed text-slate-100 outline-none ring-emerald-500/40 focus:ring-2"
            placeholder="Paste git diff / PR patch here"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              Chunk size (chars)
              <input
                type="number"
                min={500}
                max={100000}
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value) || DEFAULT_CHUNK_SIZE)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-slate-300">
              Groq model (repoId)
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex items-center gap-2 self-end rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={forceLocal}
                onChange={(e) => setForceLocal(e.target.checked)}
              />
              Force local reviewer
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={loading || !diff.trim()}
              onClick={() => void runReview()}
              className="rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Reviewing…" : "Run review"}
            </button>
            <span className="text-xs text-slate-400">
              Est. chunks: <strong className="text-slate-200">{units}</strong>
            </span>
          </div>
          {error ? (
            <p className="mt-3 rounded-xl border border-red-800 bg-red-950/50 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5">
            <h2 className="text-lg font-semibold text-white">How it works</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
              <li>Split oversized PR diffs into model-safe chunks.</li>
              <li>Review each chunk with Groq Chat Completions.</li>
              <li>Fall back to local security/quality heuristics if Groq is unset or errors.</li>
              <li>Post a consolidated PR review body (Action) or download Markdown (SaaS).</li>
            </ol>
          </div>
          <div className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5">
            <h2 className="text-lg font-semibold text-white">SEO keywords</h2>
            <p className="mt-2 text-sm text-slate-400">
              AI code review, Groq API, GitHub Actions LLM, pull request review automation,
              llama3 code review, large PR chunking
            </p>
          </div>
          <div className="rounded-3xl border border-violet-500/30 bg-violet-950/30 p-5">
            <h2 className="text-lg font-semibold text-violet-100">Monetization</h2>
            <p className="mt-2 text-sm text-violet-100/80">
              Free local mode + optional Groq-backed Pro tier via Polar.sh / hosted Action
              minutes. Teams pay for faster models, private retention controls, and org-wide
              policy packs.
            </p>
          </div>
        </aside>
      </section>

      {result ? (
        <section className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Results</h2>
            <button
              type="button"
              onClick={downloadMarkdown}
              className="rounded-xl border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/10"
            >
              Download Markdown
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-300">{result.summary}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                ["critical", result.stats.critical],
                ["high", result.stats.high],
                ["medium", result.stats.medium],
                ["low", result.stats.low],
                ["info", result.stats.info],
              ] as Array<[Severity, number]>
            ).map(([sev, n]) => (
              <div
                key={sev}
                className={`rounded-xl border px-3 py-2 text-center text-xs font-semibold ${SEV_STYLES[sev]}`}
              >
                {sev}: {n}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            provider={result.stats.provider} · model={result.stats.model} · chunks=
            {result.stats.chunkCount}
          </p>
          <ul className="mt-5 space-y-3">
            {result.findings.length === 0 ? (
              <li className="rounded-2xl border border-slate-700 px-4 py-3 text-sm text-slate-400">
                No findings.
              </li>
            ) : (
              result.findings.map((f) => (
                <li
                  key={f.id}
                  className={`rounded-2xl border px-4 py-3 ${SEV_STYLES[f.severity as Severity] || SEV_STYLES.info}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {f.severity}
                    </span>
                    <span className="font-semibold">{f.title}</span>
                  </div>
                  <p className="mt-1 text-sm opacity-90">{f.detail}</p>
                  <p className="mt-1 text-[11px] opacity-70">
                    {f.file ? `${f.file}${f.lineHint ? `:${f.lineHint}` : ""} · ` : ""}
                    rule={f.ruleId} · chunk {f.chunkIndex + 1}
                  </p>
                </li>
              ))
            )}
          </ul>
          {githubBody ? (
            <details className="mt-5 rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-200">
                GitHub review body preview
              </summary>
              <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-xs text-slate-300">
                {githubBody}
              </pre>
            </details>
          ) : null}
        </section>
      ) : null}

      <section
        id="action"
        className="rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5 sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-white">GitHub Action workflow</h2>
          <button
            type="button"
            onClick={copyWorkflow}
            className="rounded-xl border border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-slate-400"
          >
            Copy YAML
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-400">
          Set repository secret <code className="text-emerald-300">GROQ_API_KEY</code>. The
          composite action lives at{" "}
          <code className="text-emerald-300">products/groq-code-review/action</code>. Large
          diffs are chunked with <code className="text-emerald-300">pullRequestDiffChunkSize</code>.
        </p>
        <pre className="mt-4 max-h-96 overflow-auto rounded-2xl border border-slate-800 bg-black/40 p-4 text-[11px] leading-relaxed text-slate-300">
          {workflow}
        </pre>
      </section>

      <footer className="pb-8 text-center text-xs text-slate-500">
        Inspired by marketplace action{" "}
        <a
          className="text-emerald-400 hover:underline"
          href="https://github.com/marketplace/actions/groq-code-review"
          target="_blank"
          rel="noreferrer"
        >
          Groq Code Review
        </a>
        . Local heuristics keep demos and CI green without credits.
      </footer>
    </main>
  );
}
