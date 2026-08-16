"use client";

import { useMemo, useState } from "react";
import {
  SAMPLE_STARRED_REPOS,
  StarredRepo,
  TRENDING_TOPICS,
  buildCsvExport,
  buildStarMagnetReadmeBlock,
  estimateOrganicGrowth,
  generatePrioritizedMarkdown,
  mergeDiscoveryTopics,
  rankRepos,
} from "./data/engine";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function HomePage() {
  const [owner, setOwner] = useState("midnghtsapphire");
  const [repo, setRepo] = useState("revvel-standards");
  const [topicsText, setTopicsText] = useState("standards, automation, workflow");
  const [currentStars, setCurrentStars] = useState(12);
  const [starsYesterday, setStarsYesterday] = useState(10);
  const [dailyVisitors, setDailyVisitors] = useState(80);
  const [conversionPct, setConversionPct] = useState(2.5);
  const [jsonInput, setJsonInput] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [customRepos, setCustomRepos] = useState<StarredRepo[] | null>(null);

  const checkoutUrl =
    process.env.NEXT_PUBLIC_POLAR_CHECKOUT_URL ??
    "mailto:audrey@midnghtsapphire.com?subject=Star%20Magnet%20Pro";

  const currentTopics = useMemo(
    () =>
      topicsText
        .split(/[,\n]/)
        .map((t) => t.trim())
        .filter(Boolean),
    [topicsText],
  );

  const repos = customRepos ?? SAMPLE_STARRED_REPOS;
  const scored = useMemo(() => rankRepos(repos), [repos]);
  const growth = useMemo(
    () =>
      estimateOrganicGrowth({
        owner,
        repo,
        currentTopics,
        currentStars,
        starsYesterday,
        dailyOrganicVisitors: dailyVisitors,
        conversionRatePct: conversionPct,
      }),
    [
      owner,
      repo,
      currentTopics,
      currentStars,
      starsYesterday,
      dailyVisitors,
      conversionPct,
    ],
  );
  const markdown = useMemo(() => generatePrioritizedMarkdown(scored), [scored]);
  const readmeBlock = useMemo(
    () => buildStarMagnetReadmeBlock(owner, repo),
    [owner, repo],
  );
  const recommendedTopics = useMemo(
    () => mergeDiscoveryTopics(currentTopics),
    [currentTopics],
  );

  function applyJson() {
    try {
      const parsed = JSON.parse(jsonInput) as unknown;
      const list = Array.isArray(parsed)
        ? parsed
        : (parsed as { repos?: StarredRepo[] }).repos;
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error("JSON must be an array of repos or { repos: [...] }");
      }
      for (const item of list) {
        if (!item?.nameWithOwner || !item?.url) {
          throw new Error("Each repo needs nameWithOwner and url");
        }
      }
      setCustomRepos(list as StarredRepo[]);
      setParseError(null);
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Invalid JSON");
    }
  }

  return (
    <div className="bg-magnet min-h-screen text-slate-100">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section className="glass rounded-3xl p-6 shadow-2xl sm:p-8">
          <p className="inline-flex rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold tracking-wide text-amber-200">
            TOS-compliant · Free GitHub API · No star farms
          </p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
            Self-Optimizing Star Magnet
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Convert a public repository into an organic traffic &amp; star magnet:
            priority-score starred indexes, GSEO topic recommendations, live Shields.io
            badges, and hourly automation — without paid ads or third-party growth APIs.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={checkoutUrl}
              className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            >
              Get Star Magnet Pro
            </a>
            <button
              type="button"
              onClick={() =>
                download("PRIORITIZED_STARS.md", markdown, "text/markdown;charset=utf-8")
              }
              className="rounded-xl border border-slate-500/50 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-sky-400/60"
            >
              Download PRIORITIZED_STARS.md
            </button>
            <button
              type="button"
              onClick={() =>
                download(
                  "prioritized-stars.csv",
                  buildCsvExport(scored),
                  "text/csv;charset=utf-8",
                )
              }
              className="rounded-xl border border-slate-500/50 bg-slate-900/60 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-sky-400/60"
            >
              Export CSV
            </button>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="glass rounded-3xl p-5 lg:col-span-1">
            <h2 className="text-lg font-semibold text-white">Growth inputs</h2>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-1 text-sm">
                <span className="text-slate-300">Owner</span>
                <input
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  className="rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-300">Repository</span>
                <input
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                  className="rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span className="text-slate-300">Current topics (comma-separated)</span>
                <textarea
                  value={topicsText}
                  onChange={(e) => setTopicsText(e.target.value)}
                  rows={2}
                  className="rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm">
                  <span className="text-slate-300">Stars now</span>
                  <input
                    type="number"
                    min={0}
                    value={currentStars}
                    onChange={(e) => setCurrentStars(Number(e.target.value))}
                    className="rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-slate-300">Stars yesterday</span>
                  <input
                    type="number"
                    min={0}
                    value={starsYesterday}
                    onChange={(e) => setStarsYesterday(Number(e.target.value))}
                    className="rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-slate-300">Daily visitors</span>
                  <input
                    type="number"
                    min={0}
                    value={dailyVisitors}
                    onChange={(e) => setDailyVisitors(Number(e.target.value))}
                    className="rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2"
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-slate-300">Conversion %</span>
                  <input
                    type="number"
                    min={0.1}
                    max={25}
                    step={0.1}
                    value={conversionPct}
                    onChange={(e) => setConversionPct(Number(e.target.value))}
                    className="rounded-xl border border-slate-600 bg-slate-950/70 px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
              <p className="text-xs uppercase tracking-wide text-amber-200">
                Projected organic stars / day
              </p>
              <p className="mt-1 text-3xl font-bold text-white">
                {growth.projectedDailyStarsLow} – {growth.projectedDailyStarsHigh}
              </p>
              <p className="mt-2 text-xs text-slate-300">
                Confidence: <strong>{growth.confidence}</strong> · velocity{" "}
                {growth.starVelocity >= 0 ? "+" : ""}
                {growth.starVelocity}/day
              </p>
            </div>
          </div>

          <div className="glass rounded-3xl p-5 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white">
              Priority index ({scored.length} repos)
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="px-2 py-2">#</th>
                    <th className="px-2 py-2">Score</th>
                    <th className="px-2 py-2">Repository</th>
                    <th className="px-2 py-2">Lang</th>
                    <th className="px-2 py-2">Stars</th>
                  </tr>
                </thead>
                <tbody>
                  {scored.slice(0, 12).map((item, index) => (
                    <tr
                      key={item.repo.nameWithOwner}
                      className="border-t border-slate-700/70 text-slate-200"
                    >
                      <td className="px-2 py-2">{index + 1}</td>
                      <td className="px-2 py-2 font-semibold text-amber-200">
                        {item.score}
                      </td>
                      <td className="px-2 py-2">
                        <a
                          href={item.repo.url}
                          className="text-sky-300 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {item.repo.nameWithOwner}
                        </a>
                      </td>
                      <td className="px-2 py-2">
                        {item.repo.primaryLanguage?.name ?? "N/A"}
                      </td>
                      <td className="px-2 py-2">
                        {(item.repo.stargazerCount || 0).toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="glass rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-white">GSEO topic plan</h2>
            <p className="mt-2 text-sm text-slate-300">
              Merge current topics with high-volume developer search terms (max 20).
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {recommendedTopics.map((topic) => (
                <span
                  key={topic}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    growth.topicGaps.includes(topic)
                      ? "bg-sky-500/20 text-sky-200"
                      : "bg-emerald-500/15 text-emerald-200"
                  }`}
                >
                  {topic}
                  {growth.topicGaps.includes(topic) ? " · add" : " · keep"}
                </span>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Trending seed set: {TRENDING_TOPICS.join(", ")}
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {growth.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>

          <div className="glass rounded-3xl p-5">
            <h2 className="text-lg font-semibold text-white">Star-magnet README block</h2>
            <p className="mt-2 text-sm text-slate-300">
              Paste at the top of your README for live Shields.io social proof.
            </p>
            <pre className="mt-4 max-h-64 overflow-auto rounded-2xl bg-slate-950/80 p-4 text-xs text-slate-200">
              {readmeBlock}
            </pre>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(readmeBlock)}
              className="mt-3 rounded-xl border border-slate-500/50 px-3 py-2 text-sm hover:border-amber-300/50"
            >
              Copy README block
            </button>
          </div>
        </section>

        <section className="glass rounded-3xl p-5">
          <h2 className="text-lg font-semibold text-white">
            Import starred repos JSON (optional)
          </h2>
          <p className="mt-2 text-sm text-slate-300">
            Paste GraphQL-shaped repos (nameWithOwner, url, stargazerCount, pushedAt,
            starredAt, primaryLanguage, releases, repositoryTopics). Leave empty to use
            the built-in demo corpus.
          </p>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            rows={6}
            className="mt-3 w-full rounded-2xl border border-slate-600 bg-slate-950/70 px-3 py-2 font-mono text-xs"
            placeholder='[{"nameWithOwner":"owner/repo","url":"https://github.com/owner/repo","stargazerCount":100,"pushedAt":"2026-08-01T00:00:00Z"}]'
          />
          <div className="mt-3 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={applyJson}
              className="rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400"
            >
              Score imported repos
            </button>
            <button
              type="button"
              onClick={() => {
                setCustomRepos(null);
                setParseError(null);
              }}
              className="rounded-xl border border-slate-500/50 px-4 py-2 text-sm"
            >
              Reset to sample data
            </button>
          </div>
          {parseError ? (
            <p className="mt-2 text-sm text-rose-300">{parseError}</p>
          ) : null}
        </section>

        <section className="glass rounded-3xl p-5">
          <h2 className="text-lg font-semibold text-white">Hourly automation path</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>
              Root engine: <code>prioritize_and_optimize.py</code> writes{" "}
              <code>PRIORITIZED_STARS.md</code> and optionally merges discovery topics.
            </li>
            <li>
              Workflow:{" "}
              <code>.github/workflows/hourly-growth-prioritizer.yml</code> runs on{" "}
              <code>0 * * * *</code> with concurrency lock + <code>[skip ci]</code>.
            </li>
            <li>
              Token: set repo secret <code>GH_PAT</code> (contents:write; optional
              administration for topics). Falls back to <code>GITHUB_TOKEN</code>.
            </li>
            <li>
              Topic writes are opt-in via <code>ENABLE_TOPIC_UPDATES=true</code> so CI
              never surprise-mutates unrelated repos.
            </li>
          </ol>
        </section>
      </main>
    </div>
  );
}
