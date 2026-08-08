/**
 * Star Optimizer scoring engine (TypeScript).
 * Must stay numerically aligned with scripts/prioritize_stars.py.
 */

export interface StarRepoInput {
  nameWithOwner: string;
  url: string;
  description?: string | null;
  stargazerCount: number;
  pushedAt?: string | null;
  starredAt?: string | null;
  primaryLanguage?: string | { name?: string | null } | null;
  releases?: { nodes?: Array<{ createdAt?: string | null }> | null } | null;
  /** Flat topics array OR GraphQL repositoryTopics shape */
  topics?: string[] | null;
  repositoryTopics?: {
    nodes?: Array<{ topic?: { name?: string | null } | null } | null> | null;
  } | null;
}

export interface ScoreBreakdown {
  push: number;
  release: number;
  stars: number;
  starredAt: number;
  total: number;
}

export interface RankedRepo {
  rank: number;
  score: number;
  breakdown: ScoreBreakdown;
  nameWithOwner: string;
  url: string;
  description: string;
  stargazerCount: number;
  pushedAt: string;
  starredAt: string;
  primaryLanguage: string;
  topics: string[];
}

function parseIso(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysBetween(now: Date, then: Date | null): number | null {
  if (!then) return null;
  const ms = now.getTime() - then.getTime();
  return Math.max(Math.floor(ms / 86_400_000), 0);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function languageName(repo: StarRepoInput): string {
  if (!repo.primaryLanguage) return "N/A";
  if (typeof repo.primaryLanguage === "string") return repo.primaryLanguage || "N/A";
  return repo.primaryLanguage.name || "N/A";
}

export function topicList(repo: StarRepoInput): string[] {
  if (Array.isArray(repo.topics) && repo.topics.length) {
    return repo.topics.filter((t): t is string => typeof t === "string" && t.length > 0);
  }
  const nodes = repo.repositoryTopics?.nodes ?? [];
  return nodes
    .map((n) => n?.topic?.name)
    .filter((t): t is string => typeof t === "string" && t.length > 0);
}

export function scoreBreakdown(repo: StarRepoInput, now: Date = new Date()): ScoreBreakdown {
  const daysSincePush = daysBetween(now, parseIso(repo.pushedAt));
  const scorePush =
    daysSincePush === null ? 0 : Math.exp(-(daysSincePush ?? 3650) / 60) * 40;

  const releases = repo.releases?.nodes ?? [];
  let scoreRelease = 0;
  if (releases.length > 0) {
    const daysSinceRelease = daysBetween(now, parseIso(releases[0]?.createdAt));
    scoreRelease =
      daysSinceRelease === null ? 0 : Math.exp(-(daysSinceRelease ?? 3650) / 90) * 30;
  }

  const stars = Math.max(Number(repo.stargazerCount) || 0, 0);
  const scoreStars = Math.min(Math.log10(Math.max(stars, 1)) * 10, 20);

  const daysStarred = daysBetween(now, parseIso(repo.starredAt));
  const scoreStarred =
    daysStarred === null ? 0 : Math.exp(-(daysStarred ?? 3650) / 14) * 10;

  const total = round2(scorePush + scoreRelease + scoreStars + scoreStarred);
  return {
    push: round2(scorePush),
    release: round2(scoreRelease),
    stars: round2(scoreStars),
    starredAt: round2(scoreStarred),
    total,
  };
}

export function calculatePriorityScore(repo: StarRepoInput, now: Date = new Date()): number {
  return scoreBreakdown(repo, now).total;
}

export function prioritizeRepos(
  repos: StarRepoInput[],
  now: Date = new Date(),
): RankedRepo[] {
  const scored = repos.map((repo) => {
    const breakdown = scoreBreakdown(repo, now);
    return {
      rank: 0,
      score: breakdown.total,
      breakdown,
      nameWithOwner: repo.nameWithOwner,
      url: repo.url,
      description: repo.description || "",
      stargazerCount: Number(repo.stargazerCount) || 0,
      pushedAt: repo.pushedAt || "",
      starredAt: repo.starredAt || "",
      primaryLanguage: languageName(repo),
      topics: topicList(repo),
    } satisfies Omit<RankedRepo, "rank"> & { rank: number };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.map((item, index) => ({ ...item, rank: index + 1 }));
}

export function generateMarkdown(ranked: RankedRepo[], now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 16).replace("T", " ");
  const lines = [
    "# Prioritized Starred Repositories",
    `*Last Updated: ${stamp} UTC*`,
    "",
    "| Rank | Score | Repository | Primary Lang | Stars | Last Push | Topics |",
    "| :---: | :---: | :--- | :---: | :---: | :---: | :--- |",
  ];
  for (const repo of ranked) {
    const name = `[${repo.nameWithOwner}](${repo.url || "#"})`;
    const pushed = repo.pushedAt ? repo.pushedAt.slice(0, 10) : "N/A";
    const topics = repo.topics.length ? repo.topics.join(", ") : "-";
    const stars = repo.stargazerCount.toLocaleString("en-US");
    lines.push(
      `| ${repo.rank} | **${repo.score}** | ${name} | ${repo.primaryLanguage} | ${stars} | ${pushed} | \`${topics}\` |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function sampleFixtureRepos(): StarRepoInput[] {
  return [
    {
      nameWithOwner: "active/tool",
      url: "https://github.com/active/tool",
      description: "Freshly starred active tool",
      stargazerCount: 1200,
      pushedAt: "2026-08-01T12:00:00Z",
      starredAt: "2026-08-06T12:00:00Z",
      primaryLanguage: { name: "Python" },
      releases: { nodes: [{ createdAt: "2026-07-20T12:00:00Z" }] },
      repositoryTopics: { nodes: [{ topic: { name: "cli" } }] },
    },
    {
      nameWithOwner: "stale/archive",
      url: "https://github.com/stale/archive",
      description: "Old mega-repo",
      stargazerCount: 90000,
      pushedAt: "2020-01-01T12:00:00Z",
      starredAt: "2024-01-01T12:00:00Z",
      primaryLanguage: { name: "JavaScript" },
      releases: { nodes: [] },
      repositoryTopics: { nodes: [] },
    },
    {
      nameWithOwner: "mid/niche",
      url: "https://github.com/mid/niche",
      description: "Niche mid activity",
      stargazerCount: 80,
      pushedAt: "2026-06-01T12:00:00Z",
      starredAt: "2026-05-01T12:00:00Z",
      primaryLanguage: null,
      releases: { nodes: [{ createdAt: "2026-05-15T12:00:00Z" }] },
      topics: ["osint", "security"],
    },
  ];
}

/** Fixed clock used by regression tests (matches Python --self-test). */
export const FIXTURE_NOW = new Date("2026-08-08T12:00:00.000Z");
