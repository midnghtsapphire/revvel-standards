'use strict';

/**
 * Every `uses:` in the repo must be a ref the runner can actually resolve
 * (WR #17832).
 *
 * Two refs sat in `social-media-automation.yml` containing CJK characters:
 *
 *     uses: ch一经/ch一经-action@v1
 *     uses: v，增量/linkedin-post-action@v1
 *
 * Those are not GitHub account names and cannot be. The job failed on EVERY
 * merged PR — at "Prepare all required actions", before a single step ran.
 *
 * The `if: vars.TWITTER_ENABLED == 'true'` guards on both steps did not help,
 * and that is the part worth remembering: **the runner resolves every step's
 * action up front, before any `if:` is evaluated.** A `uses:` you believe is
 * switched off still has to resolve.
 *
 * Three checks existed and none of them saw it:
 *
 *   - `actionlint` validates the SHAPE of a `uses:`, and `owner/repo@ref` is
 *     correctly shaped whatever the codepoints are.
 *   - `workflow-action-ref-audit.yml` resolves every ref against the GitHub
 *     API — but its extraction ended with
 *     `grep -E '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+@'`, which DROPPED these two
 *     before validation. The check built to catch broken refs was blind to the
 *     most broken kind there is. It then reported "✅ All N action refs
 *     resolved", where N was the count it could parse, presented as the count
 *     that exists — RVS-VERIFY-001 in one line.
 *   - That audit is scheduled, so even fixed it answers in hours, not seconds.
 *
 * Hence this test: the cheap half of the check, in the suite every PR runs.
 * It cannot tell whether a well-formed ref exists on GitHub — that is still
 * the audit's job, and needs the network. It can tell that a ref is not even
 * addressable, which is what happened here.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const DIRS = [
  path.join(ROOT, '.github', 'workflows'),
  path.join(ROOT, '.github', 'actions'),
];

/** Every real `uses:` directive, with its file and line. Comments excluded. */
function usesDirectives() {
  const found = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.ya?ml$/.test(entry.name)) continue;
      fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
        // Anchored, so a `#` comment that merely mentions `uses:` is not a
        // directive. The quarantine header in social-media-automation.yml
        // quotes the two bad refs as evidence; that is documentation, not a
        // step the runner will try to resolve.
        const m = /^\s*-?\s*uses:\s*(\S+)/.exec(line);
        if (!m) return;
        found.push({
          file: path.relative(ROOT, full),
          line: i + 1,
          ref: m[1].replace(/^["']|["']$/g, ''),
        });
      });
    }
  };
  DIRS.forEach(walk);
  return found;
}

test('the repo has uses: directives to check', () => {
  // Guards the walker itself: a scan that finds nothing passes every
  // assertion below and reports success for having looked nowhere.
  assert.ok(usesDirectives().length > 100, 'expected the repo\'s action refs');
});

test('no uses: ref contains a character GitHub cannot address', () => {
  // eslint-disable-next-line no-control-regex
  const NON_ASCII = /[^\x00-\x7F]/;
  const bad = usesDirectives()
    .filter(({ ref }) => NON_ASCII.test(ref))
    .map(({ file, line, ref }) => `${file}:${line} → ${ref}`);

  assert.deepEqual(
    bad,
    [],
    'these cannot resolve, and the runner resolves every step before it ' +
      `evaluates any \`if:\`, so the job fails having run nothing:\n  ${bad.join('\n  ')}`,
  );
});

test('every uses: ref is a shape the runner can address', () => {
  // `./local`, `docker://image` and `owner/repo[/path]@ref` are the three
  // legal forms. Anything else fails at setup.
  const LOCAL = /^\.\//;
  const DOCKER = /^docker:\/\//;
  const REMOTE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+@\S+$/;

  const bad = usesDirectives()
    .filter(({ ref }) => !LOCAL.test(ref) && !DOCKER.test(ref) && !REMOTE.test(ref))
    .map(({ file, line, ref }) => `${file}:${line} → ${ref}`);

  assert.deepEqual(
    bad,
    [],
    `not \`./local\`, \`docker://image\`, or \`owner/repo@ref\`:\n  ${bad.join('\n  ')}`,
  );
});

test('the audit\'s own extraction yields the refs that are actually there', () => {
  // The strongest assertion in this file, because the defect was in the
  // extraction and NOT in anything a re-implementation would reproduce.
  //
  // `grep -Rhn` suppresses the filename but keeps the line number, so the
  // pipeline's `sed 's/^[^:]+:[0-9]+:...'` — which expects `path:line:` —
  // matched nothing, and every candidate arrived still carrying
  // `87:        uses: `. The legal-name filter then discarded all of them. The
  // audit reported "✅ All 0 action refs resolved" on every run and had never
  // validated a single ref (#17832).
  //
  // So this runs the SHIPPED pipeline, lifted out of the workflow, rather than
  // a copy of it. A copy would have been green throughout the outage.
  const wf = fs.readFileSync(
    path.join(ROOT, '.github', 'workflows', 'workflow-action-ref-audit.yml'), 'utf8',
  );
  const block = /mapfile -t CANDIDATES < <\(\n([\s\S]*?)\n\s*\)\n/.exec(wf);
  assert.ok(block, 'the CANDIDATES extraction must be present and recognisable');

  const pipeline = block[1]
    .split('\n')
    .map((l) => l.replace(/^ {12}/, ''))
    .join('\n');

  const out = execFileSync('bash', ['-c', pipeline], {
    cwd: ROOT, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024,
  })
    .split('\n')
    .filter(Boolean);

  const directives = usesDirectives()
    .filter(({ ref }) => !/^\.\//.test(ref) && !/^docker:\/\//.test(ref));

  assert.ok(
    out.length > 20,
    `the extraction yielded ${out.length} refs from ${directives.length} \` +
      \`uses: directives — it is dropping nearly everything, which is the ` +
      'shape of the #17832 outage',
  );

  // Anchored at BOTH ends. Unanchored, `foo/bar@sha # v1.2.4` passes — and the
  // resolver then asks the API for a tag literally named `sha # v1.2.4`, gets a
  // 404, and reports a healthy SHA-pinned action as a broken ref. A check that
  // invents findings gets ignored as surely as one that finds nothing.
  const unparseable = out.filter(
    (r) => !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_./-]+@[A-Za-z0-9_./-]+$/.test(r),
  );
  assert.deepEqual(
    unparseable,
    [],
    'the extraction is emitting lines it has not finished parsing:\n  ' +
      unparseable.slice(0, 5).join('\n  '),
  );
});

test('the ref audit treats an unparseable ref as a finding, not a line to skip', () => {
  // The defect was in the audit's own extraction, so removing the bad refs
  // without fixing it leaves the next pair just as invisible.
  // Comments stripped: the fix documents the filter it removed, quoting it
  // verbatim so the next reader knows what went wrong. Prose about a defect is
  // not the defect — matching it would fail the very commit that fixes this.
  const audit = fs
    .readFileSync(
      path.join(ROOT, '.github', 'workflows', 'workflow-action-ref-audit.yml'), 'utf8',
    )
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n');

  assert.doesNotMatch(
    audit,
    /\|\s*grep -E '\^\[A-Za-z0-9_\.-\]\+\/\[A-Za-z0-9_\.-\]\+@'/,
    'filtering candidates to legal names before validation is what hid #17832',
  );
  assert.match(
    audit,
    /BROKEN\+=\("\$\{candidate\}"\)/,
    'a candidate that does not parse must land in BROKEN',
  );
});

test('the disabled social-media steps carry a RVS-AGENT-001 header', () => {
  // They were commented out rather than deleted, per COMMENT-DONT-DELETE §3.1,
  // because choosing which posting action to trust is an owner decision with
  // live credentials attached. The header is what makes that greppable.
  const wf = fs.readFileSync(
    path.join(ROOT, '.github', 'workflows', 'social-media-automation.yml'), 'utf8',
  );
  assert.match(wf, /# REVVEL-DISABLED \| AGENT: /);
  assert.match(wf, /# REVVEL-DISABLED-END/);
  for (const field of ['WR:', 'DATE:', 'STATUS:', 'REASON:', 'OWNER:']) {
    assert.ok(wf.includes(field), `the header must carry ${field}`);
  }
});
