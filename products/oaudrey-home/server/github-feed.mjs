// GitHub read side for the oAudrey front page. Added 2026-11-11 by MarketShipper.
//
// GET /api/team and GET /api/hub use GITHUB_READ_TOKEN. The token is never
// written into a response. Discussions use the GraphQL endpoint because the
// REST API does not list discussion comments. Checks, reviews, commits, and
// the issue timeline stay on REST.
//
// A complete report is cached for five minutes in this process. A partial
// report is marked partial and is not stored as connected:true. One in-flight
// build is shared per cache. The rate-limit reset is kept on that cache so a
// remaining count of 0 waits until the reset time. A 403 is permission unless
// the remaining count is 0, Retry-After is set, or the body says secondary
// rate limit. Missing token returns connected:false and no invented rows.
//
// What breaks if this file is removed: the world has no live feed and the
// whiteboards stay on the closed-for-the-night state.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = 'midnghtsapphire/revvel-standards';
const TTL_MS = 5 * 60 * 1000;
const SHORT_TTL_MS = 60 * 1000;
const SOURCES_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '../hub-sources.json');
const gates = new WeakMap();

export const SERVICE_CATALOG = {
  circleci: { id: 'circleci', name: 'CircleCI', logo: '/logos/circleci.svg' },
  sonarcloud: { id: 'sonarcloud', name: 'SonarCloud', logo: '/logos/sonarcloud.svg' },
  cursor: { id: 'cursor', name: 'Cursor', logo: '/logos/cursor.png' },
  cubic: { id: 'cubic', name: 'Cubic', logo: '/logos/cubic.png' },
  gitar: { id: 'gitar', name: 'Gitar', logo: '/logos/gitar.png' },
  gitguardian: { id: 'gitguardian', name: 'GitGuardian', logo: '/logos/gitguardian.png' },
  'github-actions': { id: 'github-actions', name: 'GitHub Actions', logo: '/logos/github-actions.svg', billing: true },
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
  'github-actions[bot]': 'github-actions',
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

export function peopleFromPr({ login, title, events, reviews }) {
  const names = [];
  if (login) names.push(login);
  const titled = authorFromTitle(title, null);
  if (titled && titled !== 'unknown' && titled !== login) names.push(titled);
  for (const event of events || []) {
    const who = event?.actor?.login || event?.user?.login || event?.author?.login;
    if (who) names.push(who);
  }
  for (const review of reviews || []) {
    if (review?.login) names.push(review.login);
  }
  return [...new Set(names)];
}

const REVIEW_ACTORS = new Set(['cursor', 'cubic', 'gitar', 'devin']);

function handoffStop(id) {
  if (REVIEW_ACTORS.has(id)) return { station: 'reviewHut', handoffStation: 'mergeLagoon' };
  return { station: 'checkGrove', handoffStation: 'reviewHut' };
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
    return { id, name, status: 'skipped (billing)', billing: true, at, title: '', summary: '', via: 'check_run' };
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
    via: 'check_run',
    title: typeof run?.output?.title === 'string' ? run.output.title : '',
    summary: typeof run?.output?.summary === 'string' ? run.output.summary : '',
  };
}

export function commitSubject(event) {
  const message = event?.message || event?.commit?.message || '';
  const line = String(message).split('\n')[0].trim();
  return redactPublic(line).slice(0, 180);
}

// 2026-11-11 MarketShipper. The old walker sorted every object on
// created_at || submitted_at and treated check_run and status as issue
// timeline events. Committed events carry author.date, and the issue
// timeline does not emit checks, so that walk skipped checkGrove.
// export function stationsFromTimeline(events) {
//   const sorted = [...(events || [])].sort((a, b) => String(a.created_at || a.submitted_at || '').localeCompare(String(b.created_at || b.submitted_at || '')));
//   ... else if (kind === 'status' || kind === 'check_run') station = 'checkGrove';
// }

export function streamTime(item, stream) {
  if (stream === 'check') return item?.completed_at || item?.started_at || '';
  if (stream === 'status') return item?.updated_at || item?.created_at || '';
  return item?.updated_at || item?.created_at || item?.submitted_at || item?.author?.date || '';
}

export function sortStream(items, stream) {
  return [...(items || [])].sort((a, b) => String(streamTime(a, stream)).localeCompare(String(streamTime(b, stream))));
}

export function stationsFromStreams({ issues, checks, statuses } = {}) {
  const issueEvents = sortStream(issues, 'issue').filter((event) => {
    const kind = event?.event || '';
    return kind !== 'check_run' && kind !== 'status' && kind !== 'check_suite';
  });
  const checkEvents = sortStream(checks, 'check').filter((event) => event?.app?.slug !== 'github-actions');
  const statusEvents = sortStream(statuses, 'status');
  const merged = [
    ...issueEvents.map((event) => ({ stream: 'issue', at: streamTime(event, 'issue'), event })),
    ...checkEvents.map((event) => ({ stream: 'check', at: streamTime(event, 'check'), event })),
    ...statusEvents.map((event) => ({ stream: 'status', at: streamTime(event, 'status'), event })),
  ].sort((a, b) => String(a.at).localeCompare(String(b.at)) || a.stream.localeCompare(b.stream));
  const stations = [];
  let failedEarlier = false;
  let subject = '';
  let subjectAt = '';
  for (const row of merged) {
    if (row.stream === 'check') {
      const conclusion = row.event?.conclusion;
      if (conclusion === 'failure' || conclusion === 'timed_out' || conclusion === 'startup_failure') failedEarlier = true;
      if (stations[stations.length - 1] !== 'checkGrove') stations.push('checkGrove');
      continue;
    }
    if (row.stream === 'status') {
      const state = row.event?.state;
      if (state === 'failure' || state === 'error') failedEarlier = true;
      if (stations[stations.length - 1] !== 'checkGrove') stations.push('checkGrove');
      continue;
    }
    const kind = row.event?.event || '';
    let station = null;
    if (kind === 'merged') station = 'mergeLagoon';
    else if (kind === 'reviewed' || kind === 'commented') station = 'reviewHut';
    else if (kind === 'opened' || kind === 'ready_for_review' || kind === 'reopened') station = 'prGate';
    else if (kind === 'committed' || kind === 'head_ref_force_pushed') station = failedEarlier ? 'fixIt' : 'pushPier';
    if (station && stations[stations.length - 1] !== station) stations.push(station);
    if (kind === 'committed') {
      const next = commitSubject(row.event);
      if (next) {
        subject = next;
        subjectAt = streamTime(row.event, 'issue');
      }
    }
  }
  return { stations, subject, subjectAt, failedEarlier };
}

export function stationsFromTimeline(events) {
  return stationsFromStreams({ issues: events, checks: [], statuses: [] });
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
    partial: false,
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
  return { connected: false, partial: false, reason, fetchedAt: null, boards: [] };
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

function gateFor(cache) {
  let gate = gates.get(cache);
  if (!gate) {
    gate = { remaining: null, resetAt: 0, inflight: new Map() };
    gates.set(cache, gate);
  }
  return gate;
}

export function githubFailureReason(status, headers, body) {
  const remaining = typeof headers?.get === 'function' ? headers.get('x-ratelimit-remaining') : null;
  const retry = typeof headers?.get === 'function' ? headers.get('retry-after') : null;
  const message = typeof body === 'string' ? body : String(body?.message || '');
  if (remaining === '0') return 'rate_limited';
  if (retry) return 'rate_limited';
  if (/secondary rate limit/i.test(message)) return 'rate_limited';
  if (status === 403 || status === 401) return 'permission';
  return 'github_error';
}

function noteLimit(response, gate) {
  const headers = response?.headers;
  if (typeof headers?.get !== 'function') return;
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  if (remaining != null && remaining !== '') gate.remaining = Number(remaining);
  if (reset) gate.resetAt = Number(reset) * 1000;
}

function backedOff(gate, now) {
  if (gate.remaining !== 0) return false;
  if (!gate.resetAt || now < gate.resetAt) return true;
  gate.remaining = null;
  return false;
}

async function github(url, token, fetchImpl, gate, now) {
  if (backedOff(gate, now)) {
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
  noteLimit(response, gate);
  if (response.status === 403 || response.status === 401 || response.status === 429) {
    let body = {};
    try { body = await response.json(); } catch { body = {}; }
    const reason = githubFailureReason(response.status, response.headers, body);
    const error = new Error(reason);
    error.reason = reason;
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
  const ttl = hit.ttl ?? TTL_MS;
  if (now - hit.at > ttl) return null;
  return hit.value;
}

function cachePut(cache, key, now, value, ttl) {
  cache.set(key, { at: now, value, ttl });
  return value;
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

export function activityFor(checks) {
  const real = checks.filter((check) => check.id && !check.billing);
  if (real.some((check) => check.status === 'failing')) return { activity: 'failed', handoffTo: null, from: null };
  const pending = real.filter((check) => check.status === 'pending');
  for (const done of real.filter((check) => check.status === 'passing' && check.at)) {
    const next = pending.find((item) => item.id !== done.id && String(item.at || '') >= String(done.at || ''));
    if (next) return { activity: 'handoff', handoffTo: next.id, from: done.id };
  }
  if (pending.length) return { activity: 'working', handoffTo: null, from: null };
  return { activity: 'idle', handoffTo: null, from: null };
}

export async function buildTeamReport({ env, fetchImpl, now, cache }) {
  const token = String(env?.GITHUB_READ_TOKEN || '');
  if (!token) return emptyTeam('missing_token');
  const gate = gateFor(cache);
  const hit = cacheGet(cache, 'team', now);
  if (hit) return hit;
  if (backedOff(gate, now)) return cachePut(cache, 'team', now, emptyTeam('rate_limited'), SHORT_TTL_MS);
  if (gate.inflight.has('team')) return gate.inflight.get('team');
  const job = loadTeam({ env, fetchImpl, now, cache, token, gate }).finally(() => {
    if (gate.inflight.get('team') === job) gate.inflight.delete('team');
  });
  gate.inflight.set('team', job);
  return job;
}

async function loadTeam({ fetchImpl, now, cache, token, gate }) {
  const get = (urlPath) => github(`https://api.github.com${urlPath}`, token, fetchImpl, gate, now);
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
    let partial = false;
    for (const pr of selected) {
      const sha = pr?.head?.sha;
      if (!sha || !pr.number) continue;
      let checks = [];
      let reviews = [];
      let rawChecks = [];
      let rawStatuses = [];
      let issueEvents = [];
      let timeline = { stations: [], subject: '', subjectAt: '' };
      try {
        const checkPayload = await get(`/repos/${REPO}/commits/${sha}/check-runs?per_page=100`);
        rawChecks = checkPayload.check_runs || [];
        checks = rawChecks.map(classifyCheck).filter((check) => check.id);
        const statusPayload = await get(`/repos/${REPO}/commits/${sha}/status`);
        rawStatuses = statusPayload.statuses || [];
        for (const item of rawStatuses) {
          const id = serviceIdFromContext(item.context);
          if (!id) continue;
          const status = item.state === 'success' ? 'passing' : item.state === 'failure' || item.state === 'error' ? 'failing' : item.state === 'pending' ? 'pending' : 'none';
          checks.push({
            id,
            name: String(item.context || id).slice(0, 120),
            status,
            billing: false,
            at: item.updated_at || item.created_at || null,
            via: 'commit_status',
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
        issueEvents = Array.isArray(events) ? events : [];
        timeline = stationsFromStreams({
          issues: issueEvents,
          checks: rawChecks,
          statuses: rawStatuses,
        });
      } catch (error) {
        if (error.reason === 'rate_limited') {
          partial = true;
          break;
        }
        if (error.reason === 'permission') partial = true;
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
          handoffStation: null,
          prNumber: pr.number,
          station,
          via: check.via || 'check_run',
          checkName: check.name,
          checkStatus: check.status,
          checkAt: check.at,
        };
        if (!check.billing && check.status === 'passing') current.passing += 1;
        if (!check.billing && check.status === 'failing') current.failing += 1;
        if (!check.billing && check.status === 'pending') current.pending += 1;
        const rank = { billing: 5, failed: 4, working: 3, handoff: 2, idle: 1 };
        let nextActivity = 'idle';
        let handoffTo = null;
        let nextStation = station;
        let nextHandoffStation = null;
        const rolled = activityFor(checks);
        if (check.billing) {
          nextActivity = 'billing';
          nextStation = 'castle';
        } else if (check.status === 'failing') {
          nextActivity = 'failed';
          nextStation = 'fixIt';
        } else if (rolled.activity === 'handoff' && rolled.from === check.id) {
          nextActivity = 'handoff';
          handoffTo = rolled.handoffTo;
          const stop = handoffStop(check.id);
          nextStation = stop.station;
          nextHandoffStation = stop.handoffStation;
        } else if (rolled.activity === 'handoff' && rolled.handoffTo === check.id) {
          nextActivity = 'working';
          nextStation = 'checkGrove';
        } else if (check.status === 'pending') {
          nextActivity = 'working';
          nextStation = 'checkGrove';
        } else if (check.status === 'passing') {
          nextActivity = 'handoff';
          const stop = handoffStop(check.id);
          nextStation = stop.station;
          nextHandoffStation = stop.handoffStation;
        }
        if (!current.checkAt || String(check.at || '') >= String(current.checkAt || '')) {
          current.checkName = check.name;
          current.checkStatus = check.status;
          current.checkAt = check.at;
          current.via = check.via || 'check_run';
        }
        if ((rank[nextActivity] || 0) >= (rank[current.activity] || 0)) {
          current.activity = nextActivity;
          current.handoffTo = handoffTo;
          current.handoffStation = nextHandoffStation;
          current.prNumber = pr.number;
          current.station = nextStation;
          current.speech = quote ? quote.text : null;
          current.quoteSource = quote ? quote.source : null;
        }
        teamMap.set(check.id, current);
      }
      for (const name of peopleFromPr({ login, title: pr.title, events: issueEvents, reviews })) {
        const mapped = serviceIdFromLogin(name);
        const id = mapped || name;
        if (teamMap.has(id)) continue;
        const entry = catalogEntry(mapped || id);
        teamMap.set(id, {
          id: entry.id,
          name: mapped ? entry.name : name,
          logo: mapped ? entry.logo : null,
          passing: 0,
          failing: 0,
          pending: 0,
          activity: 'idle',
          speech: null,
          quoteSource: null,
          handoffTo: null,
          handoffStation: null,
          prNumber: pr.number,
          station: 'reviewHut',
          via: 'author',
          checkName: null,
          checkStatus: 'none',
          checkAt: pr.updated_at || null,
        });
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
      if (error.reason === 'rate_limited' || error.reason === 'permission') partial = true;
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
      connected: !partial,
      partial,
      reason: partial ? 'partial' : null,
      fetchedAt: new Date(now).toISOString(),
      passing,
      failing,
      pending,
      prs,
      team: [...teamMap.values()],
      stations,
      spots,
      release,
    };
    return cachePut(cache, 'team', now, report, partial ? SHORT_TTL_MS : TTL_MS);
  } catch (error) {
    return cachePut(cache, 'team', now, emptyTeam(error.reason || 'github_error'), SHORT_TTL_MS);
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

async function githubGraphql(query, variables, token, fetchImpl, gate, now) {
  if (backedOff(gate, now)) {
    const error = new Error('rate_limited');
    error.reason = 'rate_limited';
    throw error;
  }
  const response = await fetchImpl('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'oaudrey-home',
    },
    body: JSON.stringify({ query, variables }),
  });
  noteLimit(response, gate);
  if (response.status === 403 || response.status === 401 || response.status === 429) {
    let body = {};
    try { body = await response.json(); } catch { body = {}; }
    const reason = githubFailureReason(response.status, response.headers, body);
    const error = new Error(reason);
    error.reason = reason;
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
  const gate = gateFor(cache);
  const hit = cacheGet(cache, 'hub', now);
  if (hit) return hit;
  if (backedOff(gate, now)) return cachePut(cache, 'hub', now, emptyHub('rate_limited'), SHORT_TTL_MS);
  if (gate.inflight.has('hub')) return gate.inflight.get('hub');
  const job = loadHub({ fetchImpl, now, cache, sources, token, gate }).finally(() => {
    if (gate.inflight.get('hub') === job) gate.inflight.delete('hub');
  });
  gate.inflight.set('hub', job);
  return job;
}

async function loadHub({ fetchImpl, now, cache, sources, token, gate }) {
  const boards = [];
  let partial = false;
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
          gate,
          now,
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
          gate,
          now,
        );
        const node = data?.repository?.discussion;
        if (!node) board.unavailable = true;
        else {
          const thread = threadFromDiscussion(node, source.showBodies);
          if (thread) board.threads = [thread];
        }
      }
    } catch (error) {
      board.unavailable = true;
      if (error.reason === 'rate_limited') {
        partial = true;
        boards.push(board);
        break;
      }
      if (error.reason === 'permission') partial = true;
    }
    boards.push(board);
  }
  const report = {
    connected: !partial,
    partial,
    reason: partial ? 'partial' : null,
    fetchedAt: new Date(now).toISOString(),
    boards,
  };
  return cachePut(cache, 'hub', now, report, partial ? SHORT_TTL_MS : TTL_MS);
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
