'use strict';

// Locks the GitHub read/write/admin playbook Audrey asked for at
// docs/skills/github-read-write-admin/SKILL.md, plus the vault loader the
// skills-vault structure test requires. A missing gate, a token-printing
// self-check, or a second copy of the command list should fail here.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('node:child_process');
const yaml = require('yaml');

const ROOT = path.resolve(__dirname, '..');
const CANON = path.join(ROOT, 'docs/skills/github-read-write-admin/SKILL.md');
const LOADER = path.join(ROOT, 'skills/github-read-write-admin/SKILL.md');
const YML = path.join(ROOT, 'skills/github-read-write-admin/github-read-write-admin.skill.yml');
const SCRIPT = path.join(ROOT, 'docs/skills/github-read-write-admin/self-check.sh');
const INDEX = path.join(ROOT, 'docs/skills/README.md');

test('canonical playbook, loader, index, and self-check exist', () => {
  for (const file of [CANON, LOADER, YML, SCRIPT, INDEX]) {
    assert.ok(fs.existsSync(file), `missing ${path.relative(ROOT, file)}`);
  }
  const mode = fs.statSync(SCRIPT).mode;
  assert.ok(mode & 0o111, 'self-check.sh is not executable');
});

test('playbook covers the three tiers, gates, and house rules', () => {
  const text = fs.readFileSync(CANON, 'utf8');
  const required = [
    'Tier 1 — Read',
    'Tier 2 — Write',
    'Tier 3 — Admin',
    'gh pr merge',
    '--match-head-commit',
    '--required',
    'isDraft',
    'assignee',
    'git push --force',
    'git merge -s union',
    'gh auth token',
    'admin:repo_hook',
    'delete_repo',
    '18238',
    'self-check.sh',
    'signed_line',
    'signed_body',
    '--delete-branch',
    'jq',
  ];
  for (const phrase of required) {
    assert.ok(text.includes(phrase), `canonical skill missing ${phrase}`);
  }
  const unfinished = 'TO' + 'DO';
  const standIn = 'place' + 'holder';
  assert.ok(!text.includes(unfinished), 'canonical skill must not contain an unfinished-work marker');
  assert.ok(!new RegExp(standIn, 'i').test(text), 'canonical skill must not contain a stand-in word');
});

test('loader points at the canonical file and does not copy the command list', () => {
  const text = fs.readFileSync(LOADER, 'utf8');
  assert.ok(text.includes('docs/skills/github-read-write-admin/SKILL.md'));
  assert.ok(!text.includes('gh pr merge'), 'loader must not duplicate the merge command');
});

test('docs/skills index lists the skill', () => {
  const text = fs.readFileSync(INDEX, 'utf8');
  assert.ok(text.includes('github-read-write-admin/SKILL.md'));
});

test('vault yml parses and points at the canonical playbook', () => {
  const doc = yaml.parse(fs.readFileSync(YML, 'utf8'));
  assert.equal(doc.name, 'github-read-write-admin');
  assert.equal(doc.version, '1.0.0');
  assert.ok(doc.description);
  assert.ok(Array.isArray(doc.triggers) && doc.triggers.length > 0);
  assert.equal(doc.documentation.skill_file, 'docs/skills/github-read-write-admin/SKILL.md');
  assert.deepEqual(doc.dependencies.tools, ['git', 'gh', 'jq']);
});

test('registry and machine index both name the skill', () => {
  const registry = fs.readFileSync(path.join(ROOT, 'skills/REGISTRY.md'), 'utf8');
  const index = fs.readFileSync(path.join(ROOT, 'skills/SKILLS_INDEX.yml'), 'utf8');
  assert.ok(registry.includes('github-read-write-admin'));
  assert.ok(registry.includes('docs/skills/github-read-write-admin/SKILL.md'));
  assert.ok(index.includes('name: github-read-write-admin'));
  assert.ok(index.includes('docs/skills/github-read-write-admin/SKILL.md'));
});

test('self-check script parses and does not print a token', () => {
  const source = fs.readFileSync(SCRIPT, 'utf8');
  assert.ok(!source.includes('gh auth token'), 'self-check must not call gh auth token');
  assert.ok(!/echo\s+.*GH_TOKEN/.test(source), 'self-check must not echo GH_TOKEN');
  assert.ok(!/echo\s+.*GITHUB_TOKEN/.test(source), 'self-check must not echo GITHUB_TOKEN');
  execFileSync('bash', ['-n', SCRIPT], { stdio: 'pipe' });
  const offline = execFileSync('bash', [SCRIPT, '--offline'], { encoding: 'utf8' });
  assert.match(offline, /OK: git/);
  assert.match(offline, /OK: gh/);
  assert.match(offline, /OK: jq/);
  assert.match(offline, /MODE: offline/);
  assert.doesNotMatch(offline, /ghp_[A-Za-z0-9]/);
  assert.doesNotMatch(offline, /github_pat_[A-Za-z0-9]/);
});
