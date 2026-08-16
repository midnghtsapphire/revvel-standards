import assert from "node:assert/strict";
import {
  SAMPLE_STARRED_REPOS,
  buildCsvExport,
  buildStarMagnetReadmeBlock,
  calculatePriorityScore,
  estimateOrganicGrowth,
  generatePrioritizedMarkdown,
  mergeDiscoveryTopics,
  rankRepos,
} from "../app/data/engine";

const now = new Date("2026-08-08T12:00:00.000Z");

{
  const fresh = calculatePriorityScore(
    {
      nameWithOwner: "a/b",
      url: "https://github.com/a/b",
      stargazerCount: 1000,
      pushedAt: "2026-08-07T00:00:00Z",
      starredAt: "2026-08-07T00:00:00Z",
      releases: { nodes: [{ createdAt: "2026-08-01T00:00:00Z" }] },
    },
    now,
  );
  const stale = calculatePriorityScore(
    {
      nameWithOwner: "c/d",
      url: "https://github.com/c/d",
      stargazerCount: 1000,
      pushedAt: "2024-01-01T00:00:00Z",
      starredAt: "2024-01-01T00:00:00Z",
      releases: { nodes: [] },
    },
    now,
  );
  assert.ok(fresh.score > stale.score, "fresh activity must outrank stale repos");
  assert.ok(fresh.components.push > 30);
  assert.equal(stale.components.release, 0);
}

{
  const ranked = rankRepos(SAMPLE_STARRED_REPOS, now);
  assert.equal(ranked.length, SAMPLE_STARRED_REPOS.length);
  for (let i = 1; i < ranked.length; i += 1) {
    assert.ok(ranked[i - 1].score >= ranked[i].score);
  }
  // Highly active MCP / Next.js style repos should beat the intentionally stale demo.
  const staleRank = ranked.findIndex((r) => r.repo.nameWithOwner === "old-org/stale-tool");
  assert.ok(staleRank === ranked.length - 1 || staleRank >= ranked.length - 2);
}

{
  const merged = mergeDiscoveryTopics(["Standards", "custom-topic", "mcp"]);
  assert.ok(merged.includes("standards"));
  assert.ok(merged.includes("mcp"));
  assert.ok(merged.includes("ai-agents"));
  assert.ok(merged.includes("custom-topic"));
  assert.ok(merged.length <= 20);
  // de-dupe case
  assert.equal(merged.filter((t) => t === "mcp").length, 1);
}

{
  const growth = estimateOrganicGrowth({
    owner: "midnghtsapphire",
    repo: "revvel-standards",
    currentTopics: ["standards"],
    currentStars: 20,
    starsYesterday: 18,
    dailyOrganicVisitors: 100,
    conversionRatePct: 2.5,
  });
  assert.ok(growth.projectedDailyStarsLow >= 0);
  assert.ok(growth.projectedDailyStarsHigh >= growth.projectedDailyStarsLow);
  assert.equal(growth.starVelocity, 2);
  assert.ok(growth.topicGaps.includes("mcp"));
  assert.ok(["low", "medium", "high"].includes(growth.confidence));
  assert.ok(growth.notes.some((n) => /confidence/i.test(n)));
}

{
  const ranked = rankRepos(SAMPLE_STARRED_REPOS, now);
  const md = generatePrioritizedMarkdown(ranked, now, 3);
  assert.match(md, /Prioritized & Trending Open-Source Index/);
  assert.match(md, /Give this repository a ⭐ star/);
  assert.match(md, /\| Rank \| Score \|/);
  assert.equal((md.match(/^\| \d+ \|/gm) || []).length, 3);
}

{
  const block = buildStarMagnetReadmeBlock("midnghtsapphire", "revvel-standards");
  assert.match(block, /img\.shields\.io\/github\/stars\/midnghtsapphire\/revvel-standards/);
  assert.match(block, /stargazers/);
  assert.match(block, /STAR/);
}

{
  const csv = buildCsvExport(rankRepos(SAMPLE_STARRED_REPOS, now));
  assert.match(csv, /^"rank","score","repository"/m);
  assert.match(csv, /vercel\/next\.js/);
}

console.log("✅ Self-optimizing star magnet engine tests passed.");
