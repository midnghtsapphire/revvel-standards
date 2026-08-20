'use strict';

/**
 * `no-root-junk.yml` must catch a throwaway script at the repo root even when
 * nobody has seen its name before (WR #17764).
 *
 * The original rule was a denylist of names that had leaked once — `plan.md`,
 * `finish_clean.js`, `tmp_*`, `scratch*`. Every new one-shot patcher arrives
 * under a new name, so that rule can only ever catch the last one. Four reached
 * `main` under names it never mentioned:
 *
 *   patch_ossar.js      string-replaces inside .github/workflows/ossar.yml
 *   update_uv_lock.py   rewrites one vendored uv.lock
 *   fix-semgrep.js      string-replaces inside image-seo-qa.yml
 *   fix-zizmor.js       same file, same shape
 *
 * The check was green for all four. Note `fix_boilerplate` IS on the denylist
 * and `fix-semgrep.js` still passed — the pattern spells that entry with an
 * underscore.
 *
 * So the guard now also carries an allowlist: any executable at the repo root
 * that is not named as permitted fails, whatever it is called.
 *
 * These tests run the workflow's real script body against synthetic changed-file
 * lists, stubbing only the `git diff` invocation. Everything under test — both
 * filters, the allowlist, the ratchet — is the shipped code.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'no-root-junk.yml');

function scriptBody() {
  const doc = yaml.parse(fs.readFileSync(WORKFLOW, 'utf8'));
  const step = doc.jobs['no-root-junk'].steps.find((s) => /scan diff/i.test(s.name || ''));
  assert.ok(step && step.run, 'the scanning step must be present');
  return step.run;
}

/**
 * Run the shipped script with `CHANGED` supplied instead of computed.
 * Returns the exit code: 0 = clean, 1 = junk found.
 */
function runGuard(changedFiles) {
  // Anchor on the git-diff line specifically. Matching `CHANGED=` alone also
  // swallows the in-script depth filter, which silently turns every
  // subdirectory script into a failure — the harness bug this comment exists
  // to stop someone re-introducing.
  const body = scriptBody().replace(
    /^ *CHANGED="\$\(git diff.*$/m,
    'CHANGED="$FIXTURE"',
  );
  assert.match(body, /CHANGED="\$FIXTURE"/, 'the git-diff line must be stubbed');
  assert.match(body, /grep -v '\/'/, 'the in-script depth filter must survive stubbing');

  const file = path.join(os.tmpdir(), `no-root-junk-${process.pid}-${changedFiles.length}.sh`);
  fs.writeFileSync(file, body);
  try {
    execFileSync('bash', [file], {
      env: { ...process.env, FIXTURE: changedFiles.join('\n') },
      stdio: 'pipe',
    });
    return 0;
  } catch (err) {
    return err.status;
  } finally {
    fs.unlinkSync(file);
  }
}

const FLAGGED = 1;
const CLEAN = 0;

test('a one-shot patcher under a name nobody denylisted is caught', () => {
  // The whole point. None of these appear in the name denylist.
  assert.equal(runGuard(['patch_ossar.js']), FLAGGED);
  assert.equal(runGuard(['fix-semgrep.js']), FLAGGED);
  assert.equal(runGuard(['fix-zizmor.js']), FLAGGED);
  assert.equal(runGuard(['cleanup_registry.js']), FLAGGED, 'a name invented tomorrow');
  assert.equal(runGuard(['migrate.sh']), FLAGGED, 'not only JavaScript');
});

test('generated browser data at the root is allowed', () => {
  // agent-creator.html loads these from the root, and publish-site.yml /
  // website-publish.yml commit them there. Both carry a do-not-edit header.
  assert.equal(runGuard(['agent-creator-data.js', 'hub-registry.js']), CLEAN);
});

test('legitimate root files that are not scripts are untouched', () => {
  assert.equal(runGuard(['README.md', 'index.html', 'package.json']), CLEAN);
});

test('scripts in subdirectories are out of scope', () => {
  // scripts/ is where these belong; flagging them would make the check
  // unpassable. Includes a subdir file named like a patcher.
  assert.equal(runGuard(['scripts/build-hub-registry.js']), CLEAN);
  assert.equal(runGuard(['scripts/patch_thing.js']), CLEAN);
});

test('the original name denylist still fires', () => {
  // Rule 2 covers executables only, so rule 1 must survive for plan.md et al.
  assert.equal(runGuard(['plan.md']), FLAGGED);
  assert.equal(runGuard(['scratch-notes.txt']), FLAGGED);
});

test('an empty diff is clean, not an error', () => {
  assert.equal(runGuard([]), CLEAN);
});

test('the known-offender ratchet may only shrink, and only by name', () => {
  const body = scriptBody();
  const match = /^ *RATCHET='([^']*)'/m.exec(body);
  assert.ok(match, 'the ratchet must be present and single-quoted');

  // Named, not counted. Deleting the file means deleting its line here in the
  // same commit; a name left behind quietly re-permits that file.
  assert.equal(match[1], '^update_uv_lock\\.py$');
  assert.equal(runGuard(['update_uv_lock.py']), CLEAN, 'exempt while it still exists');

  const stillPresent = fs.existsSync(path.join(ROOT, 'update_uv_lock.py'));
  assert.ok(
    stillPresent,
    'update_uv_lock.py is gone — delete its line from RATCHET and this assertion',
  );
});
