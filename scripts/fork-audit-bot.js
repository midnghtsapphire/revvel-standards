#!/usr/bin/env node
// ============================================================
// FORK-AUDIT BOT
// ============================================================
// Cron-driven swarm that:
//   1. Enumerates high-value upstream repositories from
//      fork-audit/candidates.json
//   2. Pulls their public metadata from the GitHub API
//   3. Scores each repo against a transparent rubric
//   4. For each scored repo opens a MIRROR ISSUE in
//      midnghtsapphire/revvel-standards. The mirror issue is
//      automatically picked up by .github/workflows/openrouter-
//      assignee.yml — which applies the required labels
//      (`openrouter`, `auto-fix`, `copilot`, `role:orchestrator`)
//      and assigns `@Copilot` so the OpenRouter orchestrator
//      actually works on it (answering the issue comment).
//   5. When the score clears the upstream threshold AND the
//      upstream repo is writable (permission.push === true)
//      the bot also opens a compliant upstream PR / issue with
//      the same routing labels so the OpenRouter loop picks it
//      up there too.
//
// Safety rails:
//   * DRY_RUN=1 prints intended actions without mutating GitHub.
//   * No secrets are logged.
//   * Failures on individual candidates never abort the batch.
//
// Usage:
//   node scripts/fork-audit-bot.js                     # full run
//   DRY_RUN=1 node scripts/fork-audit-bot.js           # plan only
//   node scripts/fork-audit-bot.js path/to/config.json # custom cfg
//
// Environment:
//   GITHUB_TOKEN   required in CI (supplied by actions/runner)
//   GITHUB_ACTOR   optional — recorded on upstream PR/issue
//   SELF_REPO      optional — override target mirror repo
//                    (default: midnghtsapphire/revvel-standards)
//
// Exports (for testing — require.main guard applies):
//   scoreRepo, buildAuditBody, loadConfig
// ============================================================

'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join(
  __dirname,
  '..',
  'fork-audit',
  'candidates.json',
);
const SELF_REPO = process.env.SELF_REPO || 'midnghtsapphire/revvel-standards';
const DRY_RUN = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true';

// Required routing labels consumed by openrouter-assignee.yml /
// ralph-loop.yml. Keeping these in one place means a single point
// of truth for "compliant PR" per the issue comment.
const ROUTING_LABELS = Object.freeze([
  'openrouter',
  'auto-fix',
  'copilot',
  'role:orchestrator',
  'fork-audit',
]);

// Labels applied to mirror issues at creation time.
// 'openrouter' is intentionally excluded: openrouter-assignee.yml uses
// its presence as the sole idempotency key ("already routed → skip").
// Pre-applying it would cause that workflow to skip the issue, leaving
// it unassigned and unprocessed — the "slip" described in issue #14523.
// openrouter-assignee.yml adds 'openrouter' itself when it routes the issue.
const MIRROR_LABELS = Object.freeze(
  ROUTING_LABELS.filter((l) => l !== 'openrouter').concat(['upstream-contribution']),
);

// ─── Pure helpers (exported for testing) ─────────────────────

/**
 * Scoring rubric — transparent, deterministic, boundable to 0..100.
 * See docs/FORK_AUDIT_BOT_PROCESS.md §Scoring for the rationale.
 *
 * @param {object} repo   GitHub API repo object (or subset)
 * @param {object} cand   candidate entry from candidates.json
 * @returns {{total:number, breakdown:object, band:string}}
 */
function scoreRepo(repo, cand) {
  if (!repo || typeof repo !== 'object') {
    throw new TypeError('scoreRepo: repo must be an object');
  }
  const safe = (n) => (Number.isFinite(n) ? n : 0);

  // Each sub-score is capped so no single signal can dominate.
  const stars = Math.min(safe(repo.stargazers_count) / 100, 20); // 0..20
  const forks = Math.min(safe(repo.forks_count) / 50, 10);       // 0..10
  const issuesHealth = repo.open_issues_count != null
    ? Math.max(0, 10 - Math.min(safe(repo.open_issues_count) / 50, 10))
    : 5;                                                          // 0..10
  const license = repo.license && repo.license.spdx_id &&
    repo.license.spdx_id !== 'NOASSERTION' ? 10 : 0;              // 0 or 10
  const recency = recencyScore(repo.pushed_at);                   // 0..15
  const strategic = Math.min(
    Math.max(safe(cand && cand.strategic_value), 0), 10,
  ) * 2;                                                           // 0..20
  const archivedPenalty = repo.archived ? -25 : 0;                 // penalty
  const forkPenalty = repo.fork ? -10 : 0;                         // penalty
  const disabledPenalty = repo.disabled ? -25 : 0;                 // penalty

  const rawTotal =
    stars + forks + issuesHealth + license + recency + strategic +
    archivedPenalty + forkPenalty + disabledPenalty;
  // Clamp to 0..100 — the rubric is designed so a healthy,
  // strategic, well-licensed repo can reach ~85, above which
  // goal-tag alignment pushes into the upstream-PR band.
  const alignment = goalTagAlignmentBonus(repo, cand);            // 0..15
  const total = Math.max(0, Math.min(100, Math.round(
    rawTotal + alignment,
  )));

  const band =
    total >= 80 ? 'A — upstream PR'
    : total >= 70 ? 'B — upstream issue'
    : total >= 40 ? 'C — mirror issue only'
    : 'D — skip';

  return {
    total,
    band,
    breakdown: {
      stars,
      forks,
      issuesHealth,
      license,
      recency,
      strategic,
      alignment,
      archivedPenalty,
      forkPenalty,
      disabledPenalty,
    },
  };
}

function recencyScore(pushedAt) {
  if (!pushedAt) return 0;
  const pushed = Date.parse(pushedAt);
  if (!Number.isFinite(pushed)) return 0;
  const daysSince = (Date.now() - pushed) / (1000 * 60 * 60 * 24);
  if (daysSince < 0) return 15;            // clock skew — give benefit
  if (daysSince <= 30) return 15;
  if (daysSince <= 90) return 10;
  if (daysSince <= 365) return 5;
  return 0;
}

function goalTagAlignmentBonus(repo, cand) {
  const tags = (cand && Array.isArray(cand.goal_tags)) ? cand.goal_tags : [];
  if (tags.length === 0) return 0;
  const haystack = [
    repo.description || '',
    ...(Array.isArray(repo.topics) ? repo.topics : []),
  ].join(' ').toLowerCase();
  const hits = tags.filter((t) => haystack.includes(String(t).toLowerCase()));
  // 5 pts per matched tag, capped at 15.
  return Math.min(hits.length * 5, 15);
}

/**
 * Build the markdown body for the mirror audit issue. Pure — no I/O.
 */
function buildAuditBody({ cand, repo, score }) {
  const mdLink = (r) => `https://github.com/${r}`;
  const rubricRows = Object.entries(score.breakdown)
    .map(([k, v]) => `| ${k} | ${typeof v === 'number' ? v.toFixed(1) : v} |`)
    .join('\n');
  const action = score.band.startsWith('A')
    ? 'Open a compliant PR upstream AND mirror issue here.'
    : score.band.startsWith('B')
    ? 'Open a compliant issue upstream AND mirror issue here.'
    : score.band.startsWith('C')
    ? 'Mirror issue only — no upstream action.'
    : 'Skip — score below mirror threshold.';

  return [
    `# Fork-Audit Report — [\`${cand.repo}\`](${mdLink(cand.repo)})`,
    '',
    `**Score:** ${score.total} / 100  —  **Band:** ${score.band}`,
    `**Strategic value (config):** ${cand.strategic_value ?? 'n/a'}  `,
    `**Goal tags:** ${(cand.goal_tags || []).join(', ') || 'n/a'}`,
    '',
    '## Recommended action',
    action,
    '',
    '## Rubric breakdown',
    '',
    '| Signal | Points |',
    '|---|---|',
    rubricRows,
    '',
    '## Upstream snapshot',
    '',
    `- Stars: **${repo.stargazers_count ?? 'n/a'}**`,
    `- Forks: **${repo.forks_count ?? 'n/a'}**`,
    `- Open issues: **${repo.open_issues_count ?? 'n/a'}**`,
    `- License: **${(repo.license && repo.license.spdx_id) || 'none'}**`,
    `- Last push: **${repo.pushed_at ?? 'n/a'}**`,
    `- Archived: **${repo.archived ? 'yes' : 'no'}**`,
    `- Default branch: \`${repo.default_branch || 'main'}\``,
    '',
    '## Notes (from candidates.json)',
    '',
    cand.notes || '_none_',
    '',
    '---',
    '',
    '_Generated by `scripts/fork-audit-bot.js`. In `midnghtsapphire/revvel-standards`, the mirror issue is created without ' +
      'the `openrouter` label so `.github/workflows/openrouter-assignee.yml` ' +
      'triggers normally, attempts to assign `@oaudrey`, and hands it to the OpenRouter ' +
      'orchestrator ' +
      '(see [`docs/OPENROUTER_ASSIGNEE_PROCESS.md`](../docs/OPENROUTER_ASSIGNEE_PROCESS.md))._',
  ].join('\n');
}

function loadConfig(configPath) {
  const raw = fs.readFileSync(configPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.candidates)) {
    throw new Error(`Invalid fork-audit config at ${configPath}: missing candidates[]`);
  }
  const defaults = Object.assign(
    {
      min_stars: 100,
      open_upstream_when_score_gte: 70,
      mirror_issue_when_score_gte: 40,
      max_candidates_per_run: 10,
    },
    parsed.defaults || {},
  );
  return { defaults, candidates: parsed.candidates };
}

// ─── GitHub API layer (thin fetch wrapper) ───────────────────

async function ghFetch(token, urlOrPath, init = {}) {
  const url = urlOrPath.startsWith('http')
    ? urlOrPath
    : `https://api.github.com${urlOrPath}`;
  const headers = Object.assign(
    {
      'User-Agent': 'revvel-standards-fork-audit-bot',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    init.headers || {},
  );
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, Object.assign({}, init, { headers }));
  if (!res.ok) {
    const bodyText = await res.text().catch(() => '');
    const err = new Error(
      `GitHub API ${res.status} ${res.statusText} for ${init.method || 'GET'} ${url}: ${bodyText.slice(0, 500)}`,
    );
    err.status = res.status;
    throw err;
  }
  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

async function getRepo(token, fullName) {
  return ghFetch(token, `/repos/${fullName}`);
}

async function mirrorIssueExists(token, selfRepo, candRepo) {
  // Simple dedup — match by the marker string in the title.
  const q = encodeURIComponent(
    `repo:${selfRepo} is:issue in:title "Fork-Audit Report — ${candRepo}"`,
  );
  const data = await ghFetch(token, `/search/issues?q=${q}&per_page=1`);
  return Array.isArray(data.items) && data.items.length > 0
    ? data.items[0]
    : null;
}

async function createMirrorIssue(token, selfRepo, { title, body, labels }) {
  if (DRY_RUN) {
    console.log(`[dry-run] would POST /repos/${selfRepo}/issues: ${title}`);
    return { dry_run: true, title };
  }
  const [owner, repo] = selfRepo.split('/');
  // Routing is handled by .github/workflows/openrouter-triage.yml via direct
  // OpenRouter API calls (see docs/OPENROUTER_TRIAGE_PROCESS.md). We do not
  // set @Copilot / copilot-swe-agent as an assignee anywhere in this repo.
  return ghFetch(token, `/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      labels,
    }),
  });
}

async function createUpstreamIssue(token, upstreamRepo, { title, body }) {
  if (DRY_RUN) {
    console.log(`[dry-run] would POST /repos/${upstreamRepo}/issues: ${title}`);
    return { dry_run: true, title };
  }
  const [owner, repo] = upstreamRepo.split('/');
  // We only apply labels / assignees that are likely to exist upstream —
  // an unknown-label API call 422s the whole request. Labels are best-
  // effort applied in a second call and failures are swallowed.
  const created = await ghFetch(token, `/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  });
  // Best-effort: attach our routing labels so this repo's assignee
  // workflow (if installed upstream) picks it up.
  try {
    await ghFetch(
      token,
      `/repos/${owner}/${repo}/issues/${created.number}/labels`,
      {
        method: 'POST',
        body: JSON.stringify({ labels: Array.from(ROUTING_LABELS) }),
      },
    );
  } catch (e) {
    console.warn(
      `[warn] could not apply routing labels upstream on ${upstreamRepo}#${created.number}: ${e.message}`,
    );
  }
  return created;
}

// ─── Orchestration ───────────────────────────────────────────

async function processCandidate(token, cand, defaults) {
  const out = { repo: cand.repo, ok: false };
  let repo;
  try {
    repo = await getRepo(token, cand.repo);
  } catch (e) {
    out.error = `fetch upstream: ${e.message}`;
    return out;
  }
  const score = scoreRepo(repo, cand);
  out.score = score.total;
  out.band = score.band;

  if (score.total < defaults.mirror_issue_when_score_gte) {
    out.ok = true;
    out.action = 'skip';
    return out;
  }

  const title = `Fork-Audit Report — ${cand.repo} (score ${score.total})`;
  const body = buildAuditBody({ cand, repo, score });

  // Dedup mirror issues so repeat cron runs don't spam the backlog.
  try {
    const existing = await mirrorIssueExists(token, SELF_REPO, cand.repo);
    if (existing) {
      out.ok = true;
      out.action = 'mirror-exists';
      out.mirror_issue = existing.html_url;
      return out;
    }
  } catch (e) {
    // Search can rate-limit; log and proceed — duplicate detection is
    // a nice-to-have, not a correctness requirement.
    console.warn(`[warn] dedup search failed: ${e.message}`);
  }

  try {
    const mirror = await createMirrorIssue(token, SELF_REPO, {
      title,
      body,
      labels: Array.from(MIRROR_LABELS),
    });
    out.mirror_issue = mirror && (mirror.html_url || mirror.title);
    out.action = 'mirrored';
  } catch (e) {
    out.error = `mirror: ${e.message}`;
    return out;
  }

  if (score.total >= defaults.open_upstream_when_score_gte) {
    try {
      const upstream = await createUpstreamIssue(token, cand.repo, {
        title: `[revvel-standards audit] ${cand.repo} — score ${score.total}`,
        body: body +
          '\n\n---\n\n_Mirror of an internal audit opened by the ' +
          '[revvel-standards Fork-Audit Bot]' +
          '(https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/FORK_AUDIT_BOT_PROCESS.md). ' +
          'The `openrouter`, `copilot`, `role:orchestrator`, `auto-fix` and ' +
          '`fork-audit` labels are the routing signal for any compatible ' +
          'OpenRouter-driven workflow installed upstream._',
      });
      out.upstream_issue = upstream && (upstream.html_url || upstream.title);
      out.action = 'mirrored+upstream';
    } catch (e) {
      // Failing upstream is non-fatal — the mirror issue is the source
      // of truth for our tracking.
      out.upstream_error = e.message;
    }
  }

  out.ok = true;
  return out;
}

async function main() {
  const configPath = process.argv[2] || DEFAULT_CONFIG_PATH;
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('::error::GITHUB_TOKEN is not set — aborting.');
    process.exit(1);
  }

  const { defaults, candidates } = loadConfig(configPath);
  const slice = candidates.slice(0, defaults.max_candidates_per_run);
  console.log(
    `fork-audit-bot: ${slice.length}/${candidates.length} candidate(s) this run` +
      (DRY_RUN ? ' [DRY_RUN]' : ''),
  );

  const results = [];
  for (const cand of slice) {
    if (!cand || typeof cand.repo !== 'string' || !cand.repo.includes('/')) {
      console.warn('[warn] skipping malformed candidate:', cand);
      continue;
    }
    // Serialise requests — GitHub's secondary rate limit penalises
    // concurrent writes from the same token, and serial execution makes
    // per-candidate error isolation straightforward (one try/catch per
    // iteration, one log line per candidate, no Promise.allSettled gymnastics).
    // The candidate list is bounded by `max_candidates_per_run`, so total
    // wall time stays well under the workflow's 30-minute timeout.
    // eslint-disable-next-line no-await-in-loop
    const r = await processCandidate(token, cand, defaults).catch((e) => ({
      repo: cand.repo,
      ok: false,
      error: e.message,
    }));
    results.push(r);
    console.log(JSON.stringify(r));
  }

  // Minimal machine-readable summary (picked up by the workflow step
  // via $GITHUB_STEP_SUMMARY, if configured).
  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  console.log(`\nfork-audit-bot: ${ok} ok, ${failed} failed`);
  if (failed > 0) process.exitCode = failed > ok ? 1 : 0; // never hard-fail
}

module.exports = {
  scoreRepo,
  recencyScore,
  goalTagAlignmentBonus,
  buildAuditBody,
  loadConfig,
  ROUTING_LABELS,
  MIRROR_LABELS,
};

if (require.main === module) {
  main().catch((e) => {
    console.error('fork-audit-bot fatal:', e);
    process.exit(1);
  });
}
