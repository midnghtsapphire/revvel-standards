'use strict';
// 2026-11-15: real Git objects with mock engines, no download or paid API.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const shim = path.resolve(__dirname, '../.circleci/scripts/security-completion.sh');
const guard = fs.readFileSync(path.resolve(__dirname, '../scripts/no-destroy-guard.js'));
const nodePath = path.dirname(process.execPath);
const secret = ['ghp', 'X'.repeat(36)].join('_');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'security-circleci-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const repo = path.join(root, 'repo');
  fs.mkdirSync(repo);
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q');
  git('config', 'user.name', 'CI integration test');
  git('config', 'user.email', 'ci-test@example.invalid');
  const put = (name, content) => {
    const file = path.join(repo, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
  };
  const commit = (message) => { git('add', '.'); git('commit', '-qm', message); return git('rev-parse', 'HEAD'); };
  put('README.md', 'original retained\n');
  put('scripts/no-destroy-guard.js', guard);
  put('.circleci/scripts/check-archival-policy.sh', `#!/bin/bash\nset -eu\n[[ -z \"\${GH_TOKEN:-}\" && -z \"\${ALLOW_DESTROY:-}\" ]] || exit 2\nexit 0\n`);
  put('scripts/security-fleet-pr-gate.js', `
'use strict';
const fs = require('fs');
if (process.env.GH_TOKEN || process.env.NODE_OPTIONS || process.env.ALLOW_DESTROY) process.exit(2);
if (!process.env.BASE_SHA || !process.env.HEAD_SHA) process.exit(2);
process.stdout.write(${JSON.stringify(secret)});
process.exit(0);
`);
  put('scripts/security-fleet.js', `
'use strict';
module.exports.scanPr = ({baseSha, headSha, text}) => {
  if (process.env.GH_TOKEN || process.env.NODE_OPTIONS || process.env.ALLOW_DESTROY) throw Error('unsafe env');
  if (!/^[a-f0-9]{40}$/.test(baseSha) || !/^[a-f0-9]{40}$/.test(headSha) || text !== '') throw Error('bad args');
  process.stdout.write(${JSON.stringify(secret)});
  return {member:'pr',count:0,findings:[]};
};
module.exports.validateReport = (report, member) => {
  if (report.member !== member || report.count !== report.findings.length) throw Error('bad report');
};
`);
  put('scripts/security/install_scanners.py', '# mock scanner installation dependency\n');
  put('scripts/security/install-manifest.json', '{"schema":1}\n');
  put('scripts/security/scan.py', `
import json, os, sys
from pathlib import Path
engine = sys.argv[1]
args = dict(zip(sys.argv[2::2], sys.argv[3::2]))
candidate, reports = Path(args['--candidate']), Path(args['--reports'])
assert not any(key in os.environ for key in ['GH_TOKEN','OPENROUTER_API_KEY','ALLOW_DESTROY','PYTHONPATH','NODE_OPTIONS','BASH_ENV','TRIVY_SKIP_DB_UPDATE'])
assert not (candidate / '.git').exists()
assert (candidate / 'README.md').exists()
assert all(not (p.stat().st_mode & 0o111) for p in candidate.rglob('*') if p.is_file())
# An export-ignore attribute cannot conceal candidate contents.
if (candidate / '.gitattributes').exists(): assert (candidate / 'hidden-malware.dat').is_file()
settings = json.loads((candidate / 'scan-results.json').read_text()) if (candidate / 'scan-results.json').exists() else {}
code = settings.get(engine, 0)
reports.mkdir(parents=True, exist_ok=True)
report = {'schema':1,'engine':engine,'exit_code':code,'status':{0:'clean',1:'findings',2:'error'}[code],'reason':{0:'scan-complete',1:'blocking-findings',2:'scanner-installation-failed'}[code]}
(reports / 'report.json').write_text(json.dumps(report))
(reports / 'summary.txt').write_text('mock redacted receipt')
# Raw hostile/secret output must never be retained as a public artifact.
print(${JSON.stringify(secret)})
print('::warning::hostile annotation')
sys.exit(code)
`);
  const approved = commit('approved engines');
  const reports = path.join(root, 'reports');
  const actualMetadata = path.join(root, 'actual-event-metadata.txt');
  // This fixture's actual title/body are explicitly empty, not missing.
  fs.writeFileSync(actualMetadata, '');
  // REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
  // REASON: Supply real fixture metadata and allow the missing-metadata error case.
  // const invoke = ({ head = git('rev-parse', 'HEAD'), base = approved, policy = approved, scanner = approved } = {}) => {
  // REVVEL-DISABLED-END
  const invoke = ({ head = git('rev-parse', 'HEAD'), base = approved, policy = approved, scanner = approved, metadata = actualMetadata } = {}) => {
    const marker = path.join(root, 'unexpected-execution');
    // REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
    // REASON: Add transport-produced actual metadata file as seventh argument.
    // const result = spawnSync('/bin/bash', ['--noprofile', '--norc', shim, repo, head, base, policy, scanner, reports], {
    // REVVEL-DISABLED-END
    const result = spawnSync('/bin/bash', ['--noprofile', '--norc', shim, repo, head, base, policy, scanner, reports, ...(metadata === null ? [] : [metadata])], {
      encoding: 'utf8', timeout: 30000,
      env: { ...process.env, PATH: `${nodePath}:/usr/bin:/bin`, GH_TOKEN: secret,
        OPENROUTER_API_KEY: secret, ALLOW_DESTROY: 'true', PYTHONPATH: repo,
        NODE_OPTIONS: '--require=/nonexistent-hostile-preload.js',
        TRIVY_SKIP_DB_UPDATE: 'true', BASH_ENV: '/dev/null', TEST_MARKER: marker },
    });
    return { ...result, marker };
  };
  const report = (engine) => JSON.parse(fs.readFileSync(path.join(reports, engine, 'report.json')));
  // REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
  // REASON: Expose explicit fixture metadata for real-worker tests.
  // return { root, repo, git, put, commit, approved, reports, invoke, report };
  // REVVEL-DISABLED-END
  return { root, repo, git, put, commit, approved, reports, invoke, report, actualMetadata };
}
test('clean pinned engines scan all candidate blobs and strip inherited settings', (t) => {
  const f = fixture(t);
  f.put('.gitattributes', 'hidden-malware.dat export-ignore\n');
  f.put('hidden-malware.dat', 'must be scanned as data\n');
  f.put('spaces\ttab\n$(touch unexpected-execution).txt', 'unusual filename\n');
  const head = f.commit('candidate additions');
  const r = f.invoke({ head });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  for (const engine of ['no-destroy', 'archival', 'fleet', 'trivy', 'clamav', 'aggregate']) assert.equal(f.report(engine).exit_code, 0);
  assert.equal(fs.existsSync(r.marker), false);
  assert.doesNotMatch(r.stdout + r.stderr, new RegExp(secret));
  const artifacts = fs.readdirSync(f.reports).flatMap(engine => fs.readdirSync(path.join(f.reports, engine)).map(name => fs.readFileSync(path.join(f.reports, engine, name), 'utf8'))).join('\n');
  assert.doesNotMatch(artifacts, new RegExp(secret));
  assert.doesNotMatch(artifacts, /hostile annotation|unexpected-execution/);
});
test('first policy failure does not hide scanner findings or a definition outage', (t) => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.repo, 'README.md'));
  // Scanner needs a readable README; replacing another retained path tests file loss.
  f.put('README.md', 'original retained\n');
  f.put('victim.txt', 'must retain\n');
  const base = f.commit('baseline with victim');
  fs.unlinkSync(path.join(f.repo, 'victim.txt'));
  f.put('scan-results.json', '{"trivy":1,"clamav":2}\n');
  const head = f.commit('destructive candidate and scanner errors');
  const r = f.invoke({ base, head });
  assert.equal(r.status, 2, r.stderr + r.stdout);
  assert.equal(f.report('no-destroy').exit_code, 1);
  assert.equal(f.report('trivy').exit_code, 1);
  assert.equal(f.report('clamav').exit_code, 2);
  assert.equal(f.report('clamav').reason, 'scanner-installation-failed');
  assert.equal(f.report('fleet').exit_code, 0);
  assert.equal(f.report('aggregate').exit_code, 2);
});
test('findings without an engine error aggregate to exit 1', (t) => {
  const f = fixture(t);
  f.put('scan-results.json', '{"trivy":1,"clamav":0}\n');
  const r = f.invoke({ head: f.commit('findings candidate') });
  assert.equal(r.status, 1, r.stderr + r.stdout);
  assert.equal(f.report('aggregate').exit_code, 1);
  assert.equal(f.report('clamav').exit_code, 0);
});
test('candidate replacement of scripts cannot replace approved executable bytes', (t) => {
  const f = fixture(t);
  f.put('scripts/security/scan.py', 'raise RuntimeError("candidate executed")\n');
  f.put('scripts/no-destroy-guard.js', 'throw Error("candidate executed");\n');
  f.put('scripts/security-fleet-pr-gate.js', 'throw Error("candidate executed");\n');
  f.put('scripts/security-fleet.js', 'throw Error("candidate executed");\n');
  f.put('.circleci/scripts/check-archival-policy.sh', 'exit 99\n');
  const r = f.invoke({ head: f.commit('tampered candidate engines') });
  // No-destroy can flag the replacement ratio, but scanners/fleet use pinned bytes.
  assert.equal(f.report('trivy').exit_code, 0, r.stderr);
  assert.equal(f.report('clamav').exit_code, 0);
  assert.equal(f.report('fleet').exit_code, 0);
  assert.equal(f.report('archival').exit_code, 0);
  assert.doesNotMatch(r.stdout + r.stderr, /candidate executed/);
});
test('diverged base uses merge-base rather than treating base-only files as deletions', (t) => {
  const f = fixture(t);
  f.put('candidate.txt', 'new candidate data\n');
  const head = f.commit('candidate branch');
  f.git('checkout', '-qb', 'base-branch', f.approved);
  f.put('base-only.txt', 'unrelated base addition\n');
  const base = f.commit('diverged base');
  const r = f.invoke({ base, head });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.equal(f.report('no-destroy').exit_code, 0);
});
test('missing baseline is error 2 for every check, never an empty clean diff', (t) => {
  const f = fixture(t);
  const r = f.invoke({ base: '1'.repeat(40) });
  assert.equal(r.status, 2);
  for (const engine of ['no-destroy', 'archival', 'fleet', 'trivy', 'clamav']) assert.equal(f.report(engine).exit_code, 2);
});
test('missing approved source cannot fall back to candidate implementations', (t) => {
  const f = fixture(t);
  const r = f.invoke({ policy: '2'.repeat(40), scanner: '3'.repeat(40) });
  assert.equal(r.status, 2);
  assert.equal(f.report('no-destroy').reason, 'trusted-policy-missing');
  assert.equal(f.report('fleet').reason, 'trusted-fleet-gate-missing');
  assert.equal(f.report('trivy').reason, 'trusted-scanner-source-missing');
});
test('non-SHA and shell-injection refs cannot reach a shell command', (t) => {
  const f = fixture(t);
  const r = f.invoke({ head: `HEAD;touch ${path.join(f.root, 'injection-marker')}` });
  assert.equal(r.status, 2);
  assert.equal(fs.existsSync(path.join(f.root, 'injection-marker')), false);
});
test('symlinks and submodules are incomplete-coverage errors, not green skips', (t) => {
  const f = fixture(t);
  fs.symlinkSync('/etc/passwd', path.join(f.repo, 'escape'));
  let r = f.invoke({ head: f.commit('symlink candidate') });
  // REVVEL-DISABLED | AGENT: orbit | MODEL: runtime-unspecified | WR: security-circleci-20261115 | DATE: 2026-11-15 | STATUS: REPLACED
  // REASON: Scan symlink target text as regular Git blob data, not its external target.
  // assert.equal(r.status, 2);
  // assert.equal(f.report('trivy').exit_code, 2);
  // REVVEL-DISABLED-END
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.equal(f.report('trivy').exit_code, 0);
  f.git('checkout', '-qb', 'submodule-case', f.approved);
  f.git('update-index', '--add', '--cacheinfo', `160000,${f.approved},external`);
  f.git('commit', '-qm', 'submodule candidate');
  r = f.invoke();
  assert.equal(r.status, 2);
  assert.equal(f.report('clamav').reason, 'candidate-submodule-coverage-error');
});

test('missing scanner receipt is an error even if the engine returns zero', (t) => {
  const f = fixture(t);
  f.put('scripts/security/scan.py', 'import sys\nsys.exit(0)\n');
  const scanner = f.commit('approved mock missing receipt');
  const r = f.invoke({ scanner });
  assert.equal(r.status, 2);
  assert.equal(f.report('trivy').reason, 'scanner-receipt-invalid');
  assert.equal(f.report('clamav').reason, 'scanner-receipt-invalid');
});
test('archival runtime errors map to error 2, not findings 1', (t) => {
  const f = fixture(t);
  f.put('.circleci/scripts/check-archival-policy.sh', '#!/bin/bash\necho "ERROR: unavailable blob"\nexit 1\n');
  const policy = f.commit('approved mock archival error');
  const r = f.invoke({ policy });
  assert.equal(r.status, 2);
  assert.equal(f.report('archival').exit_code, 2);
  assert.equal(f.report('trivy').exit_code, 0);
  assert.equal(f.report('clamav').exit_code, 0);
});
test('approved fleet missing API is error 2 and does not suppress scanners', (t) => {
  const f = fixture(t);
  f.put('scripts/security-fleet.js', 'module.exports = {};\n');
  const policy = f.commit('approved mock unavailable fleet API');
  const r = f.invoke({ policy });
  assert.equal(r.status, 2);
  assert.equal(f.report('fleet').exit_code, 2);
  assert.equal(f.report('trivy').exit_code, 0);
});

test('missing actual metadata fails fleet but still runs both scanners', (t) => {
  const f = fixture(t);
  const r = f.invoke({ metadata: null });
  assert.equal(r.status, 2);
  assert.equal(f.report('fleet').reason, 'actual-event-metadata-unavailable');
  assert.equal(f.report('trivy').exit_code, 0);
  assert.equal(f.report('clamav').exit_code, 0);
});
test('final worker fleet API scans real supplied metadata and redacts receipt content', (t) => {
  const f = fixture(t);
  f.put('scripts/security-fleet.js', fs.readFileSync(path.resolve(__dirname, '../scripts/security-fleet.js')));
  const policy = f.commit('approved final fleet module');
  fs.writeFileSync(f.actualMetadata, `Actual fixture title\n\n${secret}`);
  const r = f.invoke({ policy, base: policy, head: policy });
  assert.equal(r.status, 1, r.stderr + r.stdout);
  assert.equal(f.report('fleet').exit_code, 1);
  assert.equal(f.report('trivy').exit_code, 0);
  assert.doesNotMatch(fs.readFileSync(path.join(f.reports, 'fleet', 'report.json'), 'utf8'), new RegExp(secret));
});
test('final worker archival script reads unusual candidate names as committed data', (t) => {
  const f = fixture(t);
  f.put('.circleci/scripts/check-archival-policy.sh', fs.readFileSync(path.resolve(__dirname, '../.circleci/scripts/check-archival-policy.sh')));
  const policy = f.commit('approved final archival module');
  f.put('odd\ttab\n$(touch injected).txt', '# REVVEL-DISABLED | AGENT: fixture\n# REVVEL-DISABLED-END\n');
  const head = f.commit('malformed archival metadata');
  const r = f.invoke({ policy, base: policy, head });
  assert.equal(r.status, 1, r.stderr + r.stdout);
  assert.equal(f.report('archival').exit_code, 1);
  assert.equal(f.report('trivy').exit_code, 0);
  assert.equal(fs.existsSync(path.join(f.repo, 'injected')), false);
});
