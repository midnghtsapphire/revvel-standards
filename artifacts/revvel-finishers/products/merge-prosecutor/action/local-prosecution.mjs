/** Local adapter for the existing prosecutor, 2026-11-10, #18313.
 * The operator policy owns every executable/path. Event text is data only.
 * This is an execution guard, not an OS sandbox for hostile checked-out code.
 */
import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync, existsSync, realpathSync } from 'node:fs';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { detectUnresolvedConflicts, detectDuplicatedBlocks, detectUnimplementedSuggestions } from './run-prosecutor.mjs';

const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function inside(root, child) {
  const target = realpathSync(resolve(root, child));
  const distance = relative(root, target);
  if (distance === '..' || distance.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(distance)) {
    throw new Error('Policy check cwd escapes workspace');
  }
  return target;
}

async function execute(check, workspace, outputPath) {
  if (!check || typeof check.name !== 'string' || !check.name.trim()) throw new Error('Check requires a name');
  if (!Array.isArray(check.argv) || !check.argv.length || check.argv.some(v => typeof v !== 'string' || !v || v.includes('\0'))) {
    throw new Error('Check argv must be a nonempty string array');
  }
  if (/\.(cmd|bat)$/i.test(check.argv[0])) throw new Error('Use node and npm-cli.js instead of a batch wrapper');
  const timeout = check.timeout_ms;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 3600000) throw new Error('Check timeout_ms must be 1..3600000');
  const cwd = inside(workspace, check.cwd || '.');
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) =>
    ['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'PATHEXT'].includes(key.toUpperCase())));
  writeFileSync(outputPath, '', { flag: 'wx' });
  return new Promise(resolveResult => {
    const started = Date.now();
    const output = createHash('sha256');
    let bytes = 0;
    let timedOut = false;
    let error = null;
    const child = spawn(check.argv[0], check.argv.slice(1), { cwd, env, shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let retained = 0;
    const limit = 1024 * 1024;
    const capture = data => {
      bytes += data.length;
      output.update(data);
      // Retain bounded local diagnostic output, never print child secrets in
      // the machine-readable report. Hash covers the full stream, even past cap.
      const part = data.subarray(0, Math.max(0, limit - retained));
      if (part.length) { appendFileSync(outputPath, part); retained += part.length; }
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.on('error', err => { error = err.code || err.message; });
    const timer = setTimeout(() => {
      timedOut = true;
      // Stop only our own process tree, retaining the failing timeout receipt.
      if (child.pid) {
        if (process.platform === 'win32') {
          try { execFileSync(join(process.env.SystemRoot || process.env.SYSTEMROOT, 'System32', 'taskkill.exe'), ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' }); } catch { child.kill(); }
        } else {
          try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill(); }
        }
      }
    }, timeout);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolveResult({ name: check.name, status: timedOut ? 'timed_out' : code === 0 && !error ? 'passed' : 'failed', exit_code: code, signal, error,
        duration_ms: Date.now() - started, output_bytes: bytes, output_sha256: output.digest('hex'), output_path: outputPath, output_truncated: bytes > retained });
    });
  });
}

export async function prosecuteLocal(packet, policy) {
  if (!policy || policy.version !== 1 || !isAbsolute(policy.workspace || '') || !isAbsolute(policy.receipts || '')) throw new Error('Policy requires version 1 and absolute workspace/receipts');
  const workspace = realpathSync(policy.workspace);
  const receipts = resolve(policy.receipts);
  mkdirSync(receipts, { recursive: true });
  const report = { schema: 'revvel.prosecution.v1', run_id: randomUUID(), started_at: new Date().toISOString(), status: 'failed',
    policy_sha256: hash(policy), findings: [], advisory: [], checks: [], provider_calls: 0, github_calls: 0 };
  const lock = join(receipts, 'prosecution.lock');
  let ownsLock = false;
  try {
    try { mkdirSync(lock); ownsLock = true; } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      report.status = 'overlap_rejected';
      throw new Error('Another prosecution owns the exclusive lock; inspect owner before manual recovery');
    }
    writeFileSync(join(lock, 'owner.json'), JSON.stringify({ run_id: report.run_id, pid: process.pid, started_at: report.started_at }), { flag: 'wx' });
    if (!packet || typeof packet !== 'object' || Array.isArray(packet) || typeof packet.diff !== 'string' || !packet.diff.trim()) throw new Error('Local packet requires a nonempty diff');
    if (!/^diff --git .+ .+$/m.test(packet.diff) || !/^@@ /m.test(packet.diff)) throw new Error('Local packet requires a unified diff with a file header and hunk');
    if (typeof packet.head !== 'string' || !packet.head.trim()) throw new Error('Local packet requires head identity');
    if (packet.comments !== undefined && !Array.isArray(packet.comments)) throw new Error('Packet comments must be an array');
    if (!Array.isArray(policy.checks) || policy.checks.length === 0) throw new Error('Policy must configure at least one actual check');
    report.input_sha256 = hash(packet);
    report.head = packet.head;
    for (const [rule, values] of [
      ['unresolved_conflict', detectUnresolvedConflicts(packet.diff)],
      ['duplicate_block', detectDuplicatedBlocks(packet.diff)]
    ]) for (const evidence of values) report.findings.push({ id: hash({ rule, evidence }).slice(0, 24), rule, evidence });
    // A reviewer snippet is a hypothesis to investigate, never executable policy
    // or proof that an alternative implementation must be copied verbatim.
    report.advisory = detectUnimplementedSuggestions(packet.diff, packet.comments || []).map(evidence => ({ rule: 'review_suggestion', evidence }));
    for (const check of policy.checks) {
      const result = await execute(check, workspace, join(receipts, `${report.run_id}.check-${report.checks.length}.log`));
      report.checks.push(result);
      if (result.status !== 'passed') report.findings.push({ id: hash({ rule: 'check_failed', workspace, name: check.name, argv: check.argv, cwd: check.cwd || '.' }).slice(0, 24), rule: 'check_failed', evidence: result });
    }
    // Stable repair requests are created exclusively and never overwrite history.
    // The head belongs in the receipt, not the finding identity: a persisting
    // defect on a new head must not flood the work queue with duplicate requests.
    const repairs = join(receipts, 'repair-requests');
    mkdirSync(repairs, { recursive: true });
    for (const finding of report.findings) {
      const path = join(repairs, `${finding.id}.json`);
      if (!existsSync(path)) {
        try { writeFileSync(path, JSON.stringify({ schema: 'revvel.prosecution-repair.v1', first_run: report.run_id, finding }, null, 2) + '\n', { flag: 'wx' }); }
        catch (error) { if (error.code !== 'EEXIST') throw error; }
      }
      finding.repair_request = path;
    }
    report.status = report.findings.length ? 'failed' : 'passed';
  } catch (error) {
    report.error = error.message;
  } finally {
    report.finished_at = new Date().toISOString();
    report.report_path = join(receipts, `${report.run_id}.report.json`);
    // Exclusive receipt creation is the last operation before releasing the lock.
    // Lock owner file stays as history outside the lock directory.
    try { writeFileSync(report.report_path, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); }
    finally {
      if (ownsLock) {
        // Rename retains the owner record while freeing the fixed lock name.
        const { renameSync } = await import('node:fs');
        renameSync(lock, join(receipts, `${report.run_id}.lock-owner`));
      }
    }
  }
  return report;
}

export async function localCLI(args) {
  const policyIndex = args.indexOf('--policy');
  const packetIndex = args.indexOf('--packet');
  if (policyIndex < 0 || !args[policyIndex + 1]) throw new Error('--local requires --policy path; packet defaults to stdin');
  const packetText = readFileSync(packetIndex < 0 ? 0 : args[packetIndex + 1], 'utf8');
  const report = await prosecuteLocal(JSON.parse(packetText), JSON.parse(readFileSync(args[policyIndex + 1], 'utf8')));
  console.log(JSON.stringify(report));
  return report.status === 'passed' ? 0 : 1;
}
