'use strict';

const assert = require('node:assert');
const { test } = require('node:test');
const { classify, recommendedFloor, declaredRange, loadAdvisories } = require('../scripts/patch-agent');

const SEMVER_ADVISORY = {
  package: 'semver',
  cve: 'CVE-2022-25883',
  vulnerableRange: '<5.7.2 || >=6.0.0 <6.3.1 || >=7.0.0 <7.5.2',
  patchedVersions: ['5.7.2', '6.3.1', '7.5.2'],
};

test('classify: the semver ReDoS example', () => {
  // The repo resolves semver 7.8.1 — must be reported safe, not "fixed".
  assert.equal(classify('7.8.1', SEMVER_ADVISORY), 'safe');
  // Versions inside each vulnerable window.
  assert.equal(classify('7.3.2', SEMVER_ADVISORY), 'vulnerable');
  assert.equal(classify('6.3.0', SEMVER_ADVISORY), 'vulnerable');
  assert.equal(classify('5.7.1', SEMVER_ADVISORY), 'vulnerable');
  // Patched floors are safe.
  assert.equal(classify('7.5.2', SEMVER_ADVISORY), 'safe');
  assert.equal(classify('6.3.1', SEMVER_ADVISORY), 'safe');
});

test('classify: missing/garbage resolution is unknown, never a false "safe"', () => {
  assert.equal(classify(null, SEMVER_ADVISORY), 'unknown');
  assert.equal(classify('not-a-version', SEMVER_ADVISORY), 'unknown');
});

test('recommendedFloor: minimal in-major bump, no surprise majors', () => {
  assert.equal(recommendedFloor('7.3.2', SEMVER_ADVISORY), '7.5.2');
  assert.equal(recommendedFloor('6.3.0', SEMVER_ADVISORY), '6.3.1');
  assert.equal(recommendedFloor('5.0.0', SEMVER_ADVISORY), '5.7.2');
});

test('declaredRange finds the dependency across dependency fields', () => {
  assert.deepEqual(
    declaredRange({ dependencies: { semver: '^7.3.2' } }, 'semver'),
    { field: 'dependencies', range: '^7.3.2' },
  );
  assert.deepEqual(
    declaredRange({ devDependencies: { semver: '7.5.2' } }, 'semver'),
    { field: 'devDependencies', range: '7.5.2' },
  );
  assert.equal(declaredRange({ dependencies: { express: '^4' } }, 'semver'), null);
});

test('the seeded advisory feed loads and contains the semver CVE', () => {
  const advisories = loadAdvisories();
  const semverAdv = advisories.find((a) => a.package === 'semver');
  assert.ok(semverAdv, 'semver advisory present');
  assert.equal(semverAdv.cve, 'CVE-2022-25883');
});
