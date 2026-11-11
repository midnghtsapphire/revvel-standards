// GitHub read side for the oAudrey front page. Added 2026-11-11 by MarketShipper.
//
// GET /api/team and GET /api/hub use GITHUB_READ_TOKEN. The token is never
// written into a response. Discussions use the GraphQL endpoint because the
// REST API does not list discussion comments. Checks, reviews, commits, and
// the issue timeline stay on REST.
//
// Cache is five minutes in this process. A low rate-limit remaining count
// stops further calls and returns the rows already read. Missing token or a
// GitHub error returns connected:false and no invented rows.
//
// What breaks if this file is removed: the world has no live feed and the
// whiteboards stay on the closed-for-the-night state.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'midnghtsapphire/revvel-standards';
const TTL_MS = 5 * 60 * 1000;
const SOURCES_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../hub-sources.json');

export const SERVICE_CATALOG = {
  circleci: { id: 'circleci', name: 'CircleCI', logo: '/logos/circleci.png' },
  sonarcloud: { id: 'sonarcloud', name: 'SonarCloud', logo: '/logos/sonarcloud.png' },
  cursor: { id: 'cursor', name: 'Cursor', logo: '/logos/cursor.png' },
  cubic: { id: 'cubic', name: 'Cubic', logo: '/logos/cubic.png' },
  gitar: { id: 'gitar', name: 'Gitar', logo: '/logos/gitar.png' },
  gitguardian: { id: 'gitguardian', name: 'GitGuardian', logo: '/logos/gitguardian.png' },
  'github-actions': { id: 'github-actions', name: 'GitHub Actions', logo: '/logos/github-actions.png', billing: true },
  devin: { id: 'devin', name: 'Devin', logo: '/logos/devin.png' },
};

const SLUG_TO_ID = {
  circleci: 'circleci',
  sonarqubecloud: 'sonarcloud',
  sonarcloud: 'sonarcloud',
  cursor: 'cursor',
  'cubic-dev-ai': 'cubic',
  cubic: 'cubic',
  'gitar-bot': 'gitar',
  gitguardian: 'gitguardian',
  'github-actions': 'github-actions',
  devin: 'devin',
  'devin-ai-integration': 'devin',
};

const LOGIN_TO_ID = {
  'cursor[bot]': 'cursor',
  cursor: 'cursor',
  'gitar-bot[bot]': 'gitar',
  'sonarqubecloud[bot]': 'sonarcloud',
  'gitguardian[bot]': 'gitguardian',
  'cubic-dev-ai[bot]': 'cubic',
};

const CONVENTIONAL = /^(feat|fix|docs|chore|refactor|test|ci|style|perf|build|revert)(\([^)]+\))?$/i;

export function redactPublic(text) {
  return String(text || '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted]')
    .replace(/\b(?:ghp_|github_pat_|gho_|sk_live_|sk_test_|xox[baprs]-|AKIA)[A-Za-z0-9_-]{4,}/g, '[redacted]')
    .replace(/\b(?:token|key|secret|password)\s*[:=]\s*\S+/gi, '[redacted]')
    .replace(/https?:\/\/[^\s)]+\?[^\s)]+/g, (url) => url.split('?')[0]);
}

export function safeUrl(url) {
  try {
    const parsed = new URL(String(url));
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

export function firstSentences(text, count = 2) {
  const clean = redactPublic(text).replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  const parts = clean.split(/(?<=[.!?])\s+/);
  return parts.slice(0, count).join(' ').slice(0, 280);
}

export function authorFromTitle(title, login) {
  const match = String(title || '').match(/^\*{0,2}\s*([^:*\n]{1,60}?)\s*\*{0,2}:/);
  if (match) {
    const name = match[1].trim();
    if (name && !CONVENTIONAL.test(name)) return name;
  }
  return login || 'unknown';
}

export function serviceIdFromSlug(slug) {
  if (!slug) return null;
  return SLUG_TO_ID[slug] || slug;
}

export function serviceIdFromContext(context) {
  const value = String(context || '').toLowerCase();
  if (value.startsWith('ci/circleci')) return 'circleci';
  if (value.includes('devin')) return 'devin';
  if (value.includes('sonar')) return 'sonarcloud';
  return null;
}

export function serviceIdFromLogin(login) {
  if (!login) return null;
  return LOGIN_TO_ID[login] || null;
}

function catalogEntry(id) {
  if (!id) return null;
  if (SERVICE_CATALOG[id]) return SERVICE_CATALOG[id];
  return { id, name: id, logo: null };
}

export function classifyCheck(run) {
  const id = serviceIdFromSlug(run?.app?.slug);
  const billing = id === 'github-actions';
  const at = run?.completed_at || run?.started_at || null;
  const name = typeof run?.name === 'string' ? run.name.slice(0, 120) : 'check';
  if (billing) {
    return { id, name, status: 'skipped (billing)', billing: true, at, title: '', summary: '' };
  }
  const state = run?.status;
  const conclusion = run?.conclusion;
  let status = 'none';
  if (state === 'queued' || state === 'in_progress' || state === 'pending' || state === 'waiting' || state === 'requested') {
    status = 'pending';
  } else if (conclusion === 'success') status = 'passing';
  else if (conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'startup_failure' || conclusion === 'action_required') {
    status = 'failing';
  }
  return {
    id,
    name,
    status,
    billing: false,
    at,
    title: typeof run?.output?.title === 'string' ? run.output.title : '',
    summary: typeof run?.output?.summary === 'string' ? run.output.summary : '',
  };
}

export function commitSubject(event) {
  const message = event?.message || event?.commit?.message || '';
  const line = String(message).split('\n')[0].trim();
  return redactPublic(line).slice(0, 180);
}

export function stationsFromTimeline(events) {
  const sorted = [...(events || [])].sort((a, b) => String(a.created_at || a.submitted_at || '').localeCompare(String(b.created_at || b.submitted_at || '')));
  const stations = [];
  let failedEarlier = false;
  let subject = '';
  let subjectAt = '';
  for (const event of sorted) {
    const kind = event?.event || '';
    if (kind === 'check_run' && (event.conclusion === 'failure' || event.conclusion === 'timed_out')) {
      failedEarlier = true;
    }
    let station = null;
    if (kind === 'merged') station = 'mergeLagoon';
    else if (kind === 'reviewed' || kind === 'commented') station = 'reviewHut';
    else if (kind === 'opened' || kind === 'ready_for_review' || kind === 'reopened') station = 'prGate';
    else if (kind === 'committed' || kind === 'head_ref_force_pushed') station = failedEarlier ? 'fixIt' : 'pushPier';
    else if (kind === 'status' || kind === 'check_run') station = 'checkGrove';
    if (station && stations[stations.length - 1] !== station) stations.push(station);
    if (kind === 'committed') {
      const next = commitSubject(event);
      if (next) {
        subject = next;
        subjectAt = event.created_at || event.author?.date || '';
      }
    }
  }
  return { stations, subject, subjectAt, failedEarlier };
}

function reviewSentence(body) {
  return firstSentences(body, 1);
}

export function quoteFromParts({ checks, reviews, commit }) {
  if ((checks || []).some((check) => check.status === 'pending' && !check.billing)) {
    return { text: 'thinking...', source: 'thinking' };
  }
  const candidates = [];
  for (const check of checks || []) {
    if (!check.title && !check.summary) continue;
    const summary = firstSentences(check.summary, 2);
    const text = redactPublic([check.title, summary].filter(Boolean).join(' — ')).slice(0, 320);
    if (text) candidates.push({ at: check.at || '', text, source: 'check' });
  }
  for (const review of reviews || []) {
    const text = reviewSentence(review.body || '');
    if (text) candidates.push({ at: review.at || '', text, source: 'review' });
  }
  if (commit?.text) candidates.push({ at: commit.at || '', text: commit.text, source: 'commit' });
  candidates.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  if (!candidates.length) return null;
  return { text: candidates[0].text, source: candidates[0].source };
}

function emptyTeam(reason) {
  return {
    connected: false,
    reason,
    fetchedAt: null,
    passing: 0,
    failing: 0,
    pending: 0,
    prs: [],
    team: [],
    stations: {},
    spots: { circleci: 'off', sonarcloud: 'off' },
    release: { lit: false, name: null, at: null },
  };
}

function emptyHub(reason) {
  return { connected: false, reason, fetchedAt: null, boards: [] };
}

function sendJson(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(json),
  });
  res.end(json);
}

async function github(url, token, fetchImpl, state) {
  if (state.remaining === 0) {
    const error = new Error('rate_limited');
    error.reason = 'rate_limited';
    throw error;
  }
  const response = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'oaudrey-home',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  const rawRemaining = typeof response.headers?.get === 'function' ? response.headers.get('x-ratelimit-remaining') : null;
  if (rawRemaining != null && rawRemaining !== '') state.remaining = Number(rawRemaining);
  if (response.status === 403 || response.status === 429) {
    const error = new Error('rate_limited');
    error.reason = 'rate_limited';
    throw error;
  }
  if (!response.ok) {
    const error = new Error('github_error');
    error.reason = 'github_error';
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function cacheGet(cache, key, now) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (now - hit.at > TTL_MS) return null;
  return hit.value;
}

function publicCheck(check) {
  return {
    name: check.name,
    status: check.status,
    app: check.id,
    at: check.at,
  };
}

function rollupStatus(checks) {
  const real = checks.filter((check) => check.id && !check.billing);
  if (real.some((check) => check.status === 'failing')) return 'failing';
  if (real.some((check) => check.status === 'pending')) return 'pending';
  if (real.some((check) => check.status === 'passing')) return 'passing';
  return 'none';
}

function activityFor(checks) {
  const real = checks.filter((check) => check.id && !check.billing);
  if (real.some((check) => check.status === 'failing')) return 'failed';
  if (real.some((check) => check.status === 'pending')) return 'working';
  const finished = real.filter((check) => check.status === 'passing' && check.at);
  const pending = real.filter((check) => check.status === 'pending');
  for (const done of finished) {
    const next = pending.find((item) => item.id !== done.id && String(item.at || '') >= String(done.at || ''));
    if (next) return { activity: 'handoff', handoffTo: next.id };
  }
  return 'idle';
}

export async function buildTeamReport({ env, fetchImpl, now, cache }) {
  const token = String(env?.GITHUB_READ_TOKEN || '');
  if (!token) return emptyTeam('missing_token');
  const hit = cacheGet(cache, 'team', now);
  if (hit) return hit;
  const state = { remaining: null };
  const get = (urlPath) => github(`https://api.github.com${urlPath}`, token, fetchImpl, state);
  try {
    const open = await get(`/repos/${REPO}/pulls?state=open&per_page=15&sort=updated&direction=desc`);
    const closed = await get(`/repos/${REPO}/pulls?state=closed&per_page=15&sort=updated&direction=desc`);
    const merged = (Array.isArray(closed) ? closed : []).filter((pr) => pr.merged_at);
    const selected = [...(Array.isArray(open) ? open : []), ...merged]
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)))
      .slice(0, 20);
    const prs = [];
    const teamMap = new Map();
    const spots = { circleci: 'off', sonarcloud: 'off' };
    let passing = 0;
    let failing = 0;
    let pending = 0;
    let truncated = false;
    for (const pr of selected) {
      const sha = pr?.head?.sha;
      if (!sha || !pr.number) continue;
      let checks = [];
      let reviews = [];
      let timeline = { stations: [], subject: '', subjectAt: '' };
      try {
        const checkPayload = await get(`/repos/${REPO}/commits/${sha}/check-runs?per_page=100`);
        checks = (checkPayload.check_runs || []).map(classifyCheck).filter((check) => check.id);
        const statusPayload = await get(`/repos/${REPO}/commits/${sha}/status`);
        for (const item of statusPayload.statuses || []) {
          const id = serviceIdFromContext(item.context);
          if (!id) continue;
          const status = item.state === 'success' ? 'passing' : item.state === 'failure' || item.state === 'error' ? 'failing' : item.state === 'pending' ? 'pending' : 'none';
          checks.push({
            id,
            name: String(item.context || id).slice(0, 120),
            status,
            billing: false,
            at: item.updated_at || item.created_at || null,
            title: typeof item.description === 'string' ? item.description : '',
            summary: '',
          });
        }
        const reviewPayload = await get(`/repos/${REPO}/pulls/${pr.number}/reviews?per_page=20`);
        reviews = (Array.isArray(reviewPayload) ? reviewPayload : []).map((review) => ({
          login: review?.user?.login || null,
          state: review?.state || null,
          at: review?.submitted_at || null,
          body: typeof review?.body === 'string' ? review.body : '',
        }));
        const events = await get(`/repos/${REPO}/issues/${pr.number}/timeline?per_page=100`);
        timeline = stationsFromTimeline(Array.isArray(events) ? events : []);
      } catch (error) {
        if (error.reason === 'rate_limited') {
          truncated = true;
          break;
        }
        continue;
      }
      if (pr.merged_at && timeline.stations[timeline.stations.length - 1] !== 'mergeLagoon') {
        timeline.stations.push('mergeLagoon');
      }
      const quote = quoteFromParts({
        checks,
        reviews,
        commit: timeline.subject ? { text: timeline.subject, at: timeline.subjectAt } : null,
      });
      const status = rollupStatus(checks);
      const station = timeline.stations[timeline.stations.length - 1] || (status === 'pending' ? 'checkGrove' : 'prGate');
      const login = pr?.user?.login || null;
      prs.push({
        number: pr.number,
        title: redactPublic(pr.title || '').slice(0, 180),
        state: pr.merged_at ? 'merged' : 'open',
        author: authorFromTitle(pr.title, login),
        authorLogin: login,
        status,
        url: safeUrl(pr.html_url),
        station,
        stations: timeline.stations,
        quote,
        checks: checks.map(publicCheck),
      });
      for (const check of checks) {
        if (!check.billing && check.status === 'passing') passing += 1;
        if (!check.billing && check.status === 'failing') failing += 1;
        if (!check.billing && check.status === 'pending') pending += 1;
        if (check.id === 'circleci') spots.circleci = check.status === 'pending' ? 'active' : spots.circleci === 'active' ? 'active' : 'present';
        if (check.id === 'sonarcloud') spots.sonarcloud = check.status === 'pending' ? 'active' : spots.sonarcloud === 'active' ? 'active' : 'present';
        const entry = catalogEntry(check.id);
        const current = teamMap.get(check.id) || {
          id: entry.id,
          name: entry.name,
          logo: entry.logo,
          passing: 0,
          failing: 0,
          pending: 0,
          activity: 'idle',
          speech: null,
          quoteSource: null,
          handoffTo: null,
          prNumber: pr.number,
          station,
        };
        if (!check.billing && check.status === 'passing') current.passing += 1;
        if (!check.billing && check.status === 'failing') current.failing += 1;
        if (!check.billing && check.status === 'pending') current.pending += 1;
        const rank = { failed: 4, working: 3, handoff: 2, idle: 1 };
        let nextActivity = 'idle';
        let handoffTo = null;
        const rolled = activityFor(checks.filter((item) => item.id === check.id || true));
        if (check.status === 'failing' && !check.billing) nextActivity = 'failed';
        else if (check.status === 'pending' && !check.billing) nextActivity = 'working';
        else if (typeof rolled === 'object' && rolled.handoffTo === check.id) nextActivity = 'working';
        else if (typeof rolled === 'object' && rolled.activity === 'handoff') {
          const giver = checks.find((item) => item.status === 'passing' && item.id !== rolled.handoffTo);
          if (giver && giver.id === check.id) {
            nextActivity = 'handoff';
            handoffTo = rolled.handoffTo;
          }
        }
        if (rank[nextActivity] >= rank[current.activity]) {
          current.activity = nextActivity;
          current.handoffTo = handoffTo;
          current.prNumber = pr.number;
          current.station = station;
          current.speech = quote ? quote.text : null;
          current.quoteSource = quote ? quote.source : null;
        }
        teamMap.set(check.id, current);
      }
      for (const review of reviews) {
        const id = serviceIdFromLogin(review.login);
        if (!id) continue;
        const entry = catalogEntry(id);
        if (!teamMap.has(id)) {
          teamMap.set(id, {
            id: entry.id,
            name: entry.name,
            logo: entry.logo,
            passing: 0,
            failing: 0,
            pending: 0,
            activity: 'idle',
            speech: reviewSentence(review.body) || null,
            quoteSource: review.body ? 'review' : null,
            handoffTo: null,
            prNumber: pr.number,
            station: 'reviewHut',
          });
        }
      }
    }
    let release = { lit: false, name: null, at: null };
    try {
      const releases = await get(`/repos/${REPO}/releases?per_page=5`);
      const published = (Array.isArray(releases) ? releases : []).find((item) => item && !item.draft && item.tag_name);
      if (published) release = { lit: true, name: String(published.tag_name).slice(0, 80), at: published.published_at || null };
      else {
        const tags = await get(`/repos/${REPO}/tags?per_page=5`);
        if (Array.isArray(tags) && tags[0]?.name) release = { lit: true, name: String(tags[0].name).slice(0, 80), at: null };
      }
    } catch (error) {
      if (error.reason === 'rate_limited') truncated = true;
    }
    const stations = {
      pushPier: { lit: false, count: 0 },
      prGate: { lit: false, count: 0 },
      checkGrove: { lit: false, count: 0 },
      reviewHut: { lit: false, count: 0 },
      fixIt: { lit: false, count: 0 },
      mergeLagoon: { lit: false, count: 0 },
      releaseVolcano: { lit: release.lit, count: release.lit ? 1 : 0 },
    };
    for (const pr of prs) {
      if (!stations[pr.station]) continue;
      stations[pr.station].lit = true;
      stations[pr.station].count += 1;
    }
    if (pending > 0) stations.checkGrove.lit = true;
    const report = {
      connected: true,
      reason: null,
      fetchedAt: new Date(now).toISOString(),
      passing,
      failing,
      pending,
      truncated,
      prs,
      team: [...teamMap.values()],
      stations,
      spots,
      release,
    };
    cache.set('team', { at: now, value: report });
    return report;
  } catch (error) {
    return emptyTeam(error.reason || 'github_error');
  }
}

export function loadHubSources(text) {
  const parsed = JSON.parse(text);
  return (parsed.sources || []).map((source) => ({
    id: String(source.id || ''),
    label: String(source.label || source.id || ''),
    kind: source.kind === 'discussions' ? 'discussions' : 'discussion',
    owner: String(source.owner || ''),
    repo: String(source.repo || ''),
    number: Number(source.number || source.issue || 0) || null,
    showBodies: source.showBodies === true,
  }));
}

function threadFromDiscussion(node, showBodies) {
  if (!node) return null;
  const comments = node.comments?.nodes || [];
  return {
    title: redactPublic(node.title || '').slice(0, 180),
    url: safeUrl(node.url),
    login: node.author?.login || null,
    commentCount: node.comments?.totalCount ?? comments.length,
    at: node.updatedAt || null,
    comments: comments.slice(0, 8).map((comment) => {
      const row = { login: comment?.author?.login || null, at: comment?.createdAt || null };
      if (showBodies && comment?.body) row.body = redactPublic(comment.body).slice(0, 500);
      return row;
    }),
  };
}

async function githubGraphql(query, variables, token, fetchImpl, state) {
  const response = await fetchImpl('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'oaudrey-home',
    },
    body: JSON.stringify({ query, variables }),
  });
  const rawRemaining = typeof response.headers?.get === 'function' ? response.headers.get('x-ratelimit-remaining') : null;
  if (rawRemaining != null && rawRemaining !== '') state.remaining = Number(rawRemaining);
  if (response.status === 403 || response.status === 429 || state.remaining === 0) {
    const error = new Error('rate_limited');
    error.reason = 'rate_limited';
    throw error;
  }
  if (!response.ok) {
    const error = new Error('github_error');
    error.reason = 'github_error';
    throw error;
  }
  const payload = await response.json();
  return payload.data || null;
}

export async function buildHubReport({ env, fetchImpl, now, cache, sources }) {
  const token = String(env?.GITHUB_READ_TOKEN || '');
  if (!token) return emptyHub('missing_token');
  const hit = cacheGet(cache, 'hub', now);
  if (hit) return hit;
  const state = { remaining: null };
  const boards = [];
  for (const source of sources) {
    const board = { id: source.id, label: source.label, unavailable: false, threads: [] };
    try {
      if (source.kind === 'discussions') {
        const bodyField = source.showBodies ? 'body' : '';
        const data = await githubGraphql(
          `query($owner:String!,$name:String!){
            repository(owner:$owner, name:$name) {
              discussions(first:8, orderBy:{field:UPDATED_AT, direction:DESC}) {
                nodes { number title url updatedAt author { login } comments(last:5) { totalCount nodes { createdAt author { login } ${bodyField} } } }
              }
            }
          }`,
          { owner: source.owner, name: source.repo },
          token,
          fetchImpl,
          state,
        );
        const nodes = data?.repository?.discussions?.nodes;
        if (!data?.repository) board.unavailable = true;
        else board.threads = (nodes || []).map((node) => threadFromDiscussion(node, source.showBodies)).filter(Boolean);
      } else {
        const bodyField = source.showBodies ? 'body' : '';
        const data = await githubGraphql(
          `query($owner:String!,$name:String!,$number:Int!){
            repository(owner:$owner, name:$name) {
              discussion(number:$number) {
                title url updatedAt author { login }
                comments(last:8) { totalCount nodes { createdAt author { login } ${bodyField} } }
              }
            }
          }`,
          { owner: source.owner, name: source.repo, number: source.number },
          token,
          fetchImpl,
          state,
        );
        const node = data?.repository?.discussion;
        if (!node) board.unavailable = true;
        else {
          const thread = threadFromDiscussion(node, source.showBodies);
          if (thread) board.threads = [thread];
        }
      }
    } catch (error) {
      if (error.reason === 'rate_limited') {
        board.unavailable = true;
        boards.push(board);
        break;
      }
      board.unavailable = true;
    }
    boards.push(board);
  }
  const report = { connected: true, reason: null, fetchedAt: new Date(now).toISOString(), boards };
  cache.set('hub', { at: now, value: report });
  return report;
}

export function createGithubRoutes(options = {}) {
  const cache = options.cache || new Map();
  const readSources = options.readSources || (() => readFile(SOURCES_PATH, 'utf8'));
  return async function githubRoutes(req, res, ctx) {
    const pathname = new URL(req.url || '/', 'http://127.0.0.1').pathname;
    if (pathname !== '/api/team' && pathname !== '/api/hub') return false;
    if (req.method !== 'GET' && req.method !== 'HEAD') return false;
    const env = ctx?.env || process.env;
    const fetchImpl = ctx?.fetchImpl || fetch;
    const now = typeof ctx?.now === 'function' ? ctx.now() : Date.now();
    try {
      if (pathname === '/api/team') {
        const body = await buildTeamReport({ env, fetchImpl, now, cache });
        if (req.method !== 'HEAD') sendJson(res, 200, body);
        else {
          res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
          res.end();
        }
        return true;
      }
      const sources = loadHubSources(await readSources());
      const body = await buildHubReport({ env, fetchImpl, now, cache, sources });
      if (req.method !== 'HEAD') sendJson(res, 200, body);
      else {
        res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end();
      }
      return true;
    } catch {
      const body = pathname === '/api/hub' ? emptyHub('github_error') : emptyTeam('github_error');
      sendJson(res, 200, body);
      return true;
    }
  };
}
