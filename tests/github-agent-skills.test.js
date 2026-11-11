'use strict';

// Locks the fourteen GitHub-relevant skills Audrey asked for under
// docs/skills/<name>/SKILL.md, plus the vault loader each one needs.
// A missing registration row, a dropped license, or a force-push instruction
// should fail here.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const ROOT = path.resolve(__dirname, '..');

const SKILLS = [
  ['gh-issue-triage', 'MIT'],
  ['resolve-conflicts', 'Apache-2.0'],
  ['git-advanced-workflows', 'MIT'],
  ['changelog-orchestrator', 'MIT'],
  ['pr-review-reply', 'Apache-2.0'],
  ['multi-pr-review', 'Apache-2.0'],
  ['octocode-pr-review', 'MIT'],
  ['pr-create-from-body', 'MIT'],
  ['deployment-pipeline-design', 'MIT'],
  ['sast-configuration', 'MIT'],
  ['lint-and-validate', 'MIT'],
  ['tdd-workflow', 'MIT'],
  ['karpathy-guidelines', 'MIT'],
  ['agentic-eval', 'MIT'],
];

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('each skill has a canonical playbook, a loader, and a machine config', () => {
  for (const [name] of SKILLS) {
    const canon = `docs/skills/${name}/SKILL.md`;
    const loader = `skills/${name}/SKILL.md`;
    const yml = `skills/${name}/${name}.skill.yml`;
    for (const rel of [canon, loader, yml]) {
      assert.ok(fs.existsSync(path.join(ROOT, rel)), `missing ${rel}`);
    }
    const text = read(canon);
    assert.match(text, new RegExp(`^---\\nname: ${name}\\n`, 'm'));
    assert.match(text, /^description:/m);
    assert.ok(text.includes('Revvel house rules'), `${name} missing house rules`);
    assert.ok(text.includes('— BotName'), `${name} missing signature`);
    assert.ok(text.includes('CircleCI'), `${name} missing CircleCI`);
    assert.ok(text.includes('git push --force'), `${name} missing force-push prohibition`);
    assert.ok(text.includes('gh auth token'), `${name} missing token prohibition`);
    assert.ok(!text.includes('dangerously-skip-permissions'), `${name} contains a skip-permissions flag`);
    for (const line of text.split('\n')) {
      if (line.includes('--force-with-lease') || line.includes('--delete-branch')) {
        assert.ok(line.includes('Do not'), `${name} mentions a forbidden flag outside a prohibition: ${line}`);
      }
    }
    const loaderText = read(loader);
    assert.ok(loaderText.includes(canon), `${name} loader does not point at the canonical file`);
    assert.ok(!loaderText.includes('git push --force'), `${name} loader copied the command list`);
    const doc = yaml.parse(read(yml));
    assert.equal(doc.name, name);
    assert.equal(doc.version, '1.0.0');
    assert.ok(doc.description);
    assert.ok(Array.isArray(doc.triggers) && doc.triggers.length > 0);
    assert.equal(doc.documentation.skill_file, canon);
  }
});

test('git-advanced-workflows keeps rebase, bisect, worktree, and reflog for unpushed work', () => {
  const text = read('docs/skills/git-advanced-workflows/SKILL.md');
  for (const phrase of ['git rebase', 'git bisect', 'git worktree', 'git reflog', 'have not been pushed']) {
    assert.ok(text.includes(phrase), `missing ${phrase}`);
  }
  for (const line of text.split('\n')) {
    if (line.includes('git reset --hard')) {
      assert.ok(line.includes('Do not'), `hard reset is named outside a prohibition: ${line}`);
    }
  }
});

test('docs index records a license for every new skill', () => {
  const index = read('docs/skills/README.md');
  assert.ok(index.includes('License record'));
  for (const [name, spdx] of SKILLS) {
    assert.ok(index.includes(`${name}/SKILL.md`), `docs/skills/README.md missing ${name}`);
    assert.ok(index.includes(`\`${name}\``), `license table missing ${name}`);
    const row = index.split('\n').find((line) => line.includes(`\`${name}\``) && line.includes(spdx));
    assert.ok(row, `license row for ${name} missing ${spdx}`);
  }
});

test('vault registry, machine index, skills README, and docs/AGENTS.md name every skill', () => {
  const registry = read('skills/REGISTRY.md');
  const machine = read('skills/SKILLS_INDEX.yml');
  const skillsReadme = read('skills/README.md');
  const agents = read('docs/AGENTS.md');
  for (const [name] of SKILLS) {
    const canon = `docs/skills/${name}/SKILL.md`;
    assert.ok(registry.includes(canon), `REGISTRY.md missing ${name}`);
    assert.ok(machine.includes(`name: ${name}`), `SKILLS_INDEX.yml missing ${name}`);
    assert.ok(machine.includes(canon), `SKILLS_INDEX.yml path missing ${name}`);
    assert.ok(skillsReadme.includes(canon), `skills/README.md missing ${name}`);
    assert.ok(agents.includes(canon), `docs/AGENTS.md missing ${name}`);
  }
});

test('changelog and the decision ledger mention the batch', () => {
  const changelog = read('CHANGELOG.md');
  const ledger = read('wr/memory/decisions.jsonl').trim().split('\n').pop();
  assert.ok(changelog.includes('gh-issue-triage'));
  assert.ok(changelog.includes('agentic-eval'));
  const entry = JSON.parse(ledger);
  assert.equal(entry.topic, 'github-agent-skills-docs');
  assert.ok(entry.decision.includes('CircleCI'));
  assert.ok(entry.decision.includes('TriageChief'));
});
