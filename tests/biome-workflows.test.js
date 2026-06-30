'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const WF_DIR = path.join(__dirname, '..', '.github', 'workflows');
const BIOME_WORKFLOWS = ['biome-sentinel.yml', 'biome-homeostat.yml', 'biome-medic.yml', 'biome-sheaf.yml'];

const TOKEN_FALLBACK = "secrets.ADMIN_GITHUB_TOKEN != '' && secrets.ADMIN_GITHUB_TOKEN || secrets.GITHUB_TOKEN";

function readWf(file) {
  const raw = fs.readFileSync(path.join(WF_DIR, file), 'utf8');
  return { raw, doc: yaml.parse(raw) };
}

for (const file of BIOME_WORKFLOWS) {
  test(`${file} parses and declares name + trigger`, () => {
    const { doc } = readWf(file);
    assert.ok(doc.name, 'missing name');
    // yaml parses bare `on:` as the boolean key true
    assert.ok(doc.on || doc.true, 'missing on: trigger');
  });

  test(`${file} sets GH_REPO and the token-with-fallback pattern`, () => {
    const { raw } = readWf(file);
    assert.ok(raw.includes('GH_REPO: ${{ github.repository }}'), 'missing GH_REPO env');
    assert.ok(raw.includes(TOKEN_FALLBACK), 'missing token-with-fallback pattern');
  });

  test(`${file} declares an explicit permissions block`, () => {
    const { doc } = readWf(file);
    assert.ok(doc.permissions && typeof doc.permissions === 'object', 'missing permissions block');
  });

  test(`${file} does not interpolate untrusted github.event.* into run: shells`, () => {
    const { doc } = readWf(file);
    const jobs = doc.jobs || {};
    for (const job of Object.values(jobs)) {
      for (const step of job.steps || []) {
        if (typeof step.run === 'string') {
          assert.ok(
            !/\$\{\{\s*github\.event\./.test(step.run),
            `step "${step.name}" interpolates github.event.* directly into run:`
          );
        }
      }
    }
  });
}

test('biome-sheaf is the only worker granted contents: write (single committer)', () => {
  const writers = [];
  for (const file of BIOME_WORKFLOWS) {
    const { doc } = readWf(file);
    if (doc.permissions && doc.permissions.contents === 'write') writers.push(file);
  }
  assert.deepEqual(writers, ['biome-sheaf.yml']);
});
