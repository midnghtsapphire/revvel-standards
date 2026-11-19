"""Mocked HTTP tests for scripts/zero_touch_secrets.py. No network. No real secrets."""

import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "zero_touch_secrets", ROOT / "scripts" / "zero_touch_secrets.py"
)
z = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(z)

OLD = "old-value-aaaaaaaa"
NEW = "new-value-bbbbbbbb"
TOKEN = "doppler-token-cccccccc"
CIRCLE = "circle-token-dddddddd"


class FakeHTTP:
    def __init__(self):
        self.calls = []
        self.routes = []

    def add(self, method, part, status, payload):
        self.routes.append((method, part, status, payload))

    def __call__(self, method, url, headers, body):
        self.calls.append({"method": method, "url": url, "headers": headers, "body": body})
        for route_method, part, status, payload in self.routes:
            if method == route_method and part in url:
                return status, payload
        return 404, {}


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    z.HELD.clear()
    saved = dict(z.ROTATE_HOOKS)
    for key in (
        "DOPPLER_TOKEN",
        "CIRCLE_TOKEN",
        "GITHUB_PAT",
        "ADMIN_GITHUB_TOKEN",
        "SECRETS_APPLY",
        "SECRETS_ALLOW_UNVERSIONED",
        "DOPPLER_PROJECT",
        "DOPPLER_CONFIG",
    ):
        monkeypatch.delenv(key, raising=False)
    yield
    z.ROTATE_HOOKS.clear()
    z.ROTATE_HOOKS.update(saved)
    z.HELD.clear()


def _ledger(value, version=1, updated_at="2020-01-01T00:00:00Z", history=None):
    return {
        "secrets": {
            "OPENROUTER_API_KEY": {
                "version": version,
                "updated_at": updated_at,
                "sha256": z.sha256_text(value),
            }
        },
        "history": list(history or []),
        "targets": {},
    }


def _doppler_body(value, ledger):
    return {
        "secrets": {
            "OPENROUTER_API_KEY": {"raw": value, "computed": value},
            z.LEDGER_SECRET: {"raw": json.dumps(ledger), "computed": json.dumps(ledger)},
        }
    }


def test_decide_write_refuses_older_source():
    assert z.decide_write(None, None, False, None, None)[0] == "write"
    action, reason = z.decide_write(
        "2020-01-01T00:00:00Z",
        "2030-01-01T00:00:00Z",
        True,
        1,
        None,
    )
    assert action == "skip"
    assert "newer" in reason
    assert z.decide_write("2030-01-01T00:00:00Z", "2020-01-01T00:00:00Z", True, 2, 1)[0] == "write"
    assert z.decide_write("2020-01-01T00:00:00Z", None, True, None, None)[0] == "skip"
    assert z.decide_write("2020-01-01T00:00:00Z", None, True, 2, 2)[0] == "skip"
    assert z.decide_write("2020-01-01T00:00:00Z", None, True, 3, 2)[0] == "write"
    assert z.decide_write(
        "2026-11-19T00:00:00Z", None, True, 4, None, authoritative=True
    )[0] == "write"
    dated = z.decide_write(None, "2030-01-01T00:00:00Z", True, None, None)
    assert dated[0] == "skip"
    assert "refusing" in dated[1]


def test_commit_rotation_keeps_previous_versions():
    ledger = _ledger(OLD, history=[{"name": "OPENROUTER_API_KEY", "version": 0, "value": "earlier-value-eeeeeeee"}])
    z.commit_rotation("OPENROUTER_API_KEY", OLD, NEW, ledger, "2026-11-19T00:00:00Z")
    assert ledger["history"][0]["value"] == "earlier-value-eeeeeeee"
    assert ledger["history"][-1]["value"] == OLD
    assert ledger["secrets"]["OPENROUTER_API_KEY"]["version"] == 2
    assert ledger["secrets"]["OPENROUTER_API_KEY"]["sha256"] == z.sha256_text(NEW)


def test_seal_repo_and_org(capsys):
    import nacl.encoding
    import nacl.public

    secret = nacl.public.PrivateKey.generate()
    public_b64 = secret.public_key.encode(nacl.encoding.Base64Encoder).decode("utf-8")
    http = FakeHTTP()
    http.add("GET", "public-key", 200, {"key_id": "key-1", "key": public_b64})
    http.add("PUT", "/actions/secrets/", 204, {})

    repo = z.seal_and_set_secret(
        "revvel-standards", "OPENROUTER_API_KEY", OLD, token="github-token-ffffffff", transport=http
    )
    org = z.seal_and_set_secret(
        "midnghtsapphire",
        "OPENROUTER_API_KEY",
        OLD,
        org=True,
        token="github-token-ffffffff",
        transport=http,
    )

    puts = [call for call in http.calls if call["method"] == "PUT"]
    assert len(puts) == 2
    assert puts[0]["url"].endswith("/repos/midnghtsapphire/revvel-standards/actions/secrets/OPENROUTER_API_KEY")
    assert puts[1]["url"].endswith("/orgs/midnghtsapphire/actions/secrets/OPENROUTER_API_KEY")
    assert puts[1]["body"]["visibility"] == "private"
    assert "/actions/secrets/" in puts[0]["url"]
    assert not puts[0]["url"].endswith("/actions/secrets/")
    box = nacl.public.SealedBox(secret)
    for result in (repo, org):
        opened = box.decrypt(z.base64.b64decode(result["encrypted_value"]))
        assert opened.decode("utf-8") == OLD
    assert OLD not in capsys.readouterr().out


def test_doppler_read_and_rotation_write(capsys, monkeypatch):
    monkeypatch.setenv("DOPPLER_TOKEN", TOKEN)
    monkeypatch.setenv("CIRCLE_TOKEN", CIRCLE)
    prior = [{"name": "OPENROUTER_API_KEY", "version": 0, "value": "earlier-value-eeeeeeee"}]
    ledger = _ledger(OLD, history=prior)
    http = FakeHTTP()
    http.add("GET", "api.doppler.com", 200, _doppler_body(OLD, ledger))
    http.add("POST", "api.doppler.com", 200, {})
    http.add("GET", "/context?", 200, {"items": [{"name": "ai-review-llm", "id": "ctx-1"}]})
    http.add("GET", "environment-variable", 200, {"items": []})
    http.add("PUT", "environment-variable", 200, {})
    http.add("GET", "/envvar", 200, {"items": []})
    http.add("POST", "/envvar", 200, {})

    def hook(name, current, env, apply=False):
        assert current == OLD
        return {"ok": True, "status": "rotated", "value": NEW}

    z.ROTATE_HOOKS["openrouter"] = hook
    secret_map = {
        "doppler": {"project": "revvel-standards", "config": "prd"},
        "priority_projects": ["gh/midnghtsapphire/linear-a"],
        "secrets": {
            "OPENROUTER_API_KEY": {
                "circleci_contexts": ["ai-review-llm"],
                "circleci_projects": ["gh/midnghtsapphire/revvel-standards"],
                "rotate_provider": "openrouter",
            }
        },
    }
    code = z.cmd_rotate(secret_map, ["OPENROUTER_API_KEY"], apply=True, transport=http)
    assert code == 0
    posts = [c for c in http.calls if c["method"] == "POST" and "api.doppler.com" in c["url"]]
    assert posts
    assert posts[0]["headers"]["Authorization"] == f"Bearer {TOKEN}"
    stored = posts[0]["body"]["secrets"]
    assert stored["OPENROUTER_API_KEY"] == NEW
    written_ledger = json.loads(stored[z.LEDGER_SECRET])
    assert written_ledger["history"][0]["value"] == "earlier-value-eeeeeeee"
    assert written_ledger["history"][-1]["value"] == OLD
    assert len(written_ledger["history"]) == 2
    puts = [c for c in http.calls if c["method"] == "PUT" and "environment-variable" in c["url"]]
    assert puts[0]["url"].endswith("/context/ctx-1/environment-variable/OPENROUTER_API_KEY")
    assert puts[0]["body"] == {"value": NEW}
    project_posts = [c for c in http.calls if c["method"] == "POST" and "/envvar" in c["url"]]
    slugs = [c["url"] for c in project_posts]
    assert any("gh/midnghtsapphire/revvel-standards/envvar" in url for url in slugs)
    assert any("gh/midnghtsapphire/linear-a/envvar" in url for url in slugs)
    out = capsys.readouterr().out
    for secret in (OLD, NEW, TOKEN, "earlier-value-eeeeeeee"):
        assert secret not in out


def test_circleci_fanout_skips_newer_destination(capsys, monkeypatch):
    monkeypatch.setenv("DOPPLER_TOKEN", TOKEN)
    monkeypatch.setenv("CIRCLE_TOKEN", CIRCLE)
    ledger = _ledger(OLD, updated_at="2020-01-01T00:00:00Z")
    http = FakeHTTP()
    http.add("GET", "api.doppler.com", 200, _doppler_body(OLD, ledger))
    http.add("POST", "api.doppler.com", 200, {})
    http.add("GET", "/context?", 200, {"items": [{"name": "ai-review-llm", "id": "ctx-1"}]})
    http.add(
        "GET",
        "environment-variable",
        200,
        {"items": [{"variable": "OPENROUTER_API_KEY", "updated_at": "2030-01-01T00:00:00Z"}]},
    )
    http.add("PUT", "environment-variable", 200, {})
    http.add(
        "GET",
        "/envvar",
        200,
        {"items": [{"name": "OPENROUTER_API_KEY", "updated_at": "2030-06-01T00:00:00Z"}]},
    )
    http.add("POST", "/envvar", 200, {})
    secret_map = {
        "doppler": {"project": "revvel-standards", "config": "prd"},
        "secrets": {
            "OPENROUTER_API_KEY": {
                "circleci_contexts": ["ai-review-llm"],
                "circleci_projects": ["gh/midnghtsapphire/revvel-standards"],
            }
        },
    }
    code = z.cmd_sync(secret_map, apply=True, transport=http)
    assert code == 3
    assert not [c for c in http.calls if c["method"] in ("PUT", "POST")]
    out = capsys.readouterr().out
    assert "SKIP" in out
    assert OLD not in out


def test_rotation_dry_run_does_not_write(capsys, monkeypatch):
    monkeypatch.setenv("DOPPLER_TOKEN", TOKEN)
    ledger = _ledger(OLD)
    http = FakeHTTP()
    http.add("GET", "api.doppler.com", 200, _doppler_body(OLD, ledger))
    http.add("POST", "api.doppler.com", 200, {})

    def hook(name, current, env, apply=False):
        return {"ok": True, "status": "rotated", "value": NEW}

    z.ROTATE_HOOKS["openrouter"] = hook
    secret_map = {
        "doppler": {"project": "revvel-standards", "config": "prd"},
        "secrets": {
            "OPENROUTER_API_KEY": {"rotate_provider": "openrouter", "circleci_contexts": []}
        },
    }
    code = z.cmd_rotate(secret_map, ["OPENROUTER_API_KEY"], apply=False, transport=http)
    assert code == 0
    assert not [c for c in http.calls if c["method"] == "POST"]
    out = capsys.readouterr().out
    assert "WOULD-ROTATE" in out
    assert "dry-run: no writes" in out
    assert NEW not in out
    assert OLD not in out


def test_secret_map_names_and_disabled_writers():
    data = z.load_map(str(ROOT / "config" / "secret-map.json"))
    assert data["doppler"] == {"project": "revvel-standards", "config": "prd"}
    assert data["priority_projects"] == [
        "gh/midnghtsapphire/revvel-standards",
        "gh/midnghtsapphire/linear-a",
    ]
    llm = data["secrets"]["OPENROUTER_API_KEY"]["circleci_contexts"]
    notion = data["secrets"]["NOTION_TOKEN"]["circleci_contexts"]
    flag = data["secrets"]["REVVEL_LLM_ALLOW_CLOUD"]["circleci_contexts"]
    db = data["secrets"]["NOTION_GATE_EXCEPTIONS_DB_ID"]["circleci_contexts"]
    admin = data["secrets"]["ADMIN_GITHUB_TOKEN"]["circleci_contexts"]
    assert llm == notion == flag == db == ["ai-review-llm"]
    assert admin == ["ai-review-post"]
    blob = json.dumps(data)
    assert z.SECRET_VALUE.search(blob) is None

    gatekeeper = (ROOT / "gatekeeper-cli/gatekeeper_cli/commands/gatekeeper.py").read_text()
    live = [line for line in gatekeeper.splitlines() if "set_repo_secret" in line and not line.strip().startswith("#")]
    assert live == []
    assert "Sync writes are disabled (Secret 2026-11-19)" in gatekeeper

    wrapper = (ROOT / "revvel-rosette-automation/scripts/gatekeeper.sh").read_text()
    assert "writes are disabled (Secret 2026-11-19)" in wrapper
    assert "\nexec " not in wrapper

    homeostat = (ROOT / "scripts/biome/homeostat.js").read_text()
    assert "Doppler recovery dispatch is disabled (Secret 2026-11-19)" in homeostat
    live_dispatch = [
        line
        for line in homeostat.splitlines()
        if "actions/workflows" in line and not line.strip().startswith("//")
    ]
    assert live_dispatch == []
