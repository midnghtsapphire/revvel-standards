'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'prioritize_stars.py');
const WORKFLOW = path.join(ROOT, '.github', 'workflows', 'prioritize-stars.yml');
const STANDARD = path.join(ROOT, 'standards', 'AGENTS_STAR_OPTIMIZER.md');
const DOCS = path.join(ROOT, 'docs', 'STAR_OPTIMIZER.md');
const SECRETS = path.join(ROOT, 'docs', 'SECRETS_MAP.md');
const PRODUCT = path.join(ROOT, 'products', 'star-optimizer');

test('star optimizer artifacts exist', () => {
  for (const p of [SCRIPT, WORKFLOW, STANDARD, DOCS, SECRETS, PRODUCT]) {
    assert.ok(fs.existsSync(p), `missing ${path.relative(ROOT, p)}`);
  }
  assert.ok(fs.existsSync(path.join(PRODUCT, 'lib', 'scoring.ts')));
  assert.ok(fs.existsSync(path.join(PRODUCT, 'package.json')));
});

test('workflow points at scripts/prioritize_stars.py and uses concurrency lock', () => {
  const yml = fs.readFileSync(WORKFLOW, 'utf8');
  assert.match(yml, /name:\s*Prioritize Starred Repositories/);
  assert.match(yml, /scripts\/prioritize_stars\.py/);
  assert.match(yml, /concurrency:/);
  assert.match(yml, /group:\s*prioritize-stars-job/);
  assert.match(yml, /\[skip ci\]/);
  assert.match(yml, /workflow_dispatch:/);
  assert.match(yml, /GH_PAT:\s*\$\{\{\s*secrets\.GH_PAT\s*\}\}/);
  assert.doesNotMatch(yml, /secrets\.GITHUB_TOKEN/);
  // Third-party actions must be SHA-pinned (CLAUDE.md gotcha #8).
  const uses = [...yml.matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
  assert.ok(uses.length >= 3, 'expected checkout, setup-python, auto-commit');
  for (const ref of uses) {
    const pin = ref.split('@')[1] || '';
    assert.match(pin, /^[0-9a-f]{40}$/, `floating action ref: ${ref}`);
  }
});

test('python prioritizer self-test passes offline', () => {
  const result = spawnSync('python3', [SCRIPT, '--self-test'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /self-test ok/);
});

test('python prioritizer fixture mode writes markdown and json', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'star-opt-'));
  const md = path.join(tmp, 'PRIORITIZED_STARS.md');
  const jsonOut = path.join(tmp, 'prioritized_stars.json');
  const result = spawnSync(
    'python3',
    [SCRIPT, '--fixture', '--output-md', md, '--output-json', jsonOut],
    { cwd: ROOT, encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const mdText = fs.readFileSync(md, 'utf8');
  assert.match(mdText, /Prioritized Starred Repositories/);
  assert.match(mdText, /active\/tool/);
  const report = JSON.parse(fs.readFileSync(jsonOut, 'utf8'));
  assert.equal(report.count, 3);
  assert.equal(report.repos[0].nameWithOwner, 'active/tool');
});

test('python prioritizer checkpoints GraphQL failures instead of reporting success', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'star-opt-graphql-'));
  const stateFile = path.join(tmp, 'state.json');
  const code = `
import importlib.util
import json
from pathlib import Path

spec = importlib.util.spec_from_file_location("prioritize_stars", r"${SCRIPT}")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Response:
    status_code = 200
    headers = {}
    def raise_for_status(self):
        return None
    def json(self):
        return {"errors": [{"message": "boom"}]}

class Client:
    def post(self, *args, **kwargs):
        return Response()
    def close(self):
        return None

state = {"cursor": "abc", "has_next": True, "repos": {"keep/me": {"nameWithOwner": "keep/me"}}}
try:
    module.fetch_starred_repos(state, limit=5, state_path=r"${stateFile}", client=Client())
except RuntimeError as exc:
    assert "checkpoint saved" in str(exc)
else:
    raise AssertionError("expected RuntimeError")

saved = json.loads(Path(r"${stateFile}").read_text())
assert saved["cursor"] == "abc"
assert saved["repos"]["keep/me"]["nameWithOwner"] == "keep/me"
`;
  const result = spawnSync('python3', ['-c', code], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('python prioritizer requests only the remaining page size and resets finished cycles', () => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'star-opt-limit-'));
  const stateFile = path.join(tmp, 'state.json');
  const code = `
import importlib.util
import json

spec = importlib.util.spec_from_file_location("prioritize_stars", r"${SCRIPT}")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Response:
    def __init__(self, payload):
        self.status_code = 200
        self.headers = {}
        self._payload = payload
    def raise_for_status(self):
        return None
    def json(self):
        return self._payload

class Client:
    def __init__(self):
        self.calls = []
    def post(self, _url, json=None, headers=None):
        self.calls.append(json)
        return Response({
            "data": {
                "viewer": {
                    "starredRepositories": {
                        "pageInfo": {"hasNextPage": True, "endCursor": "cursor-1"},
                        "edges": [{
                            "starredAt": "2026-08-08T00:00:00Z",
                            "node": {
                                "nameWithOwner": "fresh/repo",
                                "url": "https://github.com/fresh/repo",
                                "stargazerCount": 1,
                                "pushedAt": "2026-08-08T00:00:00Z",
                                "releases": {"nodes": []},
                                "repositoryTopics": {"nodes": []}
                            }
                        }]
                    }
                }
            }
        })
    def close(self):
        return None

client = Client()
state = {"cursor": "stale-cursor", "has_next": False, "repos": {"old/repo": {"nameWithOwner": "old/repo"}}}
repos = module.fetch_starred_repos(state, limit=1, state_path=r"${stateFile}", client=client)
assert len(repos) == 1
assert repos[0]["nameWithOwner"] == "fresh/repo"
assert "old/repo" not in state["repos"]
assert client.calls[0]["variables"]["cursor"] is None
assert client.calls[0]["variables"]["pageSize"] == 1
`;
  const result = spawnSync('python3', ['-c', code], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test('secrets map documents GH_PAT for star optimizer', () => {
  const text = fs.readFileSync(SECRETS, 'utf8');
  assert.match(text, /GH_PAT/);
  assert.match(text, /prioritize-stars/);
});
