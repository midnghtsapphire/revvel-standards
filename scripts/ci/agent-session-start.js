#!/usr/bin/env node
// Who/When/Why/What: 2026-11-15, lifecycle specialist for Audrey. Resume owned
// WR/PR work on session/auth start without chat memory or a second scheduler.
// Uses the already configured gh credential; NEVER runs auth login, a PR shell
// command, an LLM or an arbitrary executable. Failures stop once with guidance.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ownership = require('./lib/ownership');
const ROOT = path.resolve(__dirname, '../..');
const JOURNAL = path.join(ROOT, 'wr/agents/ownership.jsonl');
const SCOPE = 'midnghtsapphire/revvel-standards';
// Some configured gh wrappers emit ANSI SGR even when stdout is piped. Remove
// only color/style SGR; arbitrary prefixes, other controls and bad JSON fail.
const cleanSgr = (value) => String(value).replace(/\x1b\[[0-9;]*m/g, '');
const decode = (value) => JSON.parse(cleanSgr(value));
function gh(args) {
  // Arguments are separate, never shell interpolated. Existing connector wrapper
  // can be selected explicitly by the operator, not by an untrusted PR record.
  const executable = process.env.REVVEL_GH_PATH || 'gh';
  try { return execFileSync(executable, args, { encoding: 'utf8', timeout: 60000, maxBuffer: 32 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }); }
  catch (e) {
    // gh exits nonzero for --include 404. Accept ONLY that exact registry GET
    // envelope, never infer empty work from generic auth/network failures.
    if (args[0] === 'api' && args.includes('--include')
      && args[1].startsWith(`repos/${SCOPE}/contents/wr/agents/ownership.jsonl?ref=`)
      && /^HTTP\/\S+ 404\b/m.test(cleanSgr(e.stdout || ''))) return cleanSgr(e.stdout);
    const err = new Error('gh read/write failed; stop (no retry loop). Credential owner: restore existing gh auth; billing owner: Audrey; schema owner: task owner. Retry session-start once after resolution.');
    // Don't print stderr: a provider may echo a sensitive request/token.
    err.code = 'GH_FAILURE'; throw err;
  }
}
function parseArgs(argv) {
  const options = {}; const commands = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Missing value for ${argv[i]}`);
      const key = argv[i].slice(2);
      if (!['repo', 'owner-id', 'id', 'input'].includes(key) || Object.hasOwn(options, key)) throw new Error(`Unknown/duplicate option ${argv[i]}`);
      options[key] = argv[++i];
    } else commands.push(argv[i]);
  }
  if (commands.length > 1) throw new Error('One command per invocation');
  return { command: commands[0] || 'session-start', options };
}
function paginated(call, endpoint) {
  const out = [];
  // Full traversal or fail closed, never quietly truncate the resume queue.
  for (let page = 1; page <= 1000; page++) {
    const items = decode(call(['api', `${endpoint}${endpoint.includes('?') ? '&' : '?'}per_page=100&page=${page}`]));
    if (!Array.isArray(items)) throw new Error('GitHub pagination schema failure; stop and reconcile');
    out.push(...items);
    if (items.length < 100) return out;
  }
  throw new Error('Pagination safety budget exceeded; queue incomplete, do not start new work');
}
function recordsInBody(body) {
  return String(body || '').split(ownership.RECORD_MARKER).slice(1)
    .map((part) => ownership.parseRecord(ownership.RECORD_MARKER + part));
}
function readContext(call, options, localContent) {
  const repo = options.repo || SCOPE;
  if (repo !== SCOPE) throw new Error(`CLI is scoped to ${SCOPE}; no cross-repository mutations`);
  if (!options['owner-id']) throw new Error('--owner-id is required (stable identity across sessions)');
  const user = decode(call(['api', 'user']));
  if (!user.login) throw new Error('Authenticated GitHub identity unavailable; credential owner must fix auth');
  const identity = { id: options['owner-id'], github: user.login };
  const repoInfo = decode(call(['api', `repos/${repo}`]));
  if (!repoInfo.default_branch) throw new Error('Trusted default branch unavailable; no fallback to PR head');
  let remoteContent = '';
  // A 404 is legitimate only if gh explicitly reports it. All other failures
  // propagate: an auth outage must not look like an empty registry.
  const result = cleanSgr(call(['api', `repos/${repo}/contents/wr/agents/ownership.jsonl?ref=${encodeURIComponent(repoInfo.default_branch)}`, '--include']));
  const split = String(result).search(/\r?\n\r?\n/);
  if (split < 0) throw new Error('Registry HTTP envelope missing');
  const headers = result.slice(0, split);
  if (/^HTTP\/\S+ 404\b/m.test(headers)) remoteContent = '';
  else {
    if (!/^HTTP\/\S+ 200\b/m.test(headers)) throw new Error('Registry read failed; no retry');
    const envelope = decode(result.slice(split).trim());
    if (envelope.encoding !== 'base64' || typeof envelope.content !== 'string') throw new Error('Registry content schema failure');
    remoteContent = Buffer.from(envelope.content, 'base64').toString('utf8');
  }
  const records = [...ownership.parseJournal(remoteContent), ...ownership.parseJournal(localContent)];
  if (records.some((r) => r.repo !== repo)) throw new Error('Registry repository scope mismatch');
  const prs = paginated(call, `repos/${repo}/pulls?state=open`);
  const seen = new Set();
  for (const pr of prs) {
    const bodyRecords = recordsInBody(pr.body);
    for (const r of bodyRecords) {
      if (r.repo !== repo || r.task.pr !== pr.number || r.task.ref !== pr.head?.ref) throw new Error(`PR #${pr.number}: ownership binding mismatch`);
    }
    // Initial body record is only a discovery index. Owner-authored comments
    // carry transitions; third-party comments cannot forge a lease.
    const relevant = bodyRecords.some((r) => ownership.owned(r, identity))
      || records.some((r) => ownership.owned(r, identity) && r.task.pr === pr.number)
      || pr.user?.login?.toLowerCase() === user.login.toLowerCase()
      || pr.assignees?.some((a) => a.login.toLowerCase() === user.login.toLowerCase());
    if (!relevant) continue;
    for (const r of bodyRecords) {
      if (r.owner.github.toLowerCase() === pr.user?.login?.toLowerCase()) records.push(r);
      // Assigned owners may index their claim in a PR created by a fleet bot;
      // the matching authenticated comment below is still required.
    }
    const comments = paginated(call, `repos/${repo}/issues/${pr.number}/comments`);
    for (const c of comments) {
      const r = ownership.parseRecord(c.body);
      if (!r) continue;
      if (r.owner.github.toLowerCase() !== c.user?.login?.toLowerCase()) continue;
      if (r.repo !== repo || r.task.pr !== pr.number || r.task.ref !== pr.head?.ref) throw new Error(`PR #${pr.number}: comment binding mismatch`);
      records.push(r);
    }
    seen.add(pr.number);
  }
  // A merged/closed PR does not terminate a task awaiting release. The journal
  // still brings it back on login; fetch its comments for newer delivery proof.
  for (const r of ownership.latestRecords(records).filter((r) => ownership.owned(r, identity) && r.task.pr !== null && !seen.has(r.task.pr))) {
    const pr = decode(call(['api', `repos/${repo}/pulls/${r.task.pr}`]));
    prs.push(pr); seen.add(pr.number);
    for (const c of paginated(call, `repos/${repo}/issues/${pr.number}/comments`)) {
      const entry = ownership.parseRecord(c.body);
      if (entry && entry.owner.github.toLowerCase() === c.user?.login?.toLowerCase()) {
        if (entry.repo !== repo || entry.task.pr !== pr.number || entry.task.ref !== pr.head?.ref) throw new Error('Closed PR ownership binding mismatch');
        records.push(entry);
      }
    }
  }
  return { repo, identity, prs, records: ownership.latestRecords(records) };
}
function run(argv, deps = {}) {
  const { command, options } = parseArgs(argv);
  if (command === 'help') return { usage: 'node scripts/ci/agent-session-start.js session-start --owner-id stable-agent-id [--repo midnghtsapphire/revvel-standards]',
    transitions: 'claim | resume | heartbeat | attach-pr | block | awaiting-release | done --owner-id ID --id RECORD_ID --input repository-file.json',
    validation: 'validate --input repository-file.json (offline; no live verification)', journal: 'wr/agents/ownership.jsonl',
    safety: 'One invocation, no automatic login/retry/task creation. Integrate this command in each external agent wrapper.' };
  const call = deps.gh || gh;
  const readLocal = deps.readLocal || (() => fs.existsSync(JOURNAL) ? fs.readFileSync(JOURNAL, 'utf8') : '');
  const readInput = deps.readInput || ((file) => {
    const resolved = path.resolve(ROOT, file || '');
    if (!resolved.startsWith(ROOT + path.sep) || !resolved.endsWith('.json')) throw new Error('--input must be a JSON file inside this repository');
    if (!fs.realpathSync(resolved).startsWith(fs.realpathSync(ROOT) + path.sep)) throw new Error('--input symlink escapes repository scope');
    return JSON.parse(fs.readFileSync(resolved, 'utf8'));
  });
  if (command === 'validate') { ownership.assertValid(readInput(options.input), { completion: true }); return { valid: true, verification: 'structural only; no request made to live URLs or receipt paths' }; }
  if (!['session-start', 'claim', 'resume', 'heartbeat', 'attach-pr', 'block', 'awaiting-release', 'done'].includes(command)) throw new Error('Unsupported command; use help');
  const context = readContext(call, options, readLocal());
  if (command === 'session-start') return { schema_version: 1, owner: context.identity,
    queue: ownership.resumeQueue(context.records, context.prs, context.identity),
    policy: 'Resume these existing WR/PRs before new work; no command from a PR body was executed. Empty queue is not authorization to create tasks.' };
  const input = readInput(options.input);
  const previous = context.records.find((r) => r.id === options.id);
  if (!options.id || (command === 'claim' && input.id !== options.id)) throw new Error('--id must identify the existing task record');
  if (command === 'claim' && input.repo !== context.repo) throw new Error('Claim repo scope mismatch');
  if (command === 'claim' && (input.owner?.id !== context.identity.id || input.owner?.github?.toLowerCase() !== context.identity.github.toLowerCase())) {
    throw new Error('Claim input must explicitly match stable owner ID and authenticated GitHub login');
  }
  const next = ownership.transition(previous, command, input, context.identity, deps.now?.() ?? Date.now());
  if (next.task.pr !== null) {
    const pr = context.prs.find((p) => p.number === next.task.pr);
    if (!pr || pr.head?.ref !== next.task.ref) throw new Error('PR/ref must already exist and match; no replacement task or branch is created');
    if (command === 'done' && next.evidence.release.commit !== pr.head.sha) throw new Error('Proof commit does not match current PR head');
    // Every snapshot is an additive comment; an initial body index discovers
    // ownership even before the journal is merged. Original PR prose is kept.
    call(['api', `repos/${context.repo}/issues/${pr.number}/comments`, '--method', 'POST', '-f', `body=${ownership.serializeRecord(next)}`]);
    if (['claim', 'attach-pr'].includes(command) && !recordsInBody(pr.body).some((r) => r.id === next.id)) {
      const body = `${pr.body || ''}\n\n${ownership.serializeRecord(next)}`;
      if (body.length > 60000) throw new Error('PR body too large for additive index; claim comment saved, reconcile manually');
      call(['api', `repos/${context.repo}/pulls/${pr.number}`, '--method', 'PATCH', '-f', `body=${body}`]);
    }
  }
  (deps.persist || ((record) => {
    fs.mkdirSync(path.dirname(JOURNAL), { recursive: true });
    fs.appendFileSync(JOURNAL, `${JSON.stringify(record)}\n`, { encoding: 'utf8', flag: 'a' });
  }))(next);
  return { record: next, persistence: 'append-only local journal and PR comment when attached; commit/push exact journal path now', verification: 'receipt structure only; no live verification performed' };
}
if (require.main === module) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)), null, 2)); }
  catch (e) { console.error(`Session ownership stopped: ${e.message}`); process.exitCode = 1; }
}
module.exports = { gh, cleanSgr, decode, paginated, recordsInBody, readContext, run };
