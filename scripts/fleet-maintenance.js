#!/usr/bin/env node
"use strict";

/**
 * Fleet Maintenance Sweep
 *
 * Walks every repository in the owner account and, for a capped rotating subset
 * each run, files a Work Request ISSUE into the central repo (revvel-standards).
 *
 * Everything flows through revvel-standards: the [WR] issue triggers the existing
 * research-engine.yml (your research engine) → coder pipeline, which researches
 * and implements against the target repo and opens a PR for review. This script
 * does NOT clone, modify, or delete anything in any repo — it only lists repos
 * and opens Work Requests.
 *
 * Safety rails:
 *   - No-op if FLEET_TOKEN is missing (needed only to LIST the org's repos).
 *   - DRY_RUN=true logs the plan without filing any issues.
 *   - MAX_REPOS caps repos per run; selection rotates by ISO week so the whole
 *     fleet is covered over time.
 *   - Skips a repo that already has an open fleet Work Request (idempotent).
 *   - Skips archived repos and forks.
 *
 * Env:
 *   FLEET_TOKEN     PAT with repo access across the org (e.g. ADMIN_GITHUB_TOKEN)
 *   CENTRAL_REPO    owner/repo where Work Requests are filed (default: this repo)
 *   OWNER           account/org to sweep (default: midnghtsapphire)
 *   MAX_REPOS       cap per run (default 5)
 *   DRY_RUN         'true' to log the plan without filing issues
 */

const fs = require("fs");
const { execFileSync } = require("child_process");

function env(key, def = "") {
  return process.env[key] || def;
}

function gh(args) {
  return execFileSync("gh", args, { encoding: "utf8" });
}

function isoWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/**
 * Pick a stable, rotating subset so the whole fleet is covered over time.
 * Pure function — unit tested.
 *
 * @param {string[]} repoNames - candidate repo names (already filtered).
 * @param {number} week - ISO week number used as the rotation offset.
 * @param {number} max - max repos to return.
 * @returns {string[]}
 */
function selectRepos(repoNames, week, max) {
  if (!Array.isArray(repoNames) || repoNames.length === 0) return [];
  const sorted = [...repoNames].sort();
  if (max >= sorted.length) return sorted;
  const start = (week * max) % sorted.length;
  const out = [];
  for (let i = 0; i < max; i++) {
    out.push(sorted[(start + i) % sorted.length]);
  }
  return out;
}

function listRepos(owner) {
  const raw = gh([
    "repo", "list", owner,
    "--no-archived", "--source", "--limit", "1000",
    "--json", "name,isFork,isArchived",
  ]);
  const repos = JSON.parse(raw || "[]");
  return repos.filter((r) => !r.isFork && !r.isArchived).map((r) => r.name);
}

function marker(owner, repo) {
  return `fleet-maintenance:${owner}/${repo}`;
}

function hasOpenWorkRequest(centralRepo, owner, repo, ghRunner = gh) {
  const searchMarker = marker(owner, repo);
  try {
    const raw = ghRunner([
      "issue", "list", "--repo", centralRepo,
      "--state", "open", "--search", searchMarker, "--json", "number",
    ]);
    const issues = JSON.parse(raw || "[]");
    if (!Array.isArray(issues)) {
      throw new Error(`expected an array, got ${typeof issues}`);
    }
    return issues.length > 0;
  } catch (err) {
    throw new Error(
      `Unable to verify open fleet Work Requests for ${owner}/${repo} in ${centralRepo} ` +
      `(${searchMarker}); refusing to file a duplicate. ${err.message}`
    );
  }
}

function fileWorkRequest(centralRepo, owner, repo, dryRun, ghRunner = gh) {
  if (hasOpenWorkRequest(centralRepo, owner, repo, ghRunner)) {
    console.log(`• ${repo}: open fleet Work Request already exists — skipping.`);
    return false;
  }
  if (dryRun) {
    console.log(`• ${repo}: [dry-run] would file a [WR] in ${centralRepo}.`);
    return false;
  }

  const target = `${owner}/${repo}`;
  const title = `[WR] Fleet maintenance — ${target}`;
  const body = [
    `**Target repository:** \`${target}\``,
    "",
    "Filed automatically by the fleet-maintenance sweep so this repo flows through",
    "the revvel-standards pipeline (research-engine → coder → full review jury).",
    "Research with the research engine, then open a draft PR on the target repo.",
    "The resulting PR must pass the **full code review** — OpenRouter",
    "(`ai-pr-review-openrouter.yml`), Jules, Semgrep, and CodeQL — same as any",
    "revvel-standards change.",
    "",
    "## Tasks",
    "- [ ] Update / refresh the docs (README, overview, contributing).",
    "- [ ] Research concrete improvements (deps, security, tests, DX, performance).",
    "- [ ] Ensure the target repo has the standard review workflows (OpenRouter code",
    "      review, Jules, Semgrep, CodeQL) so the PR gets the full jury; add them if missing.",
    "- [ ] Implement the agreed improvements as a **draft PR** on the target repo.",
    "",
    `<!-- ${marker(owner, repo)} -->`,
  ].join("\n");

  const tmp = `/tmp/fleet-wr-${repo}.md`;
  fs.writeFileSync(tmp, body);
  const out = ghRunner([
    "issue", "create", "--repo", centralRepo,
    "--title", title, "--body-file", tmp,
    "--label", "work-request", "--label", "openrouter",
  ]);
  console.log(`• ${repo}: filed ${out.trim()}`);
  return true;
}

function main() {
  const token = env("FLEET_TOKEN");
  if (!token) {
    console.log("::warning::FLEET_TOKEN not set — fleet maintenance skipped (no failure).");
    return 0;
  }
  process.env.GH_TOKEN = token;

  const owner = env("OWNER", "midnghtsapphire");
  const centralRepo = env("CENTRAL_REPO", `${owner}/revvel-standards`);
  const maxRepos = Math.max(1, parseInt(env("MAX_REPOS", "5"), 10) || 5);
  const dryRun = env("DRY_RUN", "").toLowerCase() === "true";

  const repos = listRepos(owner);
  const selected = selectRepos(repos, isoWeek(), maxRepos);
  console.log(
    `${repos.length} repo(s) in ${owner}; sweeping ${selected.length} this run ` +
    `(DRY_RUN=${dryRun}) -> Work Requests into ${centralRepo}: ${selected.join(", ")}`
  );

  let filed = 0;
  for (const repo of selected) {
    if (repo === "revvel-standards") continue; // the hub itself
    try {
      if (fileWorkRequest(centralRepo, owner, repo, dryRun)) filed++;
    } catch (err) {
      console.log(`• ${repo}: error — ${err.message}`);
    }
  }
  console.log(`Done. Filed ${filed} Work Request(s).`);
  return 0;
}

if (require.main === module) {
  try {
    process.exit(main());
  } catch (e) {
    console.error("Error:", e.message);
    process.exit(1);
  }
}

module.exports = { selectRepos, isoWeek, hasOpenWorkRequest, fileWorkRequest, marker };
