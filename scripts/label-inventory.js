#!/usr/bin/env node
/**
 * Label Taxonomy Inventory — the "who actually uses this label?" audit.
 *
 * Why this exists: `.github/labels.yml` grew to ~195 labels because workflows
 * kept inventing labels inline (`gh issue create --label brand-new-thing`),
 * which then failed at runtime with "label not found" (see the agent-monitor
 * incident) or silently forked the taxonomy. This script is the measurement
 * half of the fix; `tests/label-taxonomy.test.js` is the enforcement half.
 *
 * What it reports:
 *   1. Duplicate definitions inside labels.yml (same name twice).
 *   2. Labels with an unknown/missing `axis:` annotation.
 *   3. "Invented" labels — hardcoded in workflows but absent from labels.yml.
 *   4. Dead labels — defined but referenced by zero automation surfaces
 *      (workflows, issue templates, scripts, config, templates).
 *   5. Per-label open/closed issue counts via the GitHub API when a token is
 *      available (GH_TOKEN / GITHUB_TOKEN). Offline, counts are skipped —
 *      the structural checks still run, so CI never depends on the API.
 *
 * Usage:
 *   node scripts/label-inventory.js            # human-readable report
 *   node scripts/label-inventory.js --json     # machine-readable report
 *   GH_TOKEN=... node scripts/label-inventory.js --issue-counts
 *
 * Fallback / what to check if it fails: the yaml package comes from the root
 * package.json (`npm ci`). Issue counts hit `GET /search/issues` which is
 * rate-limited (30 req/min authenticated) — the script throttles itself, but
 * on 403/429 it degrades to "unknown" counts instead of failing the run.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const LABELS_FILE = path.join(REPO_ROOT, '.github', 'labels.yml');

// The one-namespace-per-axis taxonomy. Every label in labels.yml must carry
// an `axis:` from this set. Documented in docs/AGENT_MONITORING_STANDARD.md.
const AXES = [
  'type', // free set: bug, enhancement, documentation, security, …
  'triage', // triage intake state machine (triage, triage:*)
  'priority', // priority-p0..p3, priority-slot:*, urgent, blocked
  'wr', // work-request lifecycle state machine (wr:*, work-request, …)
  'research', // research-engine phase labels (research:*, deep-research, …)
  'deliver', // ship-to-market delivery targets (deliver:*)
  'review', // PR review/merge lifecycle (awaiting-review, checks-*, …)
  'lifecycle', // issue lifecycle/escalation (issue:*, needs-human, resolved)
  'fleet', // which agent owns the work (jules, copilot, openrouter:*, …)
  'role', // agent role within the fleet (role:orchestrator, role:fixer)
  'ops', // operations/automation health (auto-fix, self-heal, warning, …)
  'content', // content/marketing pipeline (content, seo, writing, …)
];

// Label families constructed dynamically at runtime (template literals in
// workflows), so a plain full-name grep misses them. Members of these
// families count as "referenced" as long as the prefix appears anywhere.
const DYNAMIC_LABEL_FAMILIES = [
  'priority-slot:', // brain-dump-intake.yml: `priority-slot:${item.slot}`
  'wr:retrigger-attempts-', // stuck-wr-detector.yml: `wr:retrigger-attempts-${n}`
];

// Directories that count as "automation surfaces" for reference scanning.
const AUTOMATION_DIRS = [
  '.github/workflows',
  '.github/ISSUE_TEMPLATE',
  'scripts',
  'wr/scripts',
  'config',
  'templates',
  'src',
];

/**
 * Parse `.github/labels.yml` WITHOUT collapsing duplicates (yaml.parse of a
 * sequence keeps duplicates anyway, but we stay dependency-light and mirror
 * the regex parser inside sync-labels.yml so both agree on what a label is).
 * Returns [{ name, color, description, axis }] in file order.
 */
function parseLabelsYaml(raw) {
  const labels = [];
  let current = null;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('#') || line === '' || line === 'labels:') continue;
    const name = line.match(/^-\s+name:\s+"?([^"]+?)"?\s*$/);
    if (name) {
      if (current && current.name) labels.push(current);
      current = { name: name[1] };
      continue;
    }
    if (!current) continue;
    const color = line.match(/^color:\s+"?([^"]+?)"?\s*$/);
    if (color) {
      current.color = color[1].replace(/^#/, '');
      continue;
    }
    const description = line.match(/^description:\s+"?(.+?)"?\s*$/);
    if (description) {
      current.description = description[1].replace(/\\"/g, '"');
      continue;
    }
    const axis = line.match(/^axis:\s+"?([^"]+?)"?\s*$/);
    if (axis) current.axis = axis[1];
  }
  if (current && current.name) labels.push(current);
  return labels;
}

/** Recursively list files under a directory (skips node_modules). */
function listFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

// A label literal: word chars, dashes, dots, colons, apostrophes — matches
// every label we actually define (e.g. "won't-merge", "wr:in-progress").
const LABEL_LITERAL = /["']([^"'\n$]+)["']/g;

/**
 * Extract label names hardcoded in a workflow file. Covers the three ways
 * this repo's workflows attach labels:
 *   • gh CLI:            --label "a,b"  /  --add-label "a"
 *   • YAML flow lists:   labels: [a, "b"]
 *   • github-script:     addLabels({ ... labels: ['a', 'b'] })
 * Skips anything containing `${` (dynamic — covered by DYNAMIC_LABEL_FAMILIES
 * or intentionally out of scope for the static gate).
 */
function extractWorkflowLabels(content) {
  const found = new Set();
  const add = (value) => {
    for (const piece of String(value).split(',')) {
      const label = piece.trim().replace(/^["']|["']$/g, '');
      if (!label || label.includes('$') || label.includes(' ')) continue;
      found.add(label);
    }
  };

  for (const m of content.matchAll(/--(?:add-)?label(?:=|\s+)["']?([\w:.,' -]+)/g)) {
    add(m[1]);
  }
  for (const m of content.matchAll(/labels:\s*\[([^\]\n]*)\]/g)) {
    for (const lit of m[1].matchAll(LABEL_LITERAL)) add(lit[1]);
  }
  for (const m of content.matchAll(/addLabels\(\s*\{[\s\S]{0,400}?labels:\s*\[([^\]]*)\]/g)) {
    for (const lit of m[1].matchAll(LABEL_LITERAL)) add(lit[1]);
  }
  return found;
}

/** All labels hardcoded across every workflow, mapped to the files using them. */
function collectWorkflowLabelUsage(repoRoot = REPO_ROOT) {
  const usage = new Map(); // label -> Set(workflow file)
  const wfDir = path.join(repoRoot, '.github', 'workflows');
  for (const file of listFiles(wfDir)) {
    if (!/\.ya?ml$/.test(file)) continue;
    const rel = path.relative(repoRoot, file);
    for (const label of extractWorkflowLabels(fs.readFileSync(file, 'utf8'))) {
      if (!usage.has(label)) usage.set(label, new Set());
      usage.get(label).add(rel);
    }
  }
  return usage;
}

/** Count automation files referencing each defined label (or its dynamic prefix). */
function collectAutomationReferences(labelNames, repoRoot = REPO_ROOT) {
  const files = AUTOMATION_DIRS.flatMap((d) => listFiles(path.join(repoRoot, d))).filter(
    (f) => !f.endsWith(path.join('.github', 'labels.yml'))
  );
  const contents = files.map((f) => ({
    rel: path.relative(repoRoot, f),
    text: fs.readFileSync(f, 'utf8'),
  }));
  const refs = new Map();
  for (const label of labelNames) {
    const family = DYNAMIC_LABEL_FAMILIES.find((prefix) => label.startsWith(prefix));
    const needle = family || label;
    refs.set(
      label,
      contents.filter((c) => c.text.includes(needle)).map((c) => c.rel)
    );
  }
  return refs;
}

/** Optional: open/closed issue counts per label via the GitHub search API. */
async function fetchIssueCounts(labelNames, token, repo) {
  const counts = new Map();
  for (const label of labelNames) {
    const query = encodeURIComponent(`repo:${repo} label:"${label}"`);
    try {
      const res = await fetch(`https://api.github.com/search/issues?q=${query}&per_page=1`, {
        headers: {
          Authorization: 'Bearer ' + token,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'label-inventory',
        },
      });
      if (!res.ok) {
        counts.set(label, null); // rate limited / forbidden — degrade, don't fail
        if (res.status === 403 || res.status === 429) {
          await new Promise((r) => setTimeout(r, 60_000)); // wait out the window
        }
        continue;
      }
      const data = await res.json();
      counts.set(label, data.total_count);
    } catch {
      counts.set(label, null);
    }
    // Search API allows 30 authenticated requests/minute — stay under it.
    await new Promise((r) => setTimeout(r, 2100));
  }
  return counts;
}

function buildInventory(repoRoot = REPO_ROOT) {
  const raw = fs.readFileSync(path.join(repoRoot, '.github', 'labels.yml'), 'utf8');
  const labels = parseLabelsYaml(raw);
  const names = labels.map((l) => l.name);

  const seen = new Set();
  const duplicates = [];
  for (const name of names) {
    if (seen.has(name)) duplicates.push(name);
    seen.add(name);
  }

  const badAxis = labels.filter((l) => !l.axis || !AXES.includes(l.axis)).map((l) => l.name);

  const workflowUsage = collectWorkflowLabelUsage(repoRoot);
  const invented = [...workflowUsage.keys()]
    .filter((label) => !seen.has(label))
    .sort()
    .map((label) => ({ label, workflows: [...workflowUsage.get(label)].sort() }));

  const refs = collectAutomationReferences([...seen], repoRoot);
  const dead = [...seen].filter((label) => refs.get(label).length === 0).sort();

  return { labels, uniqueCount: seen.size, duplicates, badAxis, invented, dead, refs };
}

async function main() {
  const args = process.argv.slice(2);
  const inv = buildInventory();

  if (args.includes('--issue-counts')) {
    const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPOSITORY || 'midnghtsapphire/revvel-standards';
    if (!token) {
      console.error('⚠️  --issue-counts requires GH_TOKEN or GITHUB_TOKEN; skipping counts.');
    } else {
      const counts = await fetchIssueCounts(
        inv.labels.map((l) => l.name),
        token,
        repo
      );
      for (const l of inv.labels) l.issueCount = counts.get(l.name);
    }
  }

  if (args.includes('--json')) {
    console.log(
      JSON.stringify(
        {
          uniqueCount: inv.uniqueCount,
          duplicates: inv.duplicates,
          missingOrUnknownAxis: inv.badAxis,
          inventedByWorkflows: inv.invented,
          deadLabels: inv.dead,
          labels: inv.labels.map((l) => ({
            ...l,
            automationRefs: inv.refs.get(l.name).length,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  console.log(`# Label taxonomy inventory\n`);
  console.log(`Defined labels (unique): ${inv.uniqueCount}`);
  console.log(`Duplicate definitions:   ${inv.duplicates.length}`);
  console.log(`Missing/unknown axis:    ${inv.badAxis.length}`);
  console.log(`Invented by workflows:   ${inv.invented.length}`);
  console.log(`Dead (0 automation refs): ${inv.dead.length}\n`);

  if (inv.duplicates.length) {
    console.log('## Duplicate definitions (delete all but one)\n');
    for (const d of inv.duplicates) console.log(`- ${d}`);
    console.log('');
  }
  if (inv.badAxis.length) {
    console.log(`## Labels missing a valid axis (must be one of: ${AXES.join(', ')})\n`);
    for (const b of inv.badAxis) console.log(`- ${b}`);
    console.log('');
  }
  if (inv.invented.length) {
    console.log('## Labels invented inline by workflows (add to labels.yml or fix the workflow)\n');
    for (const { label, workflows } of inv.invented) {
      console.log(`- ${label}  (${workflows.join(', ')})`);
    }
    console.log('');
  }
  if (inv.dead.length) {
    console.log('## Dead labels (no automation references — candidates for deletion)\n');
    for (const d of inv.dead) console.log(`- ${d}`);
    console.log('');
  }

  const perAxis = new Map();
  for (const l of inv.labels) {
    perAxis.set(l.axis || '(none)', (perAxis.get(l.axis || '(none)') || 0) + 1);
  }
  console.log('## Labels per axis\n');
  for (const [axis, n] of [...perAxis.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${axis}: ${n}`);
  }

  const problems =
    inv.duplicates.length + inv.badAxis.length + inv.invented.length;
  if (problems > 0 && args.includes('--check')) {
    console.error(`\n❌ ${problems} taxonomy violation(s) found.`);
    process.exit(1);
  }
}

module.exports = {
  AXES,
  DYNAMIC_LABEL_FAMILIES,
  parseLabelsYaml,
  extractWorkflowLabels,
  collectWorkflowLabelUsage,
  collectAutomationReferences,
  buildInventory,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
