/**
 * Self-optimizing star magnet engine.
 * Pure scoring / SEO / markdown helpers used by the SaaS UI and report API.
 * Mirrors scripts/prioritize_and_optimize.py so UI previews match CI output.
 */

export const TRENDING_TOPICS = [
  "ai",
  "llm",
  "agents",
  "mcp",
  "automation",
  "developer-tools",
  "standards",
  "workflow",
] as const;

export const DISCOVERY_TOPICS = [
  "ai-agents",
  "mcp",
  "developer-tools",
  "standards",
] as const;

export interface StarredRepo {
  nameWithOwner: string;
  url: string;
  description?: string | null;
  stargazerCount: number;
  pushedAt?: string | null;
  starredAt?: string | null;
  primaryLanguage?: { name: string } | null;
  releases?: { nodes: Array<{ createdAt: string }> };
  repositoryTopics?: { nodes: Array<{ topic: { name: string } }> };
}

export interface ScoredRepo {
  repo: StarredRepo;
  score: number;
  components: {
    push: number;
    release: number;
    stars: number;
    starredRecency: number;
  };
}

export interface GrowthInputs {
  owner: string;
  repo: string;
  currentTopics?: string[];
  currentStars?: number;
  starsYesterday?: number;
  dailyOrganicVisitors?: number;
  conversionRatePct?: number;
}

export interface GrowthEstimate {
  projectedDailyStarsLow: number;
  projectedDailyStarsHigh: number;
  starVelocity: number;
  recommendedTopics: string[];
  topicGaps: string[];
  confidence: "low" | "medium" | "high";
  notes: string[];
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function daysBetween(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000));
}

export function calculatePriorityScore(
  repo: StarredRepo,
  now: Date = new Date(),
): ScoredRepo {
  const daysSincePush = daysBetween(repo.pushedAt, now);
  const scorePush =
    daysSincePush === null ? 0 : Math.exp(-daysSincePush / 60) * 40;

  const latestRelease = repo.releases?.nodes?.[0]?.createdAt;
  const daysSinceRelease = daysBetween(latestRelease, now);
  const scoreRelease =
    daysSinceRelease === null ? 0 : Math.exp(-daysSinceRelease / 90) * 30;

  const stars = Math.max(0, repo.stargazerCount || 0);
  const scoreStars = Math.min(Math.log10(Math.max(stars, 1)) * 10, 20);

  const daysStarred = daysBetween(repo.starredAt, now);
  const scoreStarred =
    daysStarred === null ? 0 : Math.exp(-daysStarred / 14) * 10;

  const total = Number(
    (scorePush + scoreRelease + scoreStars + scoreStarred).toFixed(2),
  );

  return {
    repo,
    score: total,
    components: {
      push: Number(scorePush.toFixed(2)),
      release: Number(scoreRelease.toFixed(2)),
      stars: Number(scoreStars.toFixed(2)),
      starredRecency: Number(scoreStarred.toFixed(2)),
    },
  };
}

export function rankRepos(
  repos: StarredRepo[],
  now: Date = new Date(),
): ScoredRepo[] {
  return repos
    .map((repo) => calculatePriorityScore(repo, now))
    .sort((a, b) => b.score - a.score || b.repo.stargazerCount - a.repo.stargazerCount);
}

export function mergeDiscoveryTopics(
  currentTopics: string[] = [],
  trending: readonly string[] = DISCOVERY_TOPICS,
  limit = 20,
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const topic of [...currentTopics, ...trending]) {
    const normalized = String(topic || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    merged.push(normalized);
    if (merged.length >= limit) break;
  }
  return merged;
}

export function estimateOrganicGrowth(input: GrowthInputs): GrowthEstimate {
  const currentStars = clamp(input.currentStars ?? 0, 0, 10_000_000);
  const starsYesterday = clamp(input.starsYesterday ?? currentStars, 0, 10_000_000);
  const visitors = clamp(input.dailyOrganicVisitors ?? 50, 0, 1_000_000);
  const conversion = clamp(input.conversionRatePct ?? 2.5, 0.1, 25) / 100;
  const currentTopics = (input.currentTopics ?? []).map((t) => t.toLowerCase());

  const recommendedTopics = mergeDiscoveryTopics(currentTopics, [
    ...DISCOVERY_TOPICS,
    ...TRENDING_TOPICS,
  ]);
  const topicGaps = recommendedTopics.filter((t) => !currentTopics.includes(t));

  const velocity = currentStars - starsYesterday;
  // Baseline: organic visitor conversion + topic SEO lift + social-proof velocity tail.
  // Confidence-labeled estimate — not a guarantee (see WR-4482 evidence-first).
  const conversionStars = visitors * conversion;
  const topicLift = 1 + Math.min(topicGaps.length, 6) * 0.08;
  const velocityTail = Math.max(0, velocity) * 0.35;
  const projected = (conversionStars + velocityTail) * topicLift;

  const low = Math.max(0, Number((projected * 0.55).toFixed(1)));
  const high = Math.max(low, Number((projected * 1.8).toFixed(1)));

  let confidence: GrowthEstimate["confidence"] = "medium";
  if (visitors < 20 || currentStars < 5) confidence = "low";
  if (visitors >= 200 && topicGaps.length <= 2 && currentStars >= 50) {
    confidence = "high";
  }

  const notes = [
    "Estimate confidence: organic conversion model (confidence-labeled, not a guarantee).",
    "Sources: GitHub native search/topic discoverability + Shields.io social proof patterns.",
    topicGaps.length
      ? `Topic gaps to close for GSEO: ${topicGaps.slice(0, 8).join(", ")}.`
      : "Topics already cover the core discovery set.",
    "Stay TOS-compliant: no star-for-star schemes, no paid star farms, no spammy mass follows.",
  ];

  return {
    projectedDailyStarsLow: low,
    projectedDailyStarsHigh: high,
    starVelocity: velocity,
    recommendedTopics,
    topicGaps,
    confidence,
    notes,
  };
}

export function generatePrioritizedMarkdown(
  scored: ScoredRepo[],
  now: Date = new Date(),
  limit = 100,
): string {
  const stamp = now.toISOString().slice(0, 16).replace("T", " ");
  const lines = [
    "# 🌟 Prioritized & Trending Open-Source Index",
    `*Automated Index Updated: ${stamp} UTC*`,
    "",
    "> 💡 **Found this resource valuable? Give this repository a ⭐ star to stay updated on emerging tooling!**",
    "",
    "| Rank | Score | Repository | Primary Lang | Stars | Last Push | Topics |",
    "| :---: | :---: | :--- | :---: | :---: | :---: | :--- |",
  ];

  for (const [idx, item] of scored.slice(0, limit).entries()) {
    const { repo, score } = item;
    const name = `[${repo.nameWithOwner}](${repo.url})`;
    const lang = repo.primaryLanguage?.name ?? "N/A";
    const pushed = repo.pushedAt ? repo.pushedAt.slice(0, 10) : "N/A";
    const topics =
      repo.repositoryTopics?.nodes?.map((n) => n.topic.name).join(", ") || "-";
    const stars = (repo.stargazerCount || 0).toLocaleString("en-US");
    lines.push(
      `| ${idx + 1} | **${score}** | ${name} | ${lang} | ${stars} | ${pushed} | \`${topics}\` |`,
    );
  }

  lines.push(
    "",
    "---",
    "",
    "*Generated by the Self-Optimizing Star Magnet engine (TOS-compliant, free GitHub API only).*",
    "",
  );
  return lines.join("\n");
}

export function buildStarMagnetReadmeBlock(owner: string, repo: string): string {
  const safeOwner = owner.trim() || "midnghtsapphire";
  const safeRepo = repo.trim() || "revvel-standards";
  return [
    '<div align="center">',
    "",
    "# 🚀 Dynamic Multi-Agent & Tooling Directory",
    "",
    `[![GitHub stars](https://img.shields.io/github/stars/${safeOwner}/${safeRepo}?style=for-the-badge&logo=github&color=gold)](https://github.com/${safeOwner}/${safeRepo}/stargazers)`,
    `[![Last Commit](https://img.shields.io/github/last-commit/${safeOwner}/${safeRepo}?style=for-the-badge&color=blue)](https://github.com/${safeOwner}/${safeRepo})`,
    `[![License](https://img.shields.io/github/license/${safeOwner}/${safeRepo}?style=for-the-badge&color=green)](LICENSE)`,
    "",
    "**If you find this repository or list useful, please give it a ⭐ STAR — it helps other developers discover this project!**",
    "",
    "</div>",
    "",
  ].join("\n");
}

export function buildCsvExport(scored: ScoredRepo[]): string {
  const header = [
    "rank",
    "score",
    "repository",
    "url",
    "language",
    "stars",
    "last_push",
    "topics",
    "score_push",
    "score_release",
    "score_stars",
    "score_starred_recency",
  ];
  const rows = scored.map((item, index) => {
    const topics =
      item.repo.repositoryTopics?.nodes?.map((n) => n.topic.name).join("|") ||
      "";
    return [
      String(index + 1),
      String(item.score),
      item.repo.nameWithOwner,
      item.repo.url,
      item.repo.primaryLanguage?.name ?? "",
      String(item.repo.stargazerCount ?? 0),
      item.repo.pushedAt?.slice(0, 10) ?? "",
      topics,
      String(item.components.push),
      String(item.components.release),
      String(item.components.stars),
      String(item.components.starredRecency),
    ].map(csvCell);
  });
  return [header.map(csvCell).join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/** Demo corpus so the UI is useful without a live GitHub token. */
export const SAMPLE_STARRED_REPOS: StarredRepo[] = [
  {
    nameWithOwner: "vercel/next.js",
    url: "https://github.com/vercel/next.js",
    description: "The React Framework",
    stargazerCount: 130000,
    pushedAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    starredAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    primaryLanguage: { name: "JavaScript" },
    releases: {
      nodes: [{ createdAt: new Date(Date.now() - 10 * 86_400_000).toISOString() }],
    },
    repositoryTopics: {
      nodes: [
        { topic: { name: "react" } },
        { topic: { name: "nextjs" } },
        { topic: { name: "framework" } },
      ],
    },
  },
  {
    nameWithOwner: "openai/openai-python",
    url: "https://github.com/openai/openai-python",
    description: "Official Python library for the OpenAI API",
    stargazerCount: 28000,
    pushedAt: new Date(Date.now() - 5 * 86_400_000).toISOString(),
    starredAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    primaryLanguage: { name: "Python" },
    releases: {
      nodes: [{ createdAt: new Date(Date.now() - 20 * 86_400_000).toISOString() }],
    },
    repositoryTopics: {
      nodes: [
        { topic: { name: "openai" } },
        { topic: { name: "llm" } },
        { topic: { name: "sdk" } },
      ],
    },
  },
  {
    nameWithOwner: "modelcontextprotocol/servers",
    url: "https://github.com/modelcontextprotocol/servers",
    description: "Model Context Protocol servers",
    stargazerCount: 45000,
    pushedAt: new Date(Date.now() - 1 * 86_400_000).toISOString(),
    starredAt: new Date(Date.now() - 7 * 86_400_000).toISOString(),
    primaryLanguage: { name: "TypeScript" },
    releases: { nodes: [] },
    repositoryTopics: {
      nodes: [
        { topic: { name: "mcp" } },
        { topic: { name: "agents" } },
        { topic: { name: "ai" } },
      ],
    },
  },
  {
    nameWithOwner: "midnghtsapphire/revvel-standards",
    url: "https://github.com/midnghtsapphire/revvel-standards",
    description: "SSOT standards, templates, and automation",
    stargazerCount: 12,
    pushedAt: new Date().toISOString(),
    starredAt: new Date(Date.now() - 30 * 86_400_000).toISOString(),
    primaryLanguage: { name: "JavaScript" },
    releases: { nodes: [] },
    repositoryTopics: {
      nodes: [
        { topic: { name: "standards" } },
        { topic: { name: "automation" } },
      ],
    },
  },
  {
    nameWithOwner: "old-org/stale-tool",
    url: "https://github.com/old-org/stale-tool",
    description: "Unmaintained example",
    stargazerCount: 3,
    pushedAt: new Date(Date.now() - 400 * 86_400_000).toISOString(),
    starredAt: new Date(Date.now() - 200 * 86_400_000).toISOString(),
    primaryLanguage: { name: "Go" },
    releases: { nodes: [] },
    repositoryTopics: { nodes: [] },
  },
];
