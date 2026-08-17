import assert from "node:assert/strict";
import { normalizeImported } from "../lib/import";
import {
  FIXTURE_NOW,
  calculatePriorityScore,
  generateMarkdown,
  prioritizeRepos,
  sampleFixtureRepos,
  scoreBreakdown,
} from "../lib/scoring";

const fixtures = sampleFixtureRepos();
const ranked = prioritizeRepos(fixtures, FIXTURE_NOW);

assert.equal(ranked[0].nameWithOwner, "active/tool");
assert.ok(ranked[0].score > ranked.find((r) => r.nameWithOwner === "stale/archive")!.score);

const mega = fixtures.find((r) => r.nameWithOwner === "stale/archive")!;
const megaParts = scoreBreakdown(mega, FIXTURE_NOW);
assert.ok(megaParts.stars <= 20, "log star weight must cap at 20");

const md = generateMarkdown(ranked, FIXTURE_NOW);
assert.match(md, /Prioritized Starred Repositories/);
assert.match(md, /active\/tool/);
assert.match(md, /stale\/archive/);

const noRelease = {
  nameWithOwner: "x/y",
  url: "https://github.com/x/y",
  stargazerCount: 10,
  pushedAt: "2026-08-01T00:00:00Z",
  starredAt: "2026-08-01T00:00:00Z",
  releases: { nodes: [] },
};
assert.equal(scoreBreakdown(noRelease, FIXTURE_NOW).release, 0);
assert.ok(calculatePriorityScore(noRelease, FIXTURE_NOW) > 0);

const graphQlPayload = {
  data: {
    viewer: {
      starredRepositories: {
        edges: [
          {
            starredAt: "2026-08-08T00:00:00Z",
            node: {
              nameWithOwner: "octo/example",
              url: "https://github.com/octo/example",
              description: "GraphQL import",
              stargazerCount: 42,
              pushedAt: "2026-08-07T00:00:00Z",
              primaryLanguage: { name: "TypeScript" },
              releases: { nodes: [] },
              repositoryTopics: { nodes: [{ topic: { name: "cli" } }] },
            },
          },
        ],
      },
    },
  },
};
const imported = normalizeImported(graphQlPayload);
assert.equal(imported.length, 1);
assert.equal(imported[0].nameWithOwner, "octo/example");
assert.equal(imported[0].starredAt, "2026-08-08T00:00:00Z");

console.log("star-optimizer scoring tests passed");
