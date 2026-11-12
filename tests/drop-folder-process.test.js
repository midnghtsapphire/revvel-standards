'use strict';

// WR #18379: the drop folders process themselves. Routing is a config table;
// these tests pin the table, the handlers, the CircleCI wiring and the
// "annotate, don't delete" header on the superseded dashboard workflow.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const {
  loadConfig, globToRegExp, routeFor, planFiles, triggerMatches, needsDeps,
  parseFrontMatter, scanSecrets, countSourceRows, run, HANDLERS,
} = require('../scripts/drop-folder-process.js');

const ROOT = path.resolve(__dirname, '..');
const config = loadConfig();

// An in-memory repo so the tests need no checkout of docs/.
function memRepo(files) {
  return {
    config,
    exists: (rel) => Object.prototype.hasOwnProperty.call(files, rel),
    read: (rel) => files[rel],
    size: (rel) => Buffer.byteLength(files[rel]),
  };
}

const stubOrchestrator = {
  normalizeIntake: (x) => ({ ...x, goal_phase: Number(x.goal_phase) || 1 }),
  orchestrate: (intake) => {
    if (!Number.isFinite(Number(intake.revenue_target_monthly_usd))) throw new Error('Refusing intake: no revenue');
    return { channel: 'pdf', deliverLabel: 'deliver:pdf', status: 'routed' };
  },
  runnerTargetFor: () => 'github',
};

test('every required folder has a route and every route has a handler', () => {
  for (const folder of config.required_folders) {
    assert.ok(config.routes.some((r) => r.folder === folder), `no route for ${folder}`);
  }
  assert.equal(config.required_folders.length, 8);
  for (const r of config.routes) {
    assert.equal(typeof HANDLERS[r.handler], 'function', `no handler "${r.handler}" for ${r.folder}`);
    assert.ok(r.match.every((g) => g.startsWith(r.folder)), `${r.folder} matches outside itself`);
  }
});

test('globs: ** crosses folders, * does not', () => {
  assert.ok(globToRegExp('docs/inbox/**/*.md').test('docs/inbox/a.md'));
  assert.ok(globToRegExp('docs/inbox/**/*.md').test('docs/inbox/x/y/a.md'));
  assert.ok(!globToRegExp('docs/inbox/*.md').test('docs/inbox/x/a.md'));
  assert.ok(!globToRegExp('docs/inbox/**/*.md').test('docs/inbox/a.txt'));
  assert.ok(globToRegExp('**/README.md').test('README.md'));
  assert.ok(globToRegExp('**/README.md').test('products/x/README.md'));
});

test('each drop folder routes its own .md and ignores templates and READMEs', () => {
  assert.equal(routeFor('docs/inbox/idea.md', config).handler, 'inbox-ingest');
  assert.equal(routeFor('docs/inbox/TEMPLATE.md', config), null);
  assert.equal(routeFor('docs/inbox/TEMPLATE.revvel.md', config), null);
  assert.equal(routeFor('docs/research-drafts/t/NOTEBOOK.md', config).handler, 'research-draft-compile');
  assert.equal(routeFor('docs/research-drafts/_TEMPLATE/NOTEBOOK.md', config), null);
  for (const b of ['notebook', 'chatgpt', 'claudeai', 'claudecode', 'claudecoworker', 'grok']) {
    assert.equal(routeFor(`docs/${b}/topic/a.md`, config).handler, 'source-bucket-route', b);
    assert.equal(routeFor(`docs/${b}/README.md`, config), null, b);
  }
  assert.equal(routeFor('docs/other/a.md', config), null);
  assert.equal(routeFor('docs/inbox/data.json', config), null);
});

test('planFiles drops files no route claims', () => {
  const plan = planFiles(['docs/inbox/a.md', 'src/x.js', 'docs/grok/t/b.md'], config);
  assert.deepStrictEqual(plan.map((p) => p.file), ['docs/inbox/a.md', 'docs/grok/t/b.md']);
});

test('dependencies are only installed when an inbox intake changed', () => {
  assert.equal(needsDeps(['docs/inbox/a.md'], config), true);
  assert.equal(needsDeps(['docs/grok/t/a.md', 'docs/research-drafts/t/README.md'], config), false);
  assert.equal(needsDeps([], config), false);
});

test('dashboard trigger fires on its inputs and not on unrelated files', () => {
  assert.equal(triggerMatches(['docs/_MASTER_BOM.md'], config, 'dashboard'), true);
  assert.equal(triggerMatches(['products/affiliate-hub/README.md'], config, 'dashboard'), true);
  assert.equal(triggerMatches(['scripts/aggregate-project-dashboard.js'], config, 'dashboard'), true);
  assert.equal(triggerMatches(['tests/foo.test.js', 'LEDGER.md'], config, 'dashboard'), false);
});

test('front matter parser handles scalars, numbers, arrays and comments', () => {
  const { data, hasFrontMatter } = parseFrontMatter('---\nintake_id: i-1\nrevenue_target_monthly_usd: 2000\ngoal_phase: 1 # 1=$10k\ntags: [a, b]\nowner: \n---\n# Body\n');
  assert.equal(hasFrontMatter, true);
  assert.deepStrictEqual(data, { intake_id: 'i-1', revenue_target_monthly_usd: 2000, goal_phase: 1, tags: ['a', 'b'], owner: null });
  assert.equal(parseFrontMatter('# no front matter').hasFrontMatter, false);
});

test('inbox: a filled intake is routed; a blank template intake is refused', () => {
  const good = '---\nintake_id: i-1\nstatus: new\nrevenue_target_monthly_usd: 2000\ngoal_phase: 1\n---\n# Intake\n';
  const blank = '---\nintake_id: \nstatus: new\nrevenue_target_monthly_usd: 0\n---\n# Intake\n';
  const done = '---\nstatus: routed\nrevenue_target_monthly_usd: 5\n---\n';
  const none = '# plain note, no front matter\n';
  const res = run(
    ['docs/inbox/cpap-mask-finder.md', 'docs/inbox/blank.md', 'docs/inbox/done.md', 'docs/inbox/none.md'],
    {
      ...memRepo({
        'docs/inbox/cpap-mask-finder.md': good,
        'docs/inbox/blank.md': blank,
        'docs/inbox/done.md': done,
        'docs/inbox/none.md': none,
      }),
      orchestrator: stubOrchestrator,
    },
  );
  const by = Object.fromEntries(res.rows.map((r) => [path.basename(r.file), r]));
  assert.equal(by['cpap-mask-finder.md'].status, 'routed');
  assert.equal(by['cpap-mask-finder.md'].plan.product_slug, 'cpap-mask-finder');
  assert.equal(by['cpap-mask-finder.md'].plan.deliver_label, 'deliver:pdf');
  assert.match(by['cpap-mask-finder.md'].notes.join(' '), /derived "cpap-mask-finder"/);
  assert.equal(by['blank.md'].status, 'refused');
  assert.match(by['blank.md'].notes.join(' '), /Rule 4/);
  assert.equal(by['done.md'].status, 'skipped');
  assert.equal(by['none.md'].status, 'refused');
});

test('inbox: the real orchestrator accepts a filled intake in dry-run and writes nothing', (t) => {
  let orchestrator;
  try {
    orchestrator = require('../engines/runner-orchestrator/orchestrate.js');
  } catch (err) {
    t.skip(`orchestrator dependencies not installed: ${err.code}`);
    return;
  }
  const text = '---\nintake_id: i-2\nstatus: new\nrevenue_target_monthly_usd: 500\ngoal_phase: 1\nshape: pdf\n---\n';
  const before = fs.existsSync(path.join(ROOT, 'projects', 'agent-generated', 'real-intake'));
  const res = run(['docs/inbox/real-intake.md'], { ...memRepo({ 'docs/inbox/real-intake.md': text }), orchestrator });
  assert.equal(res.rows[0].status, 'routed');
  assert.equal(res.rows[0].plan.deliver_label, 'deliver:pdf');
  assert.equal(fs.existsSync(path.join(ROOT, 'projects', 'agent-generated', 'real-intake')), before);
});

test('research drafts: complete topic is ok and digested; incomplete topic warns', () => {
  const files = {
    'docs/research-drafts/a/README.md': '# Topic A\n',
    'docs/research-drafts/a/NOTEBOOK.md': '# N\n## 2026-11-11 — first\n- `[verified]` x\n- `[unverified]` y\n',
    'docs/research-drafts/a/sources.md': '| ID | Source | Type | Date pulled | Confidence | Notes |\n| --- | --- | --- | --- | --- | --- |\n| S1 | <https://example.com> | web | 2026-11-11 | verified | n |\n| S2 | <https://example.org> | web | 2026-11-11 | plausible | n |\n',
    'docs/research-drafts/b/NOTEBOOK.md': '# N\n',
    'docs/research-drafts/loose.md': '# loose\n',
  };
  const res = run(Object.keys(files), memRepo(files));
  const by = Object.fromEntries(res.rows.map((r) => [r.file, r]));
  assert.equal(by['docs/research-drafts/a/README.md'].status, 'ok');
  assert.equal(by['docs/research-drafts/b/NOTEBOOK.md'].status, 'warning');
  assert.match(by['docs/research-drafts/b/NOTEBOOK.md'].notes[0], /README\.md, sources\.md/);
  assert.equal(by['docs/research-drafts/loose.md'].status, 'warning');
  assert.match(res.digests.a, /Source rows logged in sources\.md: 2/);
  assert.match(res.digests.a, /verified 1, plausible 0, unverified 1/);
  assert.match(res.digests.a, /2026-11-11 — first/);
});

test('source buckets: routed when the topic exists, needs-topic when not', () => {
  const files = {
    'docs/notebook/a/dump.md': 'Source: https://example.com\n',
    'docs/grok/zzz/idea.md': 'no provenance here\n',
    'docs/chatgpt/top.md': 'loose\n',
    'docs/research-drafts/a/sources.md': '| ID |\n',
  };
  const res = run(Object.keys(files).filter((f) => !f.startsWith('docs/research-drafts')), memRepo(files));
  const by = Object.fromEntries(res.rows.map((r) => [r.file, r]));
  assert.equal(by['docs/notebook/a/dump.md'].status, 'routed');
  assert.equal(by['docs/notebook/a/dump.md'].source, 'NotebookLM');
  assert.equal(by['docs/grok/zzz/idea.md'].status, 'needs-topic');
  assert.match(by['docs/grok/zzz/idea.md'].notes.join(' '), /provenance is TODO/);
  assert.equal(by['docs/chatgpt/top.md'].status, 'needs-topic');
});

test('a secret in a processed file fails the run and is never echoed', () => {
  const key = 'ghp_' + 'A1b2'.repeat(10);
  const files = { 'docs/grok/t/leak.md': `token ${key}\n` };
  const res = run(Object.keys(files), memRepo(files));
  assert.equal(res.failures.length, 1);
  assert.deepStrictEqual(res.failures[0].secret_patterns, ['github-token']);
  assert.equal(JSON.stringify(res).includes(key), false);
  assert.deepStrictEqual(scanSecrets('plain words only', config.secret_patterns), []);
});

test('oversized files are skipped with a warning, not read', () => {
  const files = { 'docs/grok/t/big.md': 'x' };
  const res = run(Object.keys(files), { ...memRepo(files), size: () => config.limits.max_bytes + 1 });
  assert.equal(res.rows[0].status, 'warning');
});

test('source row counter ignores the template placeholder row', () => {
  const tpl = fs.readFileSync(path.join(ROOT, 'docs/research-drafts/_TEMPLATE/sources.md'), 'utf8');
  assert.equal(countSourceRows(tpl), 0);
});

test('CircleCI: new jobs are wired on push, no cron, no setup workflow, existing jobs kept', () => {
  const cfg = fs.readFileSync(path.join(ROOT, '.circleci/config.yml'), 'utf8');
  const live = cfg.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  for (const job of ['lint-and-test', 'validate-registries', 'policy-check', 'veins-monitor', 'agent-as-fte', 'demo-kit-test', 'affiliate-hub-build', 'affiliate-hub-image', 'drop-folder-process', 'dashboard-build']) {
    assert.match(live, new RegExp(`^  ${job}:`, 'm'), `${job} job missing`);
    const wired = live.match(new RegExp(`^      - ${job}:`, 'gm')) || [];
    assert.equal(wired.length, 2, `${job} should be in pr-workflow and main-workflow`);
  }
  assert.doesNotMatch(live, /^setup:\s*true/m, 'a setup config would break every job when dynamic config is off');
  assert.doesNotMatch(live, /\bschedule:|\bcron:|triggers:/, 'cost freeze: no cron');
  assert.doesNotMatch(live, /path-filtering/, 'dynamic config is not used');
});

test('CircleCI dashboard deploy skips without its token and is pinned', () => {
  const cfg = fs.readFileSync(path.join(ROOT, '.circleci/config.yml'), 'utf8');
  assert.match(cfg, /CLOUDFLARE_API_TOKEN/);
  assert.match(cfg, /SKIPPED: CLOUDFLARE_API_TOKEN/);
  assert.match(cfg, new RegExp(`wrangler@${config.dashboard.wrangler_version.replace(/\./g, '\\.')}`));
  assert.doesNotMatch(cfg, /wrangler@latest|\bwrangler pages deploy/, 'unpinned wrangler');
  assert.equal(config.dashboard.custom_domain.endsWith('.oaudrey.com'), true);
});

test('the superseded dashboard Actions workflow is annotated as history and still present', () => {
  const wf = fs.readFileSync(path.join(ROOT, config.dashboard.superseded_workflow), 'utf8');
  assert.match(wf, /^# REVVEL-HISTORY \|/m);
  assert.match(wf, /WR: #18379/);
  assert.match(wf, /^name: Update Project Dashboard/m, 'workflow body must be kept');
  assert.match(wf, /workflow_dispatch/);
});
