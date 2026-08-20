'use strict';

/**
 * The known-red-check registry must stay a registry, not a graveyard (WR #17738).
 *
 * Five checks are red on every PR for reasons unrelated to the diff. That is not
 * a cosmetic problem: when five are always red, a sixth — a real one — is
 * indistinguishable from the noise. It is the same failure mode that retired
 * OSSAR under D015, where a permanently-red security check meant a genuine
 * finding would have landed somewhere everyone had learned to ignore.
 *
 * `config/known-red-checks.yml` does not suppress anything. Nothing reads it to
 * skip a check, and #17738 forbids that outright:
 *
 *   "Do not simply mark checks non-required to make the list look green — that
 *    is weakening a gate, banned by GREEN_MAIN_STANDARD.md rule 5."
 *
 * Its value is the inverse: a red check that is NOT listed is unexplained by
 * construction. These tests make each entry pay for its place — a reason, a
 * named owner, and the specific action that clears it — so the file cannot
 * quietly become a list of things nobody intends to fix.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('yaml');

const ROOT = path.join(__dirname, '..');
const REGISTRY = path.join(ROOT, 'config', 'known-red-checks.yml');

const registry = () => yaml.parse(fs.readFileSync(REGISTRY, 'utf8'));

const CAUSES = new Set(['account-state', 'quota-exhausted', 'third-party-error']);

test('every entry names a reason, an owner, and what clears it', () => {
  for (const entry of registry().checks) {
    const where = entry.context ?? '(missing context)';
    assert.ok(entry.context, 'an entry must name the check context it refers to');
    assert.ok(entry.message, `${where}: record the message, so a DIFFERENT failure on the same check is not covered by this entry`);
    assert.ok(CAUSES.has(entry.cause), `${where}: cause must be one of ${[...CAUSES].join(', ')} — got ${entry.cause}`);
    assert.ok(entry.owner, `${where}: an entry with no owner is an excuse, not a record`);
    assert.equal(typeof entry.expected, 'boolean', `${where}: state whether this is the expected steady state`);

    const unblock = String(entry.unblocked_by ?? '').trim();
    assert.ok(unblock.length > 40, `${where}: unblocked_by must say what actually clears it`);
    assert.doesNotMatch(
      unblock,
      /^(n\/a|none|nothing|tbd|unknown)\.?$/i,
      `${where}: "${unblock}" is not an unblock path. If nothing clears it, say why that is deliberate.`,
    );
  }
});

test('every entry points at an issue that tracks it', () => {
  for (const entry of registry().checks) {
    assert.equal(
      typeof entry.tracked_in,
      'number',
      `${entry.context}: must reference the issue number tracking it, so the registry is not the only record`,
    );
  }
});

test('the registry does not suppress anything', () => {
  // The line this file must not cross. If any workflow or config ever reads it
  // to skip, mute, or de-require a check, that is #17738's banned outcome and
  // GREEN_MAIN_STANDARD.md rule 5.
  const searched = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, name.name);
      if (name.isDirectory()) {
        if (['node_modules', '.git'].includes(name.name)) continue;
        walk(full);
      } else if (/\.(ya?ml|js|mjs|cjs|sh)$/.test(name.name)) {
        searched.push(full);
      }
    }
  };
  walk(path.join(ROOT, '.github'));
  walk(path.join(ROOT, 'scripts'));

  const readers = searched.filter((f) => {
    if (f.endsWith('known-red-checks.yml')) return false;
    return fs.readFileSync(f, 'utf8').includes('known-red-checks');
  });

  assert.deepEqual(
    readers.map((f) => path.relative(ROOT, f)),
    [],
    'nothing may consume this registry to weaken a gate — it is a record, not a filter',
  );
});

test('an entry marked expected explains why it is the steady state', () => {
  // `expected: true` is the strongest claim in the file: it says this red check
  // is correct behaviour. Octopus at end-of-quota is the real case — the owner
  // has stated it is NOT to be uninstalled, because 20 free reviews a month is
  // real value and `out of credits` is what success looks like on day 21.
  for (const entry of registry().checks.filter((e) => e.expected)) {
    assert.match(
      String(entry.unblocked_by),
      /deliberat|expected|does not redden|monthly reset|not to be uninstalled|worth knowing/i,
      `${entry.context}: expected: true needs the reason it is acceptable, not just a fix`,
    );
  }
});

test('Octopus is recorded as keep-installed, per the owner', () => {
  // This has been restated enough times to be worth pinning: the free tier's 20
  // monthly reviews are wanted, and out-of-credits is end-of-quota, not a fault.
  const octopus = registry().checks.find((e) => /octopus/i.test(e.context));
  assert.ok(octopus, 'Octopus must be in the registry');
  assert.equal(octopus.expected, true);
  assert.match(octopus.unblocked_by, /NOT to be uninstalled/);
  assert.match(octopus.unblocked_by, /20/);
});

test('the three Vercel checks are recorded as not acceptable', () => {
  // #17738: "Leaving three permanent red checks on every PR is the one option
  // that should be off the table." Marking them `expected: true` would be
  // exactly that concession, so it must fail here.
  const vercel = registry().checks.filter((e) => /^Vercel/.test(e.context));
  assert.equal(vercel.length, 3, 'all three Vercel integrations must be listed');
  for (const entry of vercel) {
    assert.equal(
      entry.expected,
      false,
      `${entry.context}: a permanent red check is not an acceptable steady state`,
    );
  }
});

test('no duplicate contexts', () => {
  const contexts = registry().checks.map((e) => e.context);
  assert.equal(new Set(contexts).size, contexts.length);
});
