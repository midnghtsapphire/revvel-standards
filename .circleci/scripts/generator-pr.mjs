// TriageChief, 2026-11-19, WR #18488. Tiny GitHub REST helper for
// run-scheduled-generator.sh. Node built-ins only (fetch needs Node >= 18).
// The token is read from GENERATORS_GITHUB_TOKEN and is never printed.
//
//   find   <owner/repo> <base> <head-prefix>
//            prints the head ref of an OPEN PR into <base> whose head starts with
//            <head-prefix>, or nothing.
//   upsert <owner/repo> <base> <head> <title> <body-file> <assignee>
//            updates the open PR for <head>, or opens a DRAFT PR, then makes sure
//            the assignee is set. Prints the PR URL.
import fs from 'node:fs';

const API = process.env.GENERATORS_API_URL || 'https://api.github.com';
const TOKEN = process.env.GENERATORS_GITHUB_TOKEN || '';

async function gh(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'revvel-generators-bot',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* leave null */ }
  if (!res.ok) {
    // Status and GitHub's message only: never headers, never the token.
    throw new Error(`${method} ${path} -> ${res.status} ${(json && json.message) || ''}`.trim());
  }
  return json;
}

async function listOpen(repo, base) {
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const batch = await gh('GET', `/repos/${repo}/pulls?state=open&base=${encodeURIComponent(base)}&per_page=100&page=${page}`);
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

async function main() {
  const [cmd, repo, base, a, b, c, d] = process.argv.slice(2);
  if (cmd === 'find') {
    const hit = (await listOpen(repo, base)).find((pr) => pr.head.ref.startsWith(a));
    if (hit) console.log(hit.head.ref);
    return;
  }
  if (cmd === 'upsert') {
    const [head, title, bodyFile, assignee] = [a, b, c, d];
    const body = fs.readFileSync(bodyFile, 'utf8');
    let pr = (await listOpen(repo, base)).find((p) => p.head.ref === head);
    if (pr) {
      pr = await gh('PATCH', `/repos/${repo}/pulls/${pr.number}`, { body });
    } else {
      pr = await gh('POST', `/repos/${repo}/pulls`, { title, head, base, body, draft: true });
    }
    if (!(pr.assignees || []).some((u) => u.login === assignee)) {
      await gh('POST', `/repos/${repo}/issues/${pr.number}/assignees`, { assignees: [assignee] });
    }
    console.log(pr.html_url);
    return;
  }
  throw new Error('usage: generator-pr.mjs find|upsert ...');
}

main().catch((e) => { console.error(`generator-pr: ${e.message}`); process.exit(1); });
