#!/usr/bin/env node
'use strict';

const assert = require('assert');
const {
  readConfig,
  validateConfig,
  amplitudeHost,
  amplitudeAuthHeader,
  summarizeChart,
  buildNotionPagePayload,
} = require('../scripts/amplitude-to-notion.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ FAIL: ${name}\n    ${e.message}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// readConfig / validateConfig
// ---------------------------------------------------------------------------

test('readConfig defaults are safe when env is empty', () => {
  const cfg = readConfig({});
  assert.strictEqual(cfg.amplitudeRegion, 'us');
  assert.strictEqual(cfg.notionVersion, '2022-06-28');
  assert.strictEqual(cfg.dryRun, false);
  assert.strictEqual(cfg.repository, 'midnghtsapphire/revvel-standards');
  assert.strictEqual(cfg.amplitudeApiKey, '');
});

test('readConfig honors DRY_RUN truthy variants', () => {
  assert.strictEqual(readConfig({ DRY_RUN: 'true' }).dryRun, true);
  assert.strictEqual(readConfig({ DRY_RUN: 'TRUE' }).dryRun, true);
  assert.strictEqual(readConfig({ DRY_RUN: 'false' }).dryRun, false);
  assert.strictEqual(readConfig({ DRY_RUN: '1' }).dryRun, false); // strict "true" only
});

test('validateConfig reports every missing required key', () => {
  const missing = validateConfig(readConfig({}));
  assert.deepStrictEqual(missing.sort(), [
    'AMPLITUDE_API_KEY',
    'AMPLITUDE_CHART_ID',
    'AMPLITUDE_SECRET_KEY',
    'NOTION_AMPLITUDE_DATABASE_ID',
    'NOTION_API_KEY',
  ].sort());
});

test('validateConfig returns empty when all required keys present', () => {
  const cfg = readConfig({
    AMPLITUDE_API_KEY: 'a',
    AMPLITUDE_SECRET_KEY: 'b',
    AMPLITUDE_CHART_ID: 'c',
    NOTION_API_KEY: 'd',
    NOTION_AMPLITUDE_DATABASE_ID: 'e',
  });
  assert.deepStrictEqual(validateConfig(cfg), []);
});

// ---------------------------------------------------------------------------
// amplitudeHost / amplitudeAuthHeader
// ---------------------------------------------------------------------------

test('amplitudeHost selects us by default and eu when asked', () => {
  assert.strictEqual(amplitudeHost('us'), 'amplitude.com');
  assert.strictEqual(amplitudeHost('eu'), 'analytics.eu.amplitude.com');
  assert.strictEqual(amplitudeHost('bogus'), 'amplitude.com');
  assert.strictEqual(amplitudeHost(undefined), 'amplitude.com');
});

test('amplitudeAuthHeader returns Basic <base64(api:secret)>', () => {
  const h = amplitudeAuthHeader('alice', 'wonderland');
  const expected = 'Basic ' + Buffer.from('alice:wonderland').toString('base64');
  assert.strictEqual(h, expected);
});

test('amplitudeAuthHeader rejects empty inputs', () => {
  assert.throws(() => amplitudeAuthHeader('', 'x'));
  assert.throws(() => amplitudeAuthHeader('x', ''));
});

// ---------------------------------------------------------------------------
// summarizeChart
// ---------------------------------------------------------------------------

test('summarizeChart sums numeric values across all series', () => {
  const sum = summarizeChart({
    data: {
      series: [[1, 2, 3], [10, 20]],
      seriesLabels: ['A', 'B'],
    },
  });
  assert.strictEqual(sum.total, 36);
  assert.strictEqual(sum.seriesCount, 2);
  assert.deepStrictEqual(sum.seriesLabels, ['A', 'B']);
});

test('summarizeChart joins compound series labels with " / "', () => {
  const sum = summarizeChart({
    data: {
      series: [[1]],
      seriesLabels: [['gh_issue_opened', 'main']],
    },
  });
  assert.deepStrictEqual(sum.seriesLabels, ['gh_issue_opened / main']);
});

test('summarizeChart never throws on garbage input', () => {
  assert.doesNotThrow(() => summarizeChart(null));
  assert.doesNotThrow(() => summarizeChart('not an object'));
  assert.doesNotThrow(() => summarizeChart({ data: { series: 'oops' } }));
  const empty = summarizeChart({});
  assert.strictEqual(empty.total, 0);
  assert.strictEqual(empty.seriesCount, 0);
});

test('summarizeChart ignores non-numeric values without crashing', () => {
  const sum = summarizeChart({ data: { series: [[1, 'oops', null, 4, NaN]] } });
  assert.strictEqual(sum.total, 5);
});

// ---------------------------------------------------------------------------
// buildNotionPagePayload
// ---------------------------------------------------------------------------

test('buildNotionPagePayload emits required Notion property shape', () => {
  const payload = buildNotionPagePayload({
    databaseId: 'db_123',
    isoDate: '2026-04-28T12:34:56.000Z',
    repository: 'midnghtsapphire/revvel-standards',
    chartId: 'chart_abc',
    summary: { total: 42, seriesCount: 2, seriesLabels: ['A', 'B'] },
  });
  assert.deepStrictEqual(payload.parent, { database_id: 'db_123' });
  assert.strictEqual(
    payload.properties.Title.title[0].text.content,
    '2026-04-28 — midnghtsapphire/revvel-standards'
  );
  assert.strictEqual(payload.properties.Date.date.start, '2026-04-28');
  assert.strictEqual(payload.properties['Total Events'].number, 42);
  assert.strictEqual(payload.properties['Series Count'].number, 2);
  assert.strictEqual(
    payload.properties['Series Labels'].rich_text[0].text.content,
    'A, B'
  );
  assert.strictEqual(
    payload.properties.Source.rich_text[0].text.content,
    'midnghtsapphire/revvel-standards'
  );
  assert.strictEqual(
    payload.properties['Chart ID'].rich_text[0].text.content,
    'chart_abc'
  );
});

test('buildNotionPagePayload truncates Series Labels under Notion 2000-char limit', () => {
  const labels = Array.from({ length: 500 }, (_, i) => `label_${i}`);
  const payload = buildNotionPagePayload({
    databaseId: 'db_123',
    isoDate: '2026-04-28T00:00:00.000Z',
    repository: 'r/r',
    chartId: 'c',
    summary: { total: 0, seriesCount: labels.length, seriesLabels: labels },
  });
  const content = payload.properties['Series Labels'].rich_text[0].text.content;
  assert.ok(content.length <= 1900, `content length was ${content.length}`);
});

test('buildNotionPagePayload coerces non-numeric counts to 0', () => {
  const payload = buildNotionPagePayload({
    databaseId: 'db_123',
    isoDate: '2026-04-28T00:00:00.000Z',
    repository: 'r/r',
    chartId: 'c',
    summary: { total: 'oops', seriesCount: undefined, seriesLabels: [] },
  });
  assert.strictEqual(payload.properties['Total Events'].number, 0);
  assert.strictEqual(payload.properties['Series Count'].number, 0);
});

test('buildNotionPagePayload requires databaseId', () => {
  assert.throws(() => buildNotionPagePayload({
    databaseId: '',
    isoDate: '2026-04-28',
    repository: 'r/r',
    chartId: 'c',
    summary: { total: 0, seriesCount: 0, seriesLabels: [] },
  }));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
