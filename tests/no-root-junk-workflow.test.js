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
 *                       (human-deleted in #17769; name left the ratchet in #17790)
 *   update_uv_lock.py   rewrites one vendored uv.lock (Option C disabled)
 *   fix-semgrep.js      string-replaces inside image-seo-qa.yml (Option C disabled)
 *   fix-zizmor.js       same file, same shape (Option C disabled)
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
  // The whole point: rule 1 can only ever catch the last name that leaked.
  // None of these appear in it, and none are in the ratchet.
  assert.equal(runGuard(['cleanup_registry.js']), FLAGGED, 'a name invented tomorrow');
  assert.equal(runGuard(['migrate.sh']), FLAGGED, 'not only JavaScript');
  assert.equal(runGuard(['bump_deps.py']), FLAGGED, 'the shape of update_uv_lock.py');
  assert.equal(runGuard(['patch_thing.js']), FLAGGED, 'the shape of patch_ossar.js');
  assert.equal(runGuard(['fix-semgrep-v2.js']), FLAGGED, 'the shape of fix-semgrep.js');
});

test('the denylist alone would have missed every offender at the root today', () => {
  // Why rule 2 exists. Each of these was green under rule 1 for the whole time
  // it sat at the root. `fix_boilerplate` IS on that denylist and
  // fix-semgrep.js still passed — the entry is spelled with an underscore.
  const DENYLIST = /^(plan|finish_clean|fix_boilerplate|update_wr|tmp[_-].*|scratch.*|temp[_-].*|throwaway.*|notes)\.(js|mjs|ts|md|sh|py|txt)$/;
  for (const file of ['patch_ossar.js', 'fix-semgrep.js', 'fix-zizmor.js', 'update_uv_lock.py']) {
    assert.doesNotMatch(file, DENYLIST, `${file} was invisible to the name denylist`);
  }
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

  // Named, not counted. A count lets one offender be swapped for another with
  // nothing failing — the hole fixed in #17782.
  //
  // patch_ossar.js is gone: human-merged #17769 deleted it, so its name left
  // the ratchet in the same Option-C pass as #17790 (agent must not delete the
  // remaining three; only drop names whose files are already gone).
  assert.equal(
    match[1],
    '^(update_uv_lock\\.py|fix-semgrep\\.js|fix-zizmor\\.js)$',
  );

  const NAMED = ['update_uv_lock.py', 'fix-semgrep.js', 'fix-zizmor.js'];
  for (const file of NAMED) {
    assert.equal(runGuard([file]), CLEAN, `${file} is exempt while it still exists`);
  }

  // None of these may be deleted by an agent — RVS-AGENT-001 reserves that to a
  // human (#17790). When the owner ratifies a removal, the file goes and its
  // name comes out of RATCHET in the same commit; a name left behind quietly
  // re-permits that path.
  const orphaned = NAMED.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  assert.deepEqual(
    orphaned,
    [],
    'these files are gone — remove their names from RATCHET and from this list',
  );
});

test('ratcheted root patchers stay inert under REVVEL-DISABLED (Option C / #17790)', () => {
  // Agents may not delete these (RVS-AGENT-001). Option C keeps the files and
  // comments the body so re-running them cannot mutate workflows/lockfiles.
  // A bare re-enable without human ratification of deletion is the failure mode.
  for (const file of ['update_uv_lock.py', 'fix-semgrep.js', 'fix-zizmor.js']) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const lines = text.split('\n');
    const openIdx = lines.findIndex((l) => /REVVEL-DISABLED\s*\|/.test(l) && !/REVVEL-DISABLED-END/.test(l));
    const endIdx = lines.findIndex((l) => /REVVEL-DISABLED-END/.test(l));
    assert.ok(openIdx >= 0, `${file} must open a REVVEL-DISABLED block`);
    assert.ok(endIdx >= 0, `${file} must close the REVVEL-DISABLED block`);
    assert.ok(openIdx < endIdx, `${file} header must precede REVVEL-DISABLED-END`);
    assert.match(lines[openIdx], /STATUS:\s*REPLACED/, `${file} records STATUS: REPLACED`);
    assert.match(lines[openIdx], /WR:\s*#17790/, `${file} references #17790`);
    // No live executable body: every non-empty line is a comment (the whole
    // file is the disabled block). Structure above pins open-before-close.
    const live = lines.filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (t.startsWith('//') || t.startsWith('#')) return false;
      return true;
    });
    assert.deepEqual(live, [], `${file} must have no live (non-comment) code`);
  }

  // Human already deleted patch_ossar.js in #17769 — do not resurrect the path
  // as a silent re-permit, and do not leave its name in the RATCHET value
  // (comments may still name it for archaeology).
  assert.equal(fs.existsSync(path.join(ROOT, 'patch_ossar.js')), false);
  const ratchetLine = /^ *RATCHET='([^']*)'/m.exec(scriptBody());
  assert.ok(ratchetLine, 'RATCHET assignment must remain present');
  assert.doesNotMatch(ratchetLine[1], /patch_ossar/);
});
