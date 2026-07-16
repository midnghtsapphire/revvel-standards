"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const {
  classifyRuns,
  detectStuckIssues,
  buildSentinelSection,
  shouldFileIncident,
  buildIncidentBody,
  buildIncidentTitle,
  buildResolutionComment,
  INCIDENT_MARKER,
  DEFAULTS,
} = require("../scripts/biome/sentinel");

const DAY = 86400000;
const NOW = Date.parse("2026-06-30T00:00:00Z");

test("classifyRuns counts failure/timed_out/startup_failure as failed", () => {
  const runs = [
    { id: 1, conclusion: "success" },
    { id: 2, conclusion: "failure" },
    { id: 3, conclusion: "timed_out" },
    { id: 4, conclusion: "startup_failure" },
    { id: 5, conclusion: "cancelled" },
  ];
  const r = classifyRuns(runs);
  assert.equal(r.failed, 3);
  assert.equal(r.total, 5);
  assert.equal(r.recentFailures.length, 3);
});

test("classifyRuns handles empty/non-array input", () => {
  assert.deepEqual(classifyRuns([]), {
    failed: 0,
    total: 0,
    failureRate: 0,
    recentFailures: [],
  });
  assert.equal(classifyRuns(undefined).total, 0);
});

test("detectStuckIssues flags only open, watched-label, old issues", () => {
  const issues = [
    {
      number: 1,
      state: "open",
      updated_at: new Date(NOW - 10 * DAY).toISOString(),
      labels: ["stuck"],
    },
    {
      number: 2,
      state: "open",
      updated_at: new Date(NOW - 1 * DAY).toISOString(),
      labels: ["stuck"],
    }, // too recent
    {
      number: 3,
      state: "open",
      updated_at: new Date(NOW - 20 * DAY).toISOString(),
      labels: ["enhancement"],
    }, // not watched
    {
      number: 4,
      state: "closed",
      updated_at: new Date(NOW - 20 * DAY).toISOString(),
      labels: ["stuck"],
    }, // closed
    {
      number: 5,
      state: "open",
      updated_at: new Date(NOW - 20 * DAY).toISOString(),
      labels: [{ name: "auto-fix" }],
      pull_request: {},
    }, // PR
  ];
  const stuck = detectStuckIssues(issues, NOW, 7);
  assert.deepEqual(
    stuck.map((s) => s.number),
    [1],
  );
});

test("buildSentinelSection escalates healthy -> degraded -> down", () => {
  const healthy = buildSentinelSection(
    { failed: 0, total: 10, failureRate: 0, recentFailures: [] },
    [],
  );
  assert.equal(healthy.status, "healthy");
  assert.equal(shouldFileIncident(healthy), false);

  const degradedByRuns = buildSentinelSection(
    { failed: 3, total: 10, failureRate: 0.3, recentFailures: [] },
    [],
  );
  assert.equal(degradedByRuns.status, "degraded");

  const degradedByStuck = buildSentinelSection(
    { failed: 0, total: 10, failureRate: 0, recentFailures: [] },
    [{ number: 9 }],
  );
  assert.equal(degradedByStuck.status, "degraded");

  const down = buildSentinelSection(
    { failed: 5, total: 10, failureRate: 0.5, recentFailures: [] },
    [{ number: 9 }],
  );
  assert.equal(down.status, "down");
  assert.equal(shouldFileIncident(down), true);
});

test("failedRunsThreshold matches self-healing.yml (3)", () => {
  assert.equal(DEFAULTS.failedRunsThreshold, 3);
});

test("buildIncidentBody embeds dedupe marker", () => {
  const section = buildSentinelSection(
    {
      failed: 4,
      total: 5,
      failureRate: 0.8,
      recentFailures: [{ id: 1, name: "X", url: "u", conclusion: "failure" }],
    },
    [],
  );
  const body = buildIncidentBody(section, "2026-06-30T00:00:00Z");
  assert.ok(body.includes(INCIDENT_MARKER));
  assert.ok(body.includes("credit-free"));
});

test("buildIncidentTitle reflects the current status", () => {
  const degraded = buildSentinelSection(
    { failed: 3, total: 10, failureRate: 0.3, recentFailures: [] },
    [],
  );
  assert.equal(
    buildIncidentTitle(degraded),
    "[BIOME-SENTINEL] Fleet pain detected (degraded)",
  );
  const down = buildSentinelSection(
    { failed: 5, total: 10, failureRate: 0.5, recentFailures: [] },
    [{ number: 9 }],
  );
  assert.equal(
    buildIncidentTitle(down),
    "[BIOME-SENTINEL] Fleet pain detected (down)",
  );
});

test("buildResolutionComment embeds dedupe marker and timestamp", () => {
  const comment = buildResolutionComment("2026-06-30T00:00:00Z");
  assert.ok(comment.includes(INCIDENT_MARKER));
  assert.ok(comment.includes("2026-06-30T00:00:00Z"));
  assert.ok(/auto-resolving/i.test(comment));
});

test("sentinel CLI refreshes existing incidents in place (PATCH, not comment spam)", () => {
  // Regression guard for the "chatty cathy" incident (#15491): an ongoing
  // incident must be refreshed by editing the issue, never by POSTing a new
  // comment every 2h sweep. Semantic check: the only comment POST allowed is
  // the one-time recovery note (buildResolutionComment).
  const fs = require("node:fs");
  const path = require("node:path");
  const src = fs.readFileSync(
    path.join(__dirname, "..", "scripts", "biome", "sentinel.js"),
    "utf8",
  );
  const commentPosts = src.match(/\/comments`/g) || [];
  assert.equal(
    commentPosts.length,
    1,
    "exactly one comment POST is allowed (the recovery note)",
  );
  const commentIdx = src.indexOf("/comments`");
  const surrounding = src.slice(
    Math.max(0, commentIdx - 300),
    commentIdx + 300,
  );
  assert.ok(
    surrounding.includes("buildResolutionComment"),
    "the only comment POST must be the recovery resolution note",
  );
  assert.ok(
    /method:\s*["']PATCH["']/.test(src),
    "sentinel must PATCH the incident",
  );
  assert.ok(
    /state:\s*["']closed["']/.test(src),
    "sentinel must auto-resolve on recovery",
  );
});
