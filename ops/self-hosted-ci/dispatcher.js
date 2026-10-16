'use strict';
// Self-hosted CI dispatcher: runs this repo's .github/workflows/*.yml on our own
// machine with nektos/act, triggered by GitHub webhooks, and reports results back
// as commit statuses. Nothing here uses GitHub Actions minutes or runners, so an
// Actions billing lock does not stop it. See README.md in this directory.

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const YAML = require('yaml');

// Events that GitHub Actions itself emits. With Actions off they only arrive as
// echoes of our own status posts or of other apps, and running workflows on them
// risks feedback loops, so they are dropped unless explicitly allowed.
const LOOP_PRONE_EVENTS = new Set(['check_suite', 'check_run', 'workflow_run', 'status', 'workflow_job']);

// GitHub's default activity types when a workflow lists the event without `types:`.
const DEFAULT_TYPES = {
  pull_request: ['opened', 'synchronize', 'reopened'],
  pull_request_target: ['opened', 'synchronize', 'reopened'],
};

function loadConfig(env = process.env) {
  const required = ['WEBHOOK_SECRET', 'GITHUB_TOKEN_FILE', 'REPO_FULL_NAME'];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) throw new Error(`missing required env: ${missing.join(', ')}`);
  return {
    port: Number(env.PORT || 8080),
    webhookSecret: env.WEBHOOK_SECRET,
    adminTokenFile: env.ADMIN_TOKEN_FILE || '',
    githubTokenFile: env.GITHUB_TOKEN_FILE,
    secretsFile: env.SECRETS_FILE || '',
    repo: env.REPO_FULL_NAME,
    workDir: env.WORK_DIR || path.join(os.tmpdir(), 'self-hosted-ci'),
    logDir: env.LOG_DIR || path.join(os.tmpdir(), 'self-hosted-ci', 'logs'),
    logBaseUrl: env.LOG_BASE_URL || '',
    actBin: env.ACT_BIN || 'act',
    runnerImage: env.RUNNER_IMAGE || 'catthehacker/ubuntu:act-latest',
    maxConcurrency: Math.max(1, Number(env.MAX_CONCURRENCY || 2)),
    jobTimeoutMs: Number(env.JOB_TIMEOUT_MIN || 30) * 60_000,
    allowForkPrs: env.ALLOW_FORK_PRS === 'true',
    ignoreSenders: splitList(env.IGNORE_SENDERS),
    allowLoopEvents: splitList(env.ALLOW_LOOP_EVENTS),
    onlyWorkflows: splitList(env.ONLY_WORKFLOWS),
    skipWorkflows: splitList(env.SKIP_WORKFLOWS),
    statusPrefix: env.STATUS_PREFIX || 'self-hosted',
  };
}

function splitList(v) {
  return (v || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function readSecretFile(p) {
  return fs.readFileSync(p, 'utf8').trim();
}

// Hosts like Railway can only inject secrets as environment variables. Move any
// SHCI_* secret into a mode-600 file (the form loadConfig expects) and drop it
// from the environment so workflow steps and act never inherit it.
const ENV_SECRETS = {
  SHCI_GITHUB_TOKEN: 'GITHUB_TOKEN_FILE',
  SHCI_ADMIN_TOKEN: 'ADMIN_TOKEN_FILE',
  SHCI_SECRETS: 'SECRETS_FILE',
};

function materializeEnvSecrets(env, dir) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  for (const [from, to] of Object.entries(ENV_SECRETS)) {
    if (!env[from] || env[to]) continue;
    const file = path.join(dir, from.toLowerCase());
    fs.writeFileSync(file, env[from].replace(/\\n/g, '\n') + '\n', { mode: 0o600 });
    env[to] = file;
    delete env[from];
  }
  return env;
}

// act reads GITHUB_TOKEN / GH_TOKEN from its own environment to download actions;
// a stale or placeholder value there breaks every run. The real token reaches
// workflows through --secret-file instead.
function actEnv(env = process.env) {
  const out = { ...env };
  delete out.GITHUB_TOKEN;
  delete out.GH_TOKEN;
  return out;
}

function verifySignature(secret, rawBody, header) {
  if (!header || !header.startsWith('sha256=')) return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
  const got = Buffer.from(header);
  return got.length === expected.length && crypto.timingSafeEqual(got, expected);
}

function normalizeOn(on) {
  if (!on) return {};
  if (typeof on === 'string') return { [on]: {} };
  if (Array.isArray(on)) return Object.fromEntries(on.map((e) => [e, {}]));
  return Object.fromEntries(Object.entries(on).map(([k, v]) => [k, v || {}]));
}

function loadWorkflows(repoDir) {
  const dir = path.join(repoDir, '.github', 'workflows');
  return fs
    .readdirSync(dir)
    .filter((f) => /\.ya?ml$/.test(f))
    .sort()
    .map((file) => {
      const doc = YAML.parse(fs.readFileSync(path.join(dir, file), 'utf8')) || {};
      return { file, name: doc.name || file, on: normalizeOn(doc.on) };
    });
}

function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

// GitHub filter semantics: patterns apply in order, the last match wins, and a
// leading `!` excludes. `*-ignore` lists exclude anything they match.
function passesFilter(values, include, ignore) {
  const matchOne = (v) => {
    let ok = !include;
    for (const pat of include || []) {
      const neg = pat.startsWith('!');
      if (globToRegExp(neg ? pat.slice(1) : pat).test(v)) ok = !neg;
    }
    if (ignore && ignore.some((pat) => globToRegExp(pat).test(v))) ok = false;
    return ok;
  };
  return values.some(matchOne);
}

function refInfo(event, payload) {
  if (event === 'push') {
    const ref = payload.ref || '';
    if (ref.startsWith('refs/tags/')) return { branch: null, tag: ref.slice(10) };
    return { branch: ref.replace(/^refs\/heads\//, ''), tag: null };
  }
  if (payload.pull_request) return { branch: payload.pull_request.base.ref, tag: null };
  return { branch: null, tag: null };
}

// Returns the workflows a webhook should start. `changedFiles` is null when unknown,
// in which case path filters are treated as matching (run rather than silently skip).
function matchWorkflows(workflows, event, payload, changedFiles, cfg = {}) {
  const triggerNames = event === 'pull_request' ? ['pull_request', 'pull_request_target'] : [event];
  const { branch, tag } = refInfo(event, payload);
  const out = [];
  for (const wf of workflows) {
    if (cfg.onlyWorkflows && cfg.onlyWorkflows.length && !cfg.onlyWorkflows.includes(wf.file)) continue;
    if (cfg.skipWorkflows && cfg.skipWorkflows.includes(wf.file)) continue;
    for (const trig of triggerNames) {
      const spec = wf.on[trig];
      if (!spec) continue;
      const types = spec.types || DEFAULT_TYPES[trig];
      if (types && payload.action && !types.includes(payload.action)) continue;
      const hasBranchFilter = Boolean(spec.branches || spec['branches-ignore']);
      const hasTagFilter = Boolean(spec.tags || spec['tags-ignore']);
      if (tag !== null) {
        // A push workflow filtered only by branches does not run for tags, and vice versa.
        if (hasBranchFilter && !hasTagFilter) continue;
        if (hasTagFilter && !passesFilter([tag], spec.tags, spec['tags-ignore'])) continue;
      } else if (branch !== null) {
        if (event === 'push' && hasTagFilter && !hasBranchFilter) continue;
        if (hasBranchFilter && !passesFilter([branch], spec.branches, spec['branches-ignore'])) continue;
      }
      if (changedFiles && (spec.paths || spec['paths-ignore'])) {
        if (!passesFilter(changedFiles, spec.paths, spec['paths-ignore'])) continue;
      }
      out.push({ ...wf, trigger: trig });
      break;
    }
  }
  return out;
}

function shouldIgnore(event, payload, cfg) {
  if (LOOP_PRONE_EVENTS.has(event) && !cfg.allowLoopEvents.includes(event)) return `loop-prone event ${event}`;
  const sender = payload.sender && payload.sender.login;
  if (sender && cfg.ignoreSenders.includes(sender)) return `ignored sender ${sender}`;
  if (payload.repository && payload.repository.full_name !== cfg.repo) return 'other repository';
  const pr = payload.pull_request;
  if (event === 'pull_request' && pr && pr.head.repo && pr.head.repo.full_name !== pr.base.repo.full_name && !cfg.allowForkPrs) {
    return 'fork pull request (set ALLOW_FORK_PRS=true to run untrusted code)';
  }
  return null;
}

function changedFilesFromPush(payload) {
  if (!Array.isArray(payload.commits) || payload.commits.length === 0) return null;
  // GitHub truncates commit lists at 20; beyond that the file list is incomplete.
  if (payload.commits.length >= 20) return null;
  const files = new Set();
  for (const c of payload.commits) for (const k of ['added', 'modified', 'removed']) for (const f of c[k] || []) files.add(f);
  return [...files];
}

// The commit that statuses attach to, and the ref act should check out.
function targetFor(event, trigger, payload) {
  const pr = payload.pull_request;
  if (pr) {
    const checkout = trigger === 'pull_request_target' ? pr.base.sha : pr.head.sha;
    return { statusSha: pr.head.sha, checkoutSha: checkout, prNumber: pr.number };
  }
  if (event === 'push' && payload.after && !/^0+$/.test(payload.after)) {
    return { statusSha: payload.after, checkoutSha: payload.after, prNumber: null };
  }
  return { statusSha: null, checkoutSha: null, prNumber: null };
}

function buildActArgs({ trigger, workflowFile, eventFile, secretFile, runnerImage }) {
  // Secrets are passed by file, never on argv, so they stay out of `ps` and /proc.
  return [
    trigger,
    '-W', path.join('.github', 'workflows', workflowFile),
    '-e', eventFile,
    '--secret-file', secretFile,
    '-P', `ubuntu-latest=${runnerImage}`,
    '-P', `ubuntu-24.04=${runnerImage}`,
    '-P', `ubuntu-22.04=${runnerImage}`,
    '--rm',
  ];
}

class GitHubClient {
  constructor(token, repo, fetchImpl = globalThis.fetch) {
    this.token = token;
    this.repo = repo;
    this.fetch = fetchImpl;
  }

  async request(method, url, body) {
    const res = await this.fetch(`https://api.github.com${url}`, {
      method,
      headers: {
        authorization: `Bearer ${this.token}`,
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
        'user-agent': 'revvel-self-hosted-ci',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${await res.text()}`);
    return res.status === 204 ? null : res.json();
  }

  setStatus(sha, state, context, description, targetUrl) {
    return this.request('POST', `/repos/${this.repo}/statuses/${sha}`, {
      state,
      context,
      description: description.slice(0, 140),
      target_url: targetUrl || undefined,
    });
  }

  async prFiles(number) {
    const files = [];
    for (let page = 1; page <= 10; page++) {
      const batch = await this.request('GET', `/repos/${this.repo}/pulls/${number}/files?per_page=100&page=${page}`);
      files.push(...batch.map((f) => f.filename));
      if (batch.length < 100) return files;
    }
    return null; // >1000 files: too many to trust, treat path filters as matching
  }

  async defaultBranchSha(branch) {
    const ref = await this.request('GET', `/repos/${this.repo}/git/ref/heads/${encodeURIComponent(branch)}`);
    return ref.object.sha;
  }
}

class Queue {
  constructor(limit) {
    this.limit = limit;
    this.running = 0;
    this.items = [];
  }

  push(task) {
    return new Promise((resolve, reject) => {
      this.items.push({ task, resolve, reject });
      this.drain();
    });
  }

  drain() {
    while (this.running < this.limit && this.items.length) {
      const { task, resolve, reject } = this.items.shift();
      this.running++;
      Promise.resolve()
        .then(task)
        .then(resolve, reject)
        .finally(() => {
          this.running--;
          this.drain();
        });
    }
  }
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...opts, stdio: ['ignore', opts.out || 'ignore', opts.out || 'ignore'] });
    const timer = opts.timeoutMs ? setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs) : null;
    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      resolve({ code: 127, error: err });
    });
    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code === null ? 124 : code, signal });
    });
  });
}

async function prepareCheckout(cfg, token, sha, jobId) {
  const mirror = path.join(cfg.workDir, 'mirror.git');
  const askpass = path.join(cfg.workDir, 'askpass.sh');
  if (!fs.existsSync(askpass)) {
    // Token is read from its file at call time; it never appears in argv or the URL.
    fs.writeFileSync(askpass, `#!/bin/sh\ncat ${JSON.stringify(cfg.githubTokenFile)}\n`, { mode: 0o700 });
  }
  const env = { ...process.env, GIT_ASKPASS: askpass, GIT_TERMINAL_PROMPT: '0', GIT_USERNAME: 'x-access-token' };
  const url = `https://x-access-token@github.com/${cfg.repo}.git`;
  if (!fs.existsSync(mirror)) {
    const r = await run('git', ['clone', '--bare', '--filter=blob:none', url, mirror], { env });
    if (r.code !== 0) throw new Error('git clone failed');
  }
  let r = await run('git', ['-C', mirror, 'fetch', '--quiet', 'origin', sha], { env });
  if (r.code !== 0) throw new Error(`git fetch ${sha} failed`);
  const dir = path.join(cfg.workDir, 'jobs', jobId);
  r = await run('git', ['-C', mirror, 'worktree', 'add', '--detach', dir, sha], { env });
  if (r.code !== 0) throw new Error('git worktree add failed');
  return { dir, cleanup: () => run('git', ['-C', mirror, 'worktree', 'remove', '--force', dir]) };
}

function writeSecretFile(cfg, token, dir) {
  const lines = [`GITHUB_TOKEN=${token}`];
  if (cfg.secretsFile && fs.existsSync(cfg.secretsFile)) lines.push(fs.readFileSync(cfg.secretsFile, 'utf8').trim());
  const p = path.join(dir, '.act-secrets');
  fs.writeFileSync(p, lines.join('\n') + '\n', { mode: 0o600 });
  return p;
}

async function runJob(cfg, gh, token, job, log = console) {
  const jobId = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const context = `${cfg.statusPrefix} / ${job.workflow.name}`;
  const logFile = path.join(cfg.logDir, `${jobId}.log`);
  const targetUrl = cfg.logBaseUrl ? `${cfg.logBaseUrl.replace(/\/$/, '')}/${jobId}.log` : '';
  if (job.statusSha) await gh.setStatus(job.statusSha, 'pending', context, 'running on self-hosted runner', targetUrl);

  let checkout;
  let result = { code: 1 };
  try {
    checkout = await prepareCheckout(cfg, token, job.checkoutSha, jobId);
    const eventFile = path.join(checkout.dir, '.act-event.json');
    fs.writeFileSync(eventFile, JSON.stringify(job.payload));
    const secretFile = writeSecretFile(cfg, token, checkout.dir);
    const out = fs.openSync(logFile, 'a');
    try {
      result = await run(
        cfg.actBin,
        buildActArgs({ trigger: job.trigger, workflowFile: job.workflow.file, eventFile, secretFile, runnerImage: cfg.runnerImage }),
        { cwd: checkout.dir, out, timeoutMs: cfg.jobTimeoutMs, env: actEnv() },
      );
    } finally {
      fs.closeSync(out);
      // Disabled at the owner's request: keep the per-job secrets file instead of deleting it
      // (no-delete rule). Note it still goes away with the job checkout when that is removed.
      // fs.rmSync(secretFile, { force: true });
    }
  } catch (err) {
    fs.appendFileSync(logFile, `\n[dispatcher] ${err.message}\n`);
    log.error(`[${jobId}] ${job.workflow.file}: ${err.message}`);
  } finally {
    if (checkout) await checkout.cleanup();
  }

  const ok = result.code === 0;
  const desc = ok ? 'passed' : result.code === 124 ? 'timed out' : `failed (exit ${result.code})`;
  if (job.statusSha) await gh.setStatus(job.statusSha, ok ? 'success' : 'failure', context, desc, targetUrl);
  log.info(`[${jobId}] ${job.workflow.file} (${job.trigger}) -> ${desc}`);
  return { jobId, ok, code: result.code };
}

async function planJobs(cfg, gh, event, payload, repoDir) {
  const reason = shouldIgnore(event, payload, cfg);
  if (reason) return { ignored: reason, jobs: [] };

  let changed = null;
  if (event === 'push') changed = changedFilesFromPush(payload);
  else if (event === 'pull_request' && payload.pull_request) changed = await gh.prFiles(payload.pull_request.number);

  const matched = matchWorkflows(loadWorkflows(repoDir), event, payload, changed, cfg);
  const jobs = [];
  for (const wf of matched) {
    let t = targetFor(event, wf.trigger, payload);
    if (!t.checkoutSha) {
      const branch = (payload.repository && payload.repository.default_branch) || 'main';
      const sha = await gh.defaultBranchSha(branch);
      t = { statusSha: null, checkoutSha: sha, prNumber: null };
    }
    jobs.push({ workflow: wf, trigger: wf.trigger, payload, ...t });
  }
  return { ignored: null, jobs };
}

function readBody(req, limit = 25 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new Error('body too large'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function createServer(cfg, deps) {
  const { gh, token, queue, repoDirFor, log = console } = deps;
  const seen = new Map();

  const enqueue = (jobs) => {
    for (const job of jobs) queue.push(() => runJob(cfg, gh, token, job, log)).catch((e) => log.error(e));
  };

  return http.createServer(async (req, res) => {
    const reply = (code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    try {
      if (req.method === 'GET' && req.url === '/healthz') {
        return reply(200, { ok: true, running: queue.running, queued: queue.items.length });
      }
      if (req.method === 'POST' && req.url === '/webhook') {
        const raw = await readBody(req);
        if (!verifySignature(cfg.webhookSecret, raw, req.headers['x-hub-signature-256'])) {
          return reply(401, { error: 'bad signature' });
        }
        const delivery = req.headers['x-github-delivery'];
        if (delivery && seen.has(delivery)) return reply(200, { duplicate: true });
        if (delivery) {
          seen.set(delivery, Date.now());
          if (seen.size > 5000) seen.delete(seen.keys().next().value);
        }
        const event = req.headers['x-github-event'];
        if (event === 'ping') return reply(200, { pong: true });
        const payload = JSON.parse(raw.toString('utf8'));
        const plan = await planJobs(cfg, gh, event, payload, await repoDirFor(payload));
        enqueue(plan.jobs);
        return reply(202, { ignored: plan.ignored, queued: plan.jobs.map((j) => j.workflow.file) });
      }
      if (req.method === 'POST' && req.url === '/dispatch') {
        // Manual run of a workflow_dispatch workflow: {"workflow":"x.yml","ref":"main","inputs":{}}
        const admin = cfg.adminTokenFile ? readSecretFile(cfg.adminTokenFile) : '';
        const auth = req.headers.authorization || '';
        const want = Buffer.from(`Bearer ${admin}`);
        const got = Buffer.from(auth);
        if (!admin || got.length !== want.length || !crypto.timingSafeEqual(got, want)) {
          return reply(401, { error: 'unauthorized' });
        }
        const body = JSON.parse((await readBody(req, 1024 * 1024)).toString('utf8'));
        const ref = body.ref || 'main';
        const sha = await gh.defaultBranchSha(ref);
        const payload = { ref: `refs/heads/${ref}`, inputs: body.inputs || {}, repository: { full_name: cfg.repo } };
        const wf = loadWorkflows(await repoDirFor(payload)).find((w) => w.file === body.workflow);
        if (!wf || !wf.on.workflow_dispatch) return reply(404, { error: 'no such workflow_dispatch workflow' });
        enqueue([{ workflow: wf, trigger: 'workflow_dispatch', payload, statusSha: sha, checkoutSha: sha, prNumber: null }]);
        return reply(202, { queued: [wf.file], sha });
      }
      return reply(404, { error: 'not found' });
    } catch (err) {
      log.error(err);
      return reply(500, { error: 'internal error' });
    }
  });
}

// Workflow definitions are read from the default branch so a PR cannot add a
// workflow that runs with the dispatcher's secrets before it is merged.
async function makeRepoDirResolver(cfg, gh, token) {
  let cached = { sha: null, dir: null };
  return async (payload) => {
    const branch = (payload.repository && payload.repository.default_branch) || 'main';
    const sha = await gh.defaultBranchSha(branch);
    if (cached.sha === sha) return cached.dir;
    const co = await prepareCheckout(cfg, token, sha, `defs-${sha.slice(0, 12)}`);
    if (cached.dir) await run('git', ['-C', path.join(cfg.workDir, 'mirror.git'), 'worktree', 'remove', '--force', cached.dir]);
    cached = { sha, dir: co.dir };
    return co.dir;
  };
}

async function main() {
  materializeEnvSecrets(process.env, path.join(process.env.WORK_DIR || path.join(os.tmpdir(), 'self-hosted-ci'), 'secrets'));
  const cfg = loadConfig();
  fs.mkdirSync(cfg.logDir, { recursive: true });
  fs.mkdirSync(path.join(cfg.workDir, 'jobs'), { recursive: true });
  const token = readSecretFile(cfg.githubTokenFile);
  const gh = new GitHubClient(token, cfg.repo);
  const queue = new Queue(cfg.maxConcurrency);
  const repoDirFor = await makeRepoDirResolver(cfg, gh, token);
  createServer(cfg, { gh, token, queue, repoDirFor }).listen(cfg.port, () => {
    console.info(`self-hosted CI dispatcher for ${cfg.repo} listening on :${cfg.port}`);
  });
}

module.exports = {
  LOOP_PRONE_EVENTS,
  actEnv,
  GitHubClient,
  Queue,
  buildActArgs,
  changedFilesFromPush,
  createServer,
  globToRegExp,
  loadConfig,
  materializeEnvSecrets,
  loadWorkflows,
  matchWorkflows,
  normalizeOn,
  passesFilter,
  planJobs,
  shouldIgnore,
  targetFor,
  verifySignature,
};

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
