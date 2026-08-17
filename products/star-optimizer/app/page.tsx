"use client";

import { useMemo, useState } from "react";
import {
  FIXTURE_NOW,
  generateMarkdown,
  prioritizeRepos,
  sampleFixtureRepos,
  type RankedRepo,
  type StarRepoInput,
} from "../lib/scoring";

function normalizeImported(raw: unknown): StarRepoInput[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { repos?: unknown }).repos)
      ? (raw as { repos: unknown[] }).repos
      : null;

  if (!list) {
    throw new Error('JSON must be an array of repos or an object with a "repos" array.');
  }

  return list.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Item ${index} is not an object.`);
    }
    const repo = item as Record<string, unknown>;
    const name =
      (typeof repo.nameWithOwner === "string" && repo.nameWithOwner) ||
      (typeof repo.full_name === "string" && repo.full_name) ||
      "";
    if (!name) {
      throw new Error(`Item ${index} is missing nameWithOwner/full_name.`);
    }
    const url =
      (typeof repo.url === "string" && repo.url) ||
      (typeof repo.html_url === "string" && repo.html_url) ||
      `https://github.com/${name}`;

    return {
      nameWithOwner: name,
      url,
      description: typeof repo.description === "string" ? repo.description : "",
      stargazerCount: Number(repo.stargazerCount ?? repo.stargazers_count ?? 0) || 0,
      pushedAt: typeof repo.pushedAt === "string" ? repo.pushedAt : typeof repo.pushed_at === "string" ? repo.pushed_at : null,
      starredAt: typeof repo.starredAt === "string" ? repo.starredAt : typeof repo.starred_at === "string" ? repo.starred_at : null,
      primaryLanguage: (repo.primaryLanguage as StarRepoInput["primaryLanguage"]) ??
        (typeof repo.language === "string" ? repo.language : null),
      releases: (repo.releases as StarRepoInput["releases"]) ?? { nodes: [] },
      topics: Array.isArray(repo.topics) ? (repo.topics as string[]) : null,
      repositoryTopics: repo.repositoryTopics as StarRepoInput["repositoryTopics"],
    };
  });
}

export default function HomePage() {
  const [jsonText, setJsonText] = useState(() => JSON.stringify(sampleFixtureRepos(), null, 2));
  const [ranked, setRanked] = useState<RankedRepo[]>(() =>
    prioritizeRepos(sampleFixtureRepos(), FIXTURE_NOW),
  );
  const [error, setError] = useState<string | null>(null);
  const [useLiveClock, setUseLiveClock] = useState(false);

  const markdown = useMemo(
    () => generateMarkdown(ranked, useLiveClock ? new Date() : FIXTURE_NOW),
    [ranked, useLiveClock],
  );

  const runScore = (source: string, live: boolean) => {
    try {
      const parsed = JSON.parse(source) as unknown;
      const repos = normalizeImported(parsed);
      const now = live ? new Date() : FIXTURE_NOW;
      setRanked(prioritizeRepos(repos, now));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to score repositories.");
    }
  };

  return (
    <main>
      <section className="hero">
        <span className="badge">SaaS · Star Optimizer</span>
        <h1>Prioritize starred GitHub repositories</h1>
        <p className="muted">
          Score repos by push recency, release health, logarithmic popularity, and how recently
          you starred them. Paste GraphQL/export JSON for a ranked table and Markdown report, or
          run the scheduled automation in this monorepo every 6 hours.
        </p>
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Input JSON</h2>
          <label htmlFor="repos-json">Array of repos or {"{ repos: [...] }"}</label>
          <textarea
            id="repos-json"
            value={jsonText}
            onChange={(event) => setJsonText(event.target.value)}
            spellCheck={false}
          />
          <div className="actions">
            <button type="button" onClick={() => runScore(jsonText, useLiveClock)}>
              Score repositories
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                const sample = JSON.stringify(sampleFixtureRepos(), null, 2);
                setJsonText(sample);
                setUseLiveClock(false);
                runScore(sample, false);
              }}
            >
              Load demo fixtures
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setUseLiveClock(true);
                runScore(jsonText, true);
              }}
            >
              Score with live clock
            </button>
          </div>
          {error ? <p className="error">{error}</p> : null}
          <p className="muted" style={{ marginTop: "0.9rem", fontSize: "0.9rem" }}>
            Automation path: <code>python scripts/prioritize_stars.py</code> via{" "}
            <code>prioritize-stars.yml</code>. Optional secret name: <code>GH_PAT</code>.
          </p>
        </section>

        <section className="panel">
          <h2>Ranked results</h2>
          <div className="stats">
            <div className="stat">
              <strong>{ranked.length}</strong>
              <span className="muted">repos</span>
            </div>
            <div className="stat">
              <strong>{ranked[0]?.score ?? "—"}</strong>
              <span className="muted">top score</span>
            </div>
            <div className="stat">
              <strong>{ranked[0]?.nameWithOwner?.split("/")[1] ?? "—"}</strong>
              <span className="muted">top name</span>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Score</th>
                  <th>Repository</th>
                  <th>Lang</th>
                  <th>Stars</th>
                  <th>Push</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((repo) => (
                  <tr key={repo.nameWithOwner}>
                    <td>{repo.rank}</td>
                    <td className="score">{repo.score}</td>
                    <td>
                      <a href={repo.url} target="_blank" rel="noreferrer">
                        {repo.nameWithOwner}
                      </a>
                      <div className="muted" style={{ fontSize: "0.8rem" }}>
                        {repo.topics.length ? repo.topics.join(", ") : "—"}
                      </div>
                    </td>
                    <td>{repo.primaryLanguage}</td>
                    <td>{repo.stargazerCount.toLocaleString("en-US")}</td>
                    <td>{repo.pushedAt ? repo.pushedAt.slice(0, 10) : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 style={{ marginTop: "1.25rem" }}>Markdown export</h2>
          <div className="actions">
            <button
              type="button"
              className="secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(markdown);
              }}
            >
              Copy Markdown
            </button>
          </div>
          <pre>{markdown}</pre>
        </section>
      </div>
    </main>
  );
}
