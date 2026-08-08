'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  loadRegistry,
  validateRegistry,
  cleanTitle,
  suggestTitle,
  formatTitle,
  normalizeSubject,
  mineTitlePatterns,
  listStarters,
  extractSummary,
  isAlreadyClean,
  main,
} = require('../scripts/wr-autotitle');

test('registry parses and validates cleanly', () => {
  const registry = loadRegistry();
  assert.deepEqual(validateRegistry(registry), []);
  assert.ok(registry.templates.length >= 5);
  assert.ok(listStarters(registry).length >= 5);
});

test('cleanTitle collapses double spaces and enforces [WR] prefix', () => {
  const result = cleanTitle('[WR]  fix ci asap');
  assert.equal(result.title, '[WR] Fix ci asap');
  assert.equal(result.changed, true);
});

test('cleanTitle strips slash-command noise and URLs', () => {
  const result = cleanTitle(
    '[WR] add https://github.com/foo/bar /dragnet wire it in'
  );
  assert.match(result.title, /^\[WR\] /);
  assert.doesNotMatch(result.title, /\/dragnet/i);
  assert.doesNotMatch(result.title, /https?:\/\//i);
  assert.match(result.title, /bar/i);
});

test('suggestTitle maps fleet maintenance pattern', () => {
  const result = suggestTitle({
    title: '[WR] Fleet maintenance midnghtsapphire/ocean2-v2-research',
    force: true,
  });
  assert.equal(result.templateKey, 'fleet-maintenance');
  assert.match(result.title, /^\[WR\] Fleet maintenance — /);
});

test('suggestTitle maps need-ability brain dumps to add-feature', () => {
  const result = suggestTitle({
    title:
      '[WR] Need ability to autocreate generic WR titles so I do not have to retype like this one',
    force: true,
  });
  assert.equal(result.templateKey, 'add-feature');
  assert.match(result.title, /^\[WR\] Add /i);
  assert.ok(result.title.length <= 100);
});

test('suggestTitle skips already-clean titles unless forced', () => {
  const title = '[WR] Wire in chrome-devtools-mcp';
  const skipped = suggestTitle({ title, force: false });
  assert.equal(skipped.skipped, true);
  assert.equal(skipped.changed, false);

  const forced = suggestTitle({ title, force: true });
  assert.equal(forced.templateKey, 'wire-in');
  assert.match(forced.title, /^\[WR\] Wire in /);
});

test('suggestTitle uses Summary from body when title is sparse', () => {
  const body = `### Summary\n\nDeep research the caspian sdk for agent memory\n\n### Objective\n\nEvaluate fit\n`;
  const result = suggestTitle({
    title: '[WR] ',
    body,
    force: true,
  });
  assert.ok(result.title.length > 6);
  assert.equal(result.templateKey, 'deep-research');
});

test('formatTitle respects max_length', () => {
  const long = 'x'.repeat(200);
  const titled = formatTitle(long, {
    defaults: { prefix: '[WR]', max_length: 40, strip_trailing_punctuation: true },
  });
  assert.ok(titled.length <= 40);
  assert.match(titled, /^\[WR\] /);
  assert.match(titled, /…$/);
});

test('normalizeSubject strips nested [WR] self-reference', () => {
  const subject = normalizeSubject(
    '[WR] title like this one: [WR] huge implementation research'
  );
  assert.doesNotMatch(subject, /\[WR\]/i);
});

test('extractSummary reads WR form section', () => {
  const summary = extractSummary('### Summary\n\nHello world\n\n### Objective\n\nDo it\n');
  assert.equal(summary, 'Hello world');
});

test('isAlreadyClean rejects double spaces and missing prefix', () => {
  assert.equal(isAlreadyClean('[WR]  bad'), false);
  assert.equal(isAlreadyClean('No prefix here'), false);
  assert.equal(isAlreadyClean('[WR] Clean title'), true);
});

test('mineTitlePatterns ranks unigrams from a temp title list', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wr-titles-'));
  const file = path.join(dir, 'titles.txt');
  fs.writeFileSync(
    file,
    ['[WR] Add foo', '[WR] Add bar', '[WR] Fix CI baz', '[WR] Research qux'].join('\n'),
    'utf8'
  );
  const mined = mineTitlePatterns(file, { top: 5 });
  assert.equal(mined.total, 4);
  assert.equal(mined.unigrams[0].token, 'add');
  assert.equal(mined.unigrams[0].count, 2);
});

test('validateRegistry flags bad shapes', () => {
  const problems = validateRegistry({
    defaults: { prefix: '', max_length: 5 },
    templates: [{ key: 'Bad', title: 't', usage: 'u' }],
    starters: [{ key: 's' }],
  });
  assert.ok(problems.some((p) => p.includes('prefix')));
  assert.ok(problems.some((p) => p.includes('max_length')));
  assert.ok(problems.some((p) => p.includes('kebab-case')));
  assert.ok(problems.some((p) => p.includes('starters')));
});

test('CLI --check and --clean exit 0 on happy path', () => {
  const prevOut = process.stdout.write;
  const prevErr = process.stderr.write;
  let out = '';
  process.stdout.write = (chunk) => {
    out += String(chunk);
    return true;
  };
  process.stderr.write = () => true;
  try {
    assert.equal(main(['node', 'wr-autotitle.js', '--check']), 0);
    assert.match(out, /ok/);
    out = '';
    assert.equal(
      main(['node', 'wr-autotitle.js', '--clean', '[WR]  hello world']),
      0
    );
    assert.match(out, /^\[WR\] Hello world\n$/);
  } finally {
    process.stdout.write = prevOut;
    process.stderr.write = prevErr;
  }
});
