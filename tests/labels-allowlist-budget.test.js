'use strict';

/**
 * The label budget must be spent deliberately (WR #17737).
 *
 * `config/labels-allowlist.yml` declares `max_labels_total: 80`. That cap is
 * the whole mechanism: it forces each new fleet label to be argued for rather
 * than appended. #17737 arrived with 19 unresolved labels and 3 free slots, so
 * the cap did its job — it made the question "which of these deserves budget?"
 * unavoidable.
 *
 * Sixteen were aliased or resolved by a prefix rule, at zero cost. Three —
 * the `issue:*` lifecycle triad — took the remaining slots, because nothing
 * canonical means "this issue is done" and `bootstrap-pr-labels.yml` creates
 * them as real labels with colours and descriptions.
 *
 * The budget is now fully spent. These tests hold that line, so the next
 * addition has to alias, add a prefix rule, become a Project field, or make the
 * case for raising the cap in writing.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'config', 'labels-allowlist.yml');
const CHECKER = path.join(ROOT, 'scripts', 'label-allowlist-check.mjs');

const config = () => yaml.parse(fs.readFileSync(CONFIG, 'utf8'));

/** Run the strict checker over a label set; returns its exit code. */
function check(labels) {
  try {
    execFileSync('node', [CHECKER, '--strict'], {
      env: { ...process.env, LABELS: labels.join(',') },
      stdio: 'pipe',
    });
    return 0;
  } catch (err) {
    return err.status;
  }
}

test('the allowlist stays within its declared budget', () => {
  const { labels, max_labels_total: max } = config();
  assert.ok(Number.isInteger(max), 'max_labels_total must be declared');
  assert.ok(
    labels.length <= max,
    `${labels.length} labels against a cap of ${max} — alias, add a prefix rule, ` +
      'or justify raising the cap in writing',
  );
});

test('the cap is not raised silently', () => {
  // #17737: "Do not raise max_labels_total as a shortcut to avoid making the
  // per-label decision." Pinning the number means raising it is a visible diff
  // that has to carry a reason, which is the point of having a cap at all.
  assert.equal(config().max_labels_total, 80);
});

test('the budget is fully spent, so the next addition must argue for itself', () => {
  const { labels, max_labels_total: max } = config();
  assert.equal(
    labels.length,
    max,
    'if a slot has been freed, say why here — an unexplained free slot invites ' +
      'the next label to take it without the decision #17737 forced',
  );
});

test('the issue lifecycle triad is first-class, not aliased', () => {
  const { labels, aliases } = config();
  const names = labels.map((l) => (typeof l === 'string' ? l : l.name));
  for (const label of ['issue:done', 'issue:in-progress', 'issue:stale']) {
    assert.ok(names.includes(label), `${label} must be a first-class entry`);
    assert.ok(!(label in aliases), `${label} must not also be aliased`);
  }
});

test('every label the fleet applies today resolves', () => {
  // The Definition of Done in #17737. Run over the live set rather than a
  // hand-kept list: that issue enumerated 19, and running the checker against
  // the actual labels on open issues surfaced three more — `swe-fix`, `fix-me`
  // and `chore`. A list is a snapshot asserting completeness that nothing
  // re-verifies (RVS-VERIFY-001).
  const LIVE = [
    'bug', 'enhancement', 'documentation', 'security', 'chore', 'blocked', 'in-review',
    'auto-fix', 'copilot', 'openrouter', 'role:orchestrator', 'infrastructure', 'automation',
    'area:ui', 'area:automation', 'area:api', 'triage', 'triage:new', 'needs-human',
    'priority:p1', 'priority:p2', 'priority:p3', 'priority-p0', 'priority-p1', 'priority-p2',
    'priority:high', 'weekly-research', 'deep-research', 'work-request', 'bito-ai',
    'awaiting-review', 'mindmappr', 'ralph-loop', 'research-engine',
    'wr:new', 'wr:in-progress', 'wr:reset', 'wr:jules', 'wr:research-complete', 'wr-stuck',
    'research:complete', 'research:review-needed', 'research:marketing', 'research:seo',
    'research:competitors', 'research:chatter', 'research:facts', 'research:technical',
    'research:revenue', 'research:reviewer', 'research:repo-web', 'research:blocked',
    'output-type:production-app', 'output-type:technical-documentation',
    'output-type:internal-script-automation', 'output-type:mcp-product',
    'issue:done', 'issue:in-progress', 'issue:stale',
    'lifecycle:stuck', 'self-heal', 'self-healing', 'security-fleet', 'needs-action',
    'biome', 'dod-gap', 'scorecard', 'auto:default-fallback', 'swe-fix', 'fix-me',
  ];
  assert.equal(check(LIVE), 0, 'the live label set must pass the strict checker');
});

test('an invented label is still rejected — the checker did not go permissive', () => {
  // A fix that made everything pass would satisfy the test above and be worthless.
  assert.equal(check(['definitely-not-a-real-label']), 1);
  assert.equal(check(['output-type:anything-new']), 0, 'but the prefix family stays open');
});

test('the agent-trigger labels the router applies are resolvable', () => {
  // openrouter-auto-route.yml's routing table applies these; if one stops
  // resolving, every routed issue collects an allowlist complaint.
  const workflow = fs.readFileSync(
    path.join(ROOT, '.github', 'workflows', 'openrouter-auto-route.yml'),
    'utf8',
  );
  const table = /const routingTable = \{([\s\S]*?)\};/.exec(workflow);
  assert.ok(table, 'the routing table must be present');
  const applied = [...new Set([...table[1].matchAll(/'([a-z0-9:_-]+)'/g)].map((m) => m[1]))]
    .filter((v) => !v.includes('-product') && !v.includes('-app') && !v.includes('-pdf')
      && !v.includes('-tool') && !v.includes('-flow') && !v.includes('documentation')
      && !v.includes('-doc') && !v.includes('-task') && !v.includes('-automation'));
  assert.ok(applied.length > 0, 'expected agent-trigger labels');
  assert.equal(check(applied), 0, `these must resolve: ${applied.join(', ')}`);
});
