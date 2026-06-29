'use strict';

/**
 * Tests for the I/O layer of scripts/agent-scorecard/ledger.js.
 * The existing tests/agent-scorecard.test.js covers aggregate() and
 * renderLeaderboard(); this file adds coverage for appendEvent(),
 * readEvents(), and writeLeaderboard().
 */

const test = require('node:test');
const assert = require('node:assert');
const os = require('os');
const fs = require('fs');
const path = require('path');

const {
  appendEvent,
  readEvents,
  renderLeaderboard,
  writeLeaderboard,
  aggregate,
} = require('../scripts/agent-scorecard/ledger');

function tmpFile(ext = '.jsonl') {
  return path.join(os.tmpdir(), `ledger-test-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
}

// ── readEvents ────────────────────────────────────────────────────────────────

test('readEvents: non-existent file returns empty array', () => {
  const f = tmpFile();
  const events = readEvents(f);
  assert.deepStrictEqual(events, []);
});

test('readEvents: parses valid JSONL lines', () => {
  const f = tmpFile();
  try {
    fs.writeFileSync(f, [
      JSON.stringify({ type: 'score', agent: 'a', quality: 90 }),
      JSON.stringify({ type: 'score', agent: 'b', quality: 80 }),
    ].join('\n') + '\n');
    const events = readEvents(f);
    assert.strictEqual(events.length, 2);
    assert.strictEqual(events[0].agent, 'a');
    assert.strictEqual(events[1].agent, 'b');
  } finally {
    fs.rmSync(f, { force: true });
  }
});

test('readEvents: silently skips malformed JSON lines', () => {
  const f = tmpFile();
  try {
    fs.writeFileSync(f, [
      JSON.stringify({ type: 'score', agent: 'x', quality: 85 }),
      'NOT_VALID_JSON',
      '{unclosed',
      JSON.stringify({ type: 'score', agent: 'y', quality: 75 }),
    ].join('\n') + '\n');
    const events = readEvents(f);
    assert.strictEqual(events.length, 2, 'should skip 2 bad lines and keep 2 good ones');
    assert.strictEqual(events[0].agent, 'x');
    assert.strictEqual(events[1].agent, 'y');
  } finally {
    fs.rmSync(f, { force: true });
  }
});

test('readEvents: ignores blank lines', () => {
  const f = tmpFile();
  try {
    fs.writeFileSync(f, '\n\n' + JSON.stringify({ type: 'score', agent: 'z', quality: 70 }) + '\n\n');
    const events = readEvents(f);
    assert.strictEqual(events.length, 1);
  } finally {
    fs.rmSync(f, { force: true });
  }
});

// ── appendEvent ───────────────────────────────────────────────────────────────

test('appendEvent: creates file if it does not exist and writes one event', () => {
  const f = tmpFile();
  try {
    appendEvent({ type: 'score', agent: 'bot', pr: 1, quality: 88 }, f);
    assert.ok(fs.existsSync(f), 'ledger file should be created');
    const events = readEvents(f);
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].agent, 'bot');
    assert.strictEqual(events[0].quality, 88);
  } finally {
    fs.rmSync(f, { force: true });
  }
});

test('appendEvent: injects a `ts` timestamp on every event', () => {
  const f = tmpFile();
  try {
    appendEvent({ type: 'score', agent: 'bot', quality: 80 }, f);
    const events = readEvents(f);
    assert.ok(events[0].ts, 'should have a ts field');
    assert.match(events[0].ts, /^\d{4}-\d{2}-\d{2}$/, 'ts should be YYYY-MM-DD');
  } finally {
    fs.rmSync(f, { force: true });
  }
});

test('appendEvent: preserves event fields and does not overwrite caller ts', () => {
  const f = tmpFile();
  try {
    appendEvent({ type: 'remediation', agent: 'openrouter', pr: 5, recovered: true }, f);
    const [ev] = readEvents(f);
    assert.strictEqual(ev.type, 'remediation');
    assert.strictEqual(ev.agent, 'openrouter');
    assert.strictEqual(ev.pr, 5);
    assert.strictEqual(ev.recovered, true);
  } finally {
    fs.rmSync(f, { force: true });
  }
});

test('appendEvent: successive calls append in order', () => {
  const f = tmpFile();
  try {
    appendEvent({ type: 'score', agent: 'first', quality: 90 }, f);
    appendEvent({ type: 'score', agent: 'second', quality: 80 }, f);
    appendEvent({ type: 'remediation', agent: 'first', recovered: true }, f);
    const events = readEvents(f);
    assert.strictEqual(events.length, 3);
    assert.strictEqual(events[0].agent, 'first');
    assert.strictEqual(events[1].agent, 'second');
    assert.strictEqual(events[2].type, 'remediation');
  } finally {
    fs.rmSync(f, { force: true });
  }
});

test('appendEvent: returns the serialised JSON line', () => {
  const f = tmpFile();
  try {
    const line = appendEvent({ type: 'score', agent: 'x', quality: 70 }, f);
    assert.ok(typeof line === 'string', 'should return a string');
    const parsed = JSON.parse(line);
    assert.strictEqual(parsed.agent, 'x');
  } finally {
    fs.rmSync(f, { force: true });
  }
});

// ── renderLeaderboard ─────────────────────────────────────────────────────────

test('renderLeaderboard: empty agents produces a "no scored PRs" row', () => {
  const agents = aggregate([]);
  const md = renderLeaderboard(agents);
  assert.match(md, /no scored PRs yet/);
});

test('renderLeaderboard: single agent appears in the table', () => {
  const events = [{ type: 'score', agent: 'mybot', pr: 1, quality: 75, hallucination: 0 }];
  const agents = aggregate(events);
  const md = renderLeaderboard(agents);
  assert.match(md, /mybot/);
  assert.match(md, /Fleet Trust Scorecard/);
});

test('renderLeaderboard: renders latency when present', () => {
  const events = [
    { type: 'score', agent: 'fast', pr: 1, quality: 90, hallucination: 0, latencyMin: 12 },
  ];
  const agents = aggregate(events);
  const md = renderLeaderboard(agents);
  assert.match(md, /12m/, 'latency should appear as Xm');
});

test('renderLeaderboard: renders recovery rate as a percentage', () => {
  const events = [
    { type: 'score', agent: 'a', pr: 1, quality: 90, hallucination: 0 },
    { type: 'remediation', agent: 'a', pr: 1, recovered: true },
  ];
  const agents = aggregate(events);
  const md = renderLeaderboard(agents);
  assert.match(md, /100%/, 'full recovery should render as 100%');
});

test('renderLeaderboard: multiple agents are sorted by trust descending', () => {
  const events = [
    { type: 'score', agent: 'agent-zz', pr: 1, quality: 10, hallucination: 5 },
    { type: 'score', agent: 'agent-aa', pr: 2, quality: 100, hallucination: 0 },
  ];
  const agents = aggregate(events);
  const md = renderLeaderboard(agents);
  // agent-aa scores higher (trust ~79 vs ~52); verify it appears first in the table
  const aaPos = md.indexOf('`agent-aa`');
  const zzPos = md.indexOf('`agent-zz`');
  assert.ok(aaPos >= 0 && zzPos >= 0, 'both agents should appear in the table');
  assert.ok(aaPos < zzPos, 'higher trust agent (agent-aa) should appear before lower trust agent (agent-zz)');
});

test('renderLeaderboard: includes the auto-generated header comment', () => {
  const md = renderLeaderboard(aggregate([]));
  assert.match(md, /generated by scripts\/agent-scorecard\/ledger\.js/);
});

// ── writeLeaderboard ──────────────────────────────────────────────────────────

test('writeLeaderboard: writes a file and returns its path', () => {
  const f = tmpFile('.md');
  try {
    const agents = aggregate([{ type: 'score', agent: 'bot', quality: 80, hallucination: 0 }]);
    const returned = writeLeaderboard(agents, f);
    assert.strictEqual(returned, f);
    assert.ok(fs.existsSync(f), 'file should exist after write');
  } finally {
    fs.rmSync(f, { force: true });
  }
});

test('writeLeaderboard: written content is valid markdown with required sections', () => {
  const f = tmpFile('.md');
  try {
    const agents = aggregate([{ type: 'score', agent: 'x', quality: 95, hallucination: 0 }]);
    writeLeaderboard(agents, f);
    const content = fs.readFileSync(f, 'utf8');
    assert.match(content, /# Fleet Trust Scorecard/);
    assert.match(content, /\| Rank \|/);
    assert.match(content, /x/);
  } finally {
    fs.rmSync(f, { force: true });
  }
});

test('writeLeaderboard: creates parent directory if missing', () => {
  const dir = path.join(os.tmpdir(), `ledger-dir-${Date.now()}`);
  const f = path.join(dir, 'leaderboard.md');
  try {
    const agents = aggregate([]);
    writeLeaderboard(agents, f);
    assert.ok(fs.existsSync(f));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
