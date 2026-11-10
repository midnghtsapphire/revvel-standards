import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { prosecuteLocal } from '../action/local-prosecution.mjs';

const diff = 'diff --git a/a.js b/a.js\n--- a/a.js\n+++ b/a.js\n@@ -0,0 +1 @@\n+const answer = 42;\n';
function fixture(check = {}) {
  const workspace = mkdtempSync(join(tmpdir(), 'revvel-prosecution-'));
  return { version: 1, workspace, receipts: join(workspace, 'receipts'), checks: [{ name: 'actual-subprocess', argv: [process.execPath, '-e', 'process.exit(0)'], timeout_ms: 3000, ...check }] };
}
test('executes real fixed argv, records measured output, advisory snippets cannot execute', async () => {
  const policy = fixture();
  const result = await prosecuteLocal({ head: 'one', diff, argv: ['imaginary-command'], comments: [{ user: { login: 'reviewer', type: 'User' }, body: '```suggestion\nprocess.exit(123);\n```' }] }, policy);
  assert.equal(result.status, 'passed');
  assert.equal(result.advisory.length, 1);
  assert.equal(result.checks[0].exit_code, 0);
  assert.equal(result.github_calls, 0);
  assert.equal(result.provider_calls, 0);
  assert.deepEqual(JSON.parse(readFileSync(result.report_path)), result);
});
test('conflicts persist as stable repair identity across heads and fresh run receipts', async () => {
  const policy = fixture();
  const packet = { head: 'one', diff: diff + '+<<<<<<< HEAD\n+broken\n+=======\n+other\n+>>>>>>> branch\n' };
  const first = await prosecuteLocal(packet, policy);
  const second = await prosecuteLocal({ ...packet, head: 'two' }, policy);
  assert.equal(first.status, 'failed');
  assert.notEqual(first.run_id, second.run_id);
  assert.deepEqual(first.findings.map(f => f.id), second.findings.map(f => f.id));
  const repairs = readdirSync(join(policy.receipts, 'repair-requests'));
  assert.equal(repairs.length, first.findings.length);
  assert.equal(JSON.parse(readFileSync(first.findings[0].repair_request)).first_run, first.run_id);
});
test('nonzero subprocess fails and a subsequent healthy run is independent', async () => {
  const policy = fixture({ argv: [process.execPath, '-e', 'process.exit(7)'] });
  const failed = await prosecuteLocal({ head: 'one', diff }, policy);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.checks[0].exit_code, 7);
  const passed = await prosecuteLocal({ head: 'two', diff }, { ...policy, checks: fixture().checks });
  assert.equal(passed.status, 'passed');
});
test('timeout stops real process and fails closed', async () => {
  // 2026-11-10 Codex, #18313: retain the old fixture for history. Its 50ms
  // timeout could terminate before startup, and a 5s wall budget measured host
  // taskkill latency rather than whether the entire spawned tree was stopped.
  // const policy = fixture({ argv: [process.execPath, '-e', 'setInterval(() => {}, 1000)'], timeout_ms: 50 });
  const policy = fixture();
  const pidsPath = join(policy.workspace, 'timeout-tree-pids.json');
  const script = `const {spawn}=require('node:child_process');
    const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});
    require('node:fs').writeFileSync(${JSON.stringify(pidsPath)},JSON.stringify([process.pid,child.pid]));
    setInterval(()=>{},1000);`;
  policy.checks[0] = { ...policy.checks[0], argv: [process.execPath, '-e', script], timeout_ms: 2000 };
  const report = await prosecuteLocal({ head: 'one', diff }, policy);
  assert.equal(report.status, 'failed');
  assert.equal(report.checks[0].status, 'timed_out');
  assert.notEqual(report.checks[0].exit_code, 0);
  // Retired 2026-11-10: cleanup took 5.6s under load despite successful kill.
  // assert.ok(report.checks[0].duration_ms < 5000);
  const pids = JSON.parse(readFileSync(pidsPath, 'utf8'));
  assert.equal(pids.length, 2, 'fixture must start both parent and descendant');
  for (const pid of pids) {
    assert.ok(Number.isInteger(pid) && pid > 0);
    assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH', `timed-out process ${pid} must be terminated`);
  }
});
test('exclusive overlap lock rejects execution and retains existing owner', async () => {
  const policy = fixture();
  const lock = join(policy.receipts, 'prosecution.lock');
  mkdirSync(lock, { recursive: true });
  writeFileSync(join(lock, 'owner.json'), 'original-owner');
  const report = await prosecuteLocal({ head: 'one', diff }, policy);
  assert.equal(report.status, 'overlap_rejected');
  assert.equal(report.checks.length, 0);
  assert.equal(readFileSync(join(lock, 'owner.json'), 'utf8'), 'original-owner');
});
test('missing diff, checkless policy and cwd escape do not pass', async () => {
  const missing = await prosecuteLocal({ head: 'one', diff: '' }, fixture());
  assert.equal(missing.status, 'failed');
  assert.match(missing.error, /nonempty diff/);
  const policy = fixture();
  const unchecked = await prosecuteLocal({ head: 'one', diff }, { ...policy, checks: [] });
  assert.equal(unchecked.status, 'failed');
  const escaped = await prosecuteLocal({ head: 'one', diff }, { ...policy, checks: [{ ...policy.checks[0], cwd: '..' }] });
  assert.match(escaped.error, /escapes workspace/);
});
test('CLI reads HULL stdin packet and emits parseable single JSON receipt', () => {
  const policy = fixture();
  const policyPath = join(policy.workspace, 'policy.json');
  writeFileSync(policyPath, JSON.stringify(policy));
  const execution = spawnSync(process.execPath, [fileURLToPath(new URL('../action/run-prosecutor.mjs', import.meta.url)), '--local', '--policy', policyPath], { input: JSON.stringify({ head: 'cli', diff }), encoding: 'utf8' });
  assert.equal(execution.status, 0, execution.stderr);
  assert.equal(JSON.parse(execution.stdout).status, 'passed');
});
