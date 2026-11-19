#!/usr/bin/env python3
"""zero_touch_secrets.py — broker / acquirer / leak-response for free-tier secrets.
Closes WR #18273 + #18270. No paid services: GitHub Secrets API + age + gh CLI.
Values are never printed, logged, or committed.

2026-11-19 Secret, after Audrey Evans said to build the free Doppler plan plus
this script (issue #18486). Doppler's free Developer plan is the source of
truth. DOPPLER_TOKEN (a service token) reads and writes it. Fan-out targets
are CircleCI project env vars, CircleCI context env vars, and GitHub Actions
secrets. GitHub Actions is only a sync target: hosted runs are billing-locked,
so the schedule is the CircleCI secrets-sync job. A sync compares the Doppler
version timestamp with the destination and refuses to overwrite a newer copy.
"""

import argparse
import base64
import getpass
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone

OWNER = "midnghtsapphire"
VAULT = os.path.expanduser("~/.config/revvel/secrets.age")
SECRET_MAP = "config/secret-map.json"
DOPPLER_API = "https://api.doppler.com/v3"
CIRCLE_API = "https://circleci.com/api/v2"
GITHUB_API = "https://api.github.com"
LEDGER_SECRET = "REVVEL_SECRET_LEDGER"
DEFAULT_TRANSPORT = None
HELD = set()
# Previous values stay in the Doppler ledger. These hooks do not call a
# provider. Where a provider has no rotate API, the hook reports "manual"
# and the script does not invent a value.
ROTATE_HOOKS = {}


def gh_api(method, path, payload=None, token=None):
    token = token or os.environ.get("GITHUB_PAT", "")
    req = urllib.request.Request(
        f"https://api.github.com{path}",
        method=method,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        data=json.dumps(payload).encode() if payload else None,
    )
    return json.load(urllib.request.urlopen(req, timeout=20))


def vault_load():
    if not os.path.exists(VAULT):
        return {}
    out = subprocess.run(["age", "-d", VAULT], capture_output=True, text=True)
    return json.loads(out.stdout) if out.returncode == 0 else {}


def vault_save(data):
    os.makedirs(os.path.dirname(VAULT), exist_ok=True)
    key_file = os.path.expanduser("~/.config/revvel/age-key.txt")
    if not os.path.exists(key_file):
        sys.exit("age key missing: run `age-keygen -o ~/.config/revvel/age-key.txt` once")
    pub = subprocess.run(["age-keygen", "-y", key_file], capture_output=True, text=True).stdout.strip()
    subprocess.run(["age", "-r", pub, "-o", VAULT], input=json.dumps(data), text=True, check=True)


def hold(value):
    """Remember a value so emit() cannot print it. Short flags are not held."""
    if isinstance(value, str) and len(value) >= 8:
        HELD.add(value)


def emit(message):
    text = str(message)
    for secret in HELD:
        if secret and secret in text:
            raise SystemExit("refusing to print a secret value")
    print(text)


def seal_value(public_key_b64, value):
    """Seal a string with libsodium crypto_box_seal (GitHub's required box)."""
    import nacl.encoding
    import nacl.public

    key = nacl.public.PublicKey(public_key_b64.encode("utf-8"), nacl.encoding.Base64Encoder)
    sealed = nacl.public.SealedBox(key).encrypt(value.encode("utf-8"))
    return base64.b64encode(sealed).decode("utf-8")


def github_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    }


def seal_and_set_secret(
    repo,
    name,
    value,
    org=False,
    visibility="private",
    owner=None,
    token=None,
    transport=None,
    selected_repository_ids=None,
):
    """PUT a libsodium-sealed value to the GitHub Actions secrets API.

    repo=False (the default) writes /repos/{owner}/{repo}/actions/secrets/{name}.
    org=True writes /orgs/{repo}/actions/secrets/{name} and sends visibility.
    The 2026-11-19 edit removed the empty-name PUT that preceded the real one.
    """
    owner = owner or OWNER
    token = token or os.environ.get("GITHUB_PAT") or os.environ.get("ADMIN_GITHUB_TOKEN") or ""
    hold(value)
    if org:
        base = f"/orgs/{repo}/actions/secrets"
    else:
        base = f"/repos/{owner}/{repo}/actions/secrets"
    public_key = http_request(
        "GET",
        f"{GITHUB_API}{base}/public-key",
        headers=github_headers(token),
        transport=transport,
    )
    encrypted = seal_value(public_key["key"], value)
    payload = {"encrypted_value": encrypted, "key_id": public_key["key_id"]}
    if org:
        payload["visibility"] = visibility
        if visibility == "selected":
            payload["selected_repository_ids"] = list(selected_repository_ids or [])
    http_request(
        "PUT",
        f"{GITHUB_API}{base}/{name}",
        headers=github_headers(token),
        body=payload,
        transport=transport,
    )
    return {"path": f"{base}/{name}", "key_id": public_key["key_id"], "encrypted_value": encrypted}


CHECKLIST = {
    "openrouter": "openrouter.ai → Keys → Create Key",
    "digitalocean": "cloud.digitalocean.com → API → Tokens → Generate New Token",
    "cloudflare": "dash.cloudflare.com → My Profile → API Tokens → Create Token",
    "supabase": "supabase.com → Project → Settings → API → anon + service_role keys",
    "elevenlabs": "elevenlabs.io → Profile → API Key",
    "github_pat": "github.com → Settings → Developer settings → Fine-grained tokens",
}

ROTATION = {
    "openrouter": "openrouter.ai → Keys → delete leaked key → Create Key",
    "digitalocean": "cloud.digitalocean.com → API → Tokens → delete → regenerate",
    "cloudflare": "dash.cloudflare.com → API Tokens → Roll token",
    "supabase": "Project Settings → API → Generate new JWT secret (invalidates both keys)",
    "github_webhook": "Provider console → regenerate signing secret → scripts/setup-mcp-endpoints.sh \
--rotate-hook-secret",
}

# Leak-response service ids from the legacy map, and the Doppler names they write.
SERVICE_TO_DOPPLER = {
    "openrouter": "OPENROUTER_API_KEY",
    "github_pat": "ADMIN_GITHUB_TOKEN",
}

# Token-shaped strings only. A short prefix such as "sk-" also appears inside
# ordinary words ("desk-", "task-") and must not reject the name map.
SECRET_VALUE = re.compile(
    r"(\bdp\.(?:pt|st)\.[A-Za-z0-9]{10,}"
    r"|\bghp_[A-Za-z0-9]{20,}"
    r"|\bgithub_pat_[A-Za-z0-9_]{20,}"
    r"|\bsk-[A-Za-z0-9_-]{16,}"
    r"|\bxoxb-[A-Za-z0-9-]{10,}"
    r"|\bntn_[A-Za-z0-9]{10,})"
)


def _manual_hook(detail):
    def hook(name, current, env, apply=False):
        return {"ok": False, "status": "manual", "detail": detail}

    return hook


def register_default_hooks():
    """Register console-path hooks. They never mint a value."""
    manuals = dict(ROTATION)
    manuals["github"] = (
        "github.com → Settings → Developer settings → Fine-grained tokens → regenerate"
    )
    manuals["notion"] = "www.notion.so → Settings → Connections → regenerate the integration secret"
    for provider, detail in manuals.items():
        ROTATE_HOOKS[provider] = _manual_hook(detail)


def http_request(method, url, headers=None, body=None, transport=None):
    """Return parsed JSON. Raises RuntimeError with status and path, never the body."""
    transport = DEFAULT_TRANSPORT if transport is None else transport
    if transport is None:
        status, parsed = _urllib_transport(method, url, headers, body)
    else:
        status, parsed = transport(method, url, headers or {}, body)
    if status >= 400:
        raise RuntimeError(f"{method} {url.split('?', 1)[0]} -> {status}")
    return parsed if isinstance(parsed, dict) else {}


def _urllib_transport(method, url, headers, body):
    data = None
    if body is not None:
        data = body if isinstance(body, bytes) else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            status = getattr(resp, "status", 200)
    except urllib.error.HTTPError as exc:
        raw = exc.read()
        status = exc.code
    if not raw:
        return status, {}
    try:
        return status, json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError:
        return status, {}


def doppler_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def circle_headers(token):
    return {
        "Circle-Token": token,
        "Accept": "application/json",
        "Content-Type": "application/json",
    }


def doppler_list(project, config, token, transport=None):
    query = urllib.parse.urlencode({"project": project, "config": config})
    data = http_request(
        "GET",
        f"{DOPPLER_API}/configs/config/secrets?{query}",
        headers=doppler_headers(token),
        transport=transport,
    )
    secrets = data.get("secrets") or {}
    return secrets if isinstance(secrets, dict) else {}


def doppler_write(project, config, mapping, token, transport=None):
    """POST name→value strings. Callers must not log `mapping`."""
    http_request(
        "POST",
        f"{DOPPLER_API}/configs/config/secrets",
        headers=doppler_headers(token),
        body={"project": project, "config": config, "secrets": mapping},
        transport=transport,
    )


def secret_plain(entry):
    if not isinstance(entry, dict):
        return ""
    if entry.get("computed") is not None:
        return str(entry["computed"])
    if entry.get("raw") is not None:
        return str(entry["raw"])
    value = entry.get("value")
    if isinstance(value, dict):
        return str(value.get("computed") or value.get("raw") or "")
    if isinstance(value, str):
        return value
    return ""


def plains(secrets):
    values = {}
    for name, entry in secrets.items():
        if name == LEDGER_SECRET:
            continue
        text = secret_plain(entry)
        hold(text)
        values[name] = text
    return values


def sha256_text(value):
    return hashlib.sha256((value or "").encode("utf-8")).hexdigest()


def now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_ts(value):
    if not value:
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def read_ledger(secrets):
    """Ledger lives in Doppler under REVVEL_SECRET_LEDGER. History is append-only."""
    text = secret_plain(secrets.get(LEDGER_SECRET) or {})
    if not text:
        return {"secrets": {}, "history": [], "targets": {}}
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return {"secrets": {}, "history": [], "targets": {}}
    if not isinstance(data, dict):
        return {"secrets": {}, "history": [], "targets": {}}
    data.setdefault("secrets", {})
    data.setdefault("history", [])
    data.setdefault("targets", {})
    return data


def source_meta(ledger, name, current_value):
    """Trust the stored timestamp only when the value still matches its sha256."""
    entry = (ledger.get("secrets") or {}).get(name)
    if not entry:
        return {"version": None, "updated_at": None}
    if entry.get("sha256") != sha256_text(current_value):
        return {"version": entry.get("version"), "updated_at": None, "drift": True}
    return {"version": entry.get("version"), "updated_at": entry.get("updated_at")}


def decide_write(
    source_updated_at,
    dest_updated_at,
    dest_exists,
    source_version,
    pushed_version,
    allow_unversioned=False,
    authoritative=False,
):
    """Return (action, reason). Never overwrite a newer destination.

    Doppler once copied stale values over fresh tokens (docs/tool-history/doppler.md,
    Apr–Aug 2026). A destination with no timestamp is treated as possibly newer.
    `authoritative` is accepted and ignored: stamping "now" after a write must
    not overwrite a CircleCI var that has no updated_at.
    """
    del authoritative
    source_dt = parse_ts(source_updated_at)
    dest_dt = parse_ts(dest_updated_at)
    if not dest_exists:
        return "write", "destination absent"
    if dest_dt is not None and source_dt is not None and dest_dt > source_dt:
        return "skip", "destination timestamp is newer than Doppler"
    if dest_dt is not None and source_dt is not None and dest_dt == source_dt:
        return "skip", "timestamps match; Doppler is not newer"
    if dest_dt is not None and source_dt is not None:
        return "write", "Doppler timestamp is newer"
    if dest_dt is not None and source_dt is None:
        return "skip", "Doppler has no version timestamp; refusing to overwrite a dated destination"
    if source_version is not None and pushed_version is not None:
        if int(source_version) > int(pushed_version):
            return "write", "Doppler version is newer than the last push"
        return "skip", "destination already has this Doppler version"
    if allow_unversioned and source_dt is not None:
        return "write", "unversioned destination allowed by SECRETS_ALLOW_UNVERSIONED"
    return "skip", "destination exists without a timestamp; refusing to overwrite a possibly newer value"


def commit_rotation(name, old_value, new_value, ledger, retired_at):
    """Append the previous value. Does not remove history entries."""
    history = ledger.setdefault("history", [])
    current = (ledger.get("secrets") or {}).get(name) or {}
    if old_value:
        history.append(
            {
                "name": name,
                "version": current.get("version"),
                "updated_at": current.get("updated_at"),
                "sha256": sha256_text(old_value),
                "value": old_value,
                "retired_at": retired_at,
            }
        )
    version = int(current.get("version") or 0) + 1
    ledger.setdefault("secrets", {})[name] = {
        "version": version,
        "updated_at": retired_at,
        "sha256": sha256_text(new_value),
    }
    return ledger


def assert_names_only(data):
    if SECRET_VALUE.search(json.dumps(data)):
        raise SystemExit("config/secret-map.json has a secret-looking value; names only")


def load_map(path):
    with open(path, encoding="utf-8") as handle:
        data = json.load(handle)
    assert_names_only(data)
    return data


def doppler_target(secret_map):
    block = secret_map.get("doppler") or {}
    project = os.environ.get("DOPPLER_PROJECT") or block.get("project") or "revvel-standards"
    config = os.environ.get("DOPPLER_CONFIG") or block.get("config") or "prd"
    return project, config


def targets_for(name, spec, priority_projects):
    targets = []
    for ctx in spec.get("circleci_contexts") or []:
        targets.append({"kind": "circleci_context", "name": ctx, "secret": name})
    slugs = []
    for proj in list(spec.get("circleci_projects") or []) + list(priority_projects or []):
        slug = proj if isinstance(proj, str) else (proj or {}).get("slug")
        if slug and slug not in slugs:
            slugs.append(slug)
    for slug in slugs:
        targets.append({"kind": "circleci_project", "slug": slug, "secret": name})
    for repo in spec.get("github_repos") or []:
        targets.append({"kind": "github_repo", "repo": repo, "secret": name})
    org = spec.get("github_org")
    if org:
        org_name = org if isinstance(org, str) else OWNER
        targets.append({"kind": "github_org", "org": org_name, "secret": name})
    return targets


def target_key(target):
    kind = target["kind"]
    if kind == "circleci_context":
        ident = target["name"]
    elif kind == "circleci_project":
        ident = target["slug"]
    elif kind == "github_repo":
        ident = target["repo"]
    else:
        ident = target.get("org", "")
    return f"{kind}:{ident}:{target['secret']}"


def describe_target(target):
    kind = target["kind"]
    if kind == "circleci_context":
        where = f"circleci context {target['name']}"
    elif kind == "circleci_project":
        where = f"circleci project {target['slug']}"
    elif kind == "github_repo":
        where = f"github repo {target['repo']}"
    else:
        where = f"github org {target.get('org')}"
    row = {"secret": target["secret"], "kind": kind, "where": where, "key": target_key(target)}
    for field in ("name", "slug", "repo", "org", "context_id"):
        if target.get(field):
            row[field] = target[field]
    return row


def load_context_index(owner_slug, token, transport=None):
    index = {}
    page = None
    for _ in range(20):
        query = {"owner-slug": owner_slug}
        if page:
            query["page-token"] = page
        data = http_request(
            "GET",
            f"{CIRCLE_API}/context?{urllib.parse.urlencode(query)}",
            headers=circle_headers(token),
            transport=transport,
        )
        for item in data.get("items") or []:
            if item.get("name") and item.get("id"):
                index[item["name"]] = item["id"]
        page = data.get("next_page_token")
        if not page:
            break
    return index


def circle_items(url, token, transport=None):
    items = []
    page = None
    for _ in range(20):
        full = url
        if page:
            joiner = "&" if "?" in url else "?"
            full = f"{url}{joiner}page-token={urllib.parse.quote(page)}"
        data = http_request("GET", full, headers=circle_headers(token), transport=transport)
        items.extend(data.get("items") or [])
        page = data.get("next_page_token")
        if not page:
            break
    return items


def _timed(item):
    return item.get("updated_at") or item.get("created_at")


def make_dest_lookup(circle_token, github_token, owner_slug, transport=None):
    contexts = {}
    if circle_token:
        contexts = load_context_index(owner_slug, circle_token, transport)

    def lookup(target):
        kind = target["kind"]
        if kind in ("circleci_context", "circleci_project") and not circle_token:
            return {"exists": True, "updated_at": None, "unreadable": True}
        if kind == "circleci_context":
            cid = contexts.get(target["name"])
            if not cid:
                return {"exists": False, "missing_context": True}
            target["context_id"] = cid
            try:
                items = circle_items(
                    f"{CIRCLE_API}/context/{cid}/environment-variable",
                    circle_token,
                    transport,
                )
            except RuntimeError as exc:
                if "-> 404" in str(exc):
                    return {"exists": False, "missing_context": True}
                raise
            for item in items:
                if (item.get("variable") or item.get("name")) == target["secret"]:
                    return {"exists": True, "updated_at": _timed(item)}
            return {"exists": False, "updated_at": None}
        if kind == "circleci_project":
            try:
                items = circle_items(
                    f"{CIRCLE_API}/project/{target['slug']}/envvar",
                    circle_token,
                    transport,
                )
            except RuntimeError as exc:
                if "-> 404" in str(exc):
                    return {"exists": False, "missing_project": True}
                raise
            for item in items:
                if item.get("name") == target["secret"]:
                    return {"exists": True, "updated_at": item.get("updated_at")}
            return {"exists": False, "updated_at": None}
        if not github_token:
            return {"exists": True, "updated_at": None, "unreadable": True}
        return github_meta(target, github_token, transport)

    return lookup


def github_meta(target, token, transport=None):
    if target["kind"] == "github_org":
        url = f"{GITHUB_API}/orgs/{target['org']}/actions/secrets?per_page=100"
    else:
        url = f"{GITHUB_API}/repos/{OWNER}/{target['repo']}/actions/secrets?per_page=100"
    try:
        data = http_request("GET", url, headers=github_headers(token), transport=transport)
    except RuntimeError as exc:
        if "-> 404" in str(exc):
            return {"exists": False, "missing_project": True}
        raise
    for item in data.get("secrets") or []:
        if item.get("name") == target["secret"]:
            return {"exists": True, "updated_at": item.get("updated_at")}
    return {"exists": False, "updated_at": None}


def plan_fanout(
    secret_map,
    values,
    ledger,
    dest_lookup,
    allow_unversioned=False,
    authoritative=False,
    only_names=None,
):
    actions = []
    priority = secret_map.get("priority_projects") or []
    specs = secret_map.get("secrets") or {}
    pushed_map = ledger.get("targets") or {}
    for name, spec in specs.items():
        if name == LEDGER_SECRET:
            continue
        if only_names is not None and name not in only_names:
            continue
        targets = targets_for(name, spec, priority)
        if name not in values or not values.get(name):
            for target in targets:
                row = describe_target(target)
                row["action"] = "skip"
                row["reason"] = "name is not in Doppler"
                actions.append(row)
            continue
        meta = source_meta(ledger, name, values[name])
        for target in targets:
            info = dest_lookup(target)
            row = describe_target(target)
            if info.get("missing_context") or info.get("missing_project"):
                row["action"] = "skip"
                row["reason"] = "target is not created yet"
                actions.append(row)
                continue
            pushed = (pushed_map.get(row["key"]) or {}).get("pushed_version")
            action, reason = decide_write(
                meta.get("updated_at"),
                info.get("updated_at"),
                bool(info.get("exists")),
                meta.get("version"),
                pushed,
                allow_unversioned=allow_unversioned,
                authoritative=authoritative,
            )
            row["action"] = action
            row["reason"] = reason
            row["version"] = meta.get("version")
            actions.append(row)
    return actions


def push_one(row, value, circle_token, github_token, transport=None):
    kind = row["kind"]
    if kind == "circleci_context":
        secret_name = urllib.parse.quote(row["secret"], safe="")
        http_request(
            "PUT",
            f"{CIRCLE_API}/context/{row['context_id']}/environment-variable/{secret_name}",
            headers=circle_headers(circle_token),
            body={"value": value},
            transport=transport,
        )
        return
    if kind == "circleci_project":
        http_request(
            "POST",
            f"{CIRCLE_API}/project/{row['slug']}/envvar",
            headers=circle_headers(circle_token),
            body={"name": row["secret"], "value": value},
            transport=transport,
        )
        return
    if kind == "github_repo":
        seal_and_set_secret(row["repo"], row["secret"], value, token=github_token, transport=transport)
        return
    if kind == "github_org":
        seal_and_set_secret(
            row["org"], row["secret"], value, org=True, token=github_token, transport=transport
        )
        return
    raise RuntimeError("unknown target kind")


def apply_plan(actions, values, ledger, circle_token, github_token, transport=None):
    pushed = []
    failed = []
    for row in actions:
        if row["action"] != "write":
            continue
        version = row.get("version")
        if version is None:
            # Do not invent updated_at=now, and do not push. An old Doppler
            # value would then look newer than every dated destination.
            failed.append(row["where"] + " (no Doppler version record)")
            continue
        try:
            push_one(row, values[row["secret"]], circle_token, github_token, transport)
        except RuntimeError:
            failed.append(row["where"])
            continue
        ledger.setdefault("targets", {})[row["key"]] = {
            "pushed_version": version,
            "pushed_at": now_iso(),
        }
        pushed.append(row["key"])
    return pushed, failed


def _conflict_rows(actions):
    conflicts = []
    missing = []
    for row in actions:
        if row["action"] == "write":
            continue
        reason = row.get("reason") or ""
        if "newer" in reason or "refusing" in reason:
            conflicts.append(row)
        elif reason == "target is not created yet":
            missing.append(row)
    return conflicts, missing


def fan_out(secret_map, values, ledger, apply, only_names=None, transport=None, authoritative=False):
    circle_token = os.environ.get("CIRCLE_TOKEN", "")
    github_token = os.environ.get("GITHUB_PAT") or os.environ.get("ADMIN_GITHUB_TOKEN") or ""
    owner_slug = os.environ.get("CIRCLE_OWNER_SLUG") or "gh/midnghtsapphire"
    allow = os.environ.get("SECRETS_ALLOW_UNVERSIONED") == "1"
    lookup = make_dest_lookup(circle_token, github_token, owner_slug, transport)
    actions = plan_fanout(
        secret_map,
        values,
        ledger,
        lookup,
        allow_unversioned=allow,
        authoritative=authoritative,
        only_names=only_names,
    )
    for row in actions:
        emit(f"{row['action'].upper()} {row['secret']} -> {row['where']}: {row['reason']}")
    if not apply:
        emit("dry-run: no writes")
        return 0, actions
    pushed, failed = apply_plan(actions, values, ledger, circle_token, github_token, transport)
    if pushed:
        project, config = doppler_target(secret_map)
        doppler_write(
            project,
            config,
            {LEDGER_SECRET: json.dumps(ledger, sort_keys=True)},
            os.environ["DOPPLER_TOKEN"],
            transport,
        )
    conflicts, missing = _conflict_rows(actions)
    if failed or missing:
        return 1, actions
    if conflicts:
        return 3, actions
    return 0, actions


def cmd_sync(secret_map, apply, transport=None):
    token = os.environ.get("DOPPLER_TOKEN", "")
    if not token:
        emit("DOPPLER_TOKEN is not set")
        return 2
    project, config = doppler_target(secret_map)
    secrets = doppler_list(project, config, token, transport)
    values = plains(secrets)
    ledger = read_ledger(secrets)
    code, _actions = fan_out(secret_map, values, ledger, apply=apply, transport=transport)
    return code


def cmd_rotate(secret_map, names, apply, transport=None):
    token = os.environ.get("DOPPLER_TOKEN", "")
    if not token:
        emit("DOPPLER_TOKEN is not set")
        return 2
    project, config = doppler_target(secret_map)
    secrets = doppler_list(project, config, token, transport)
    values = plains(secrets)
    ledger = read_ledger(secrets)
    specs = secret_map.get("secrets") or {}
    chosen = list(names or [n for n, spec in specs.items() if spec.get("rotate_provider")])
    writes = []
    for name in chosen:
        provider = (specs.get(name) or {}).get("rotate_provider")
        hook = ROTATE_HOOKS.get(provider) if provider else None
        if hook is None:
            emit(f"MANUAL {name}: no rotate hook")
            continue
        outcome = hook(name, values.get(name, ""), os.environ, apply=apply)
        if not outcome.get("ok"):
            emit(f"MANUAL {name}: {outcome.get('detail') or outcome.get('status')}")
            continue
        if not apply:
            emit(f"WOULD-ROTATE {name}: previous version kept, no write")
            continue
        new_value = outcome.get("value") or ""
        hold(new_value)
        if not new_value:
            emit(f"MANUAL {name}: hook returned no value")
            continue
        commit_rotation(name, values.get(name, ""), new_value, ledger, now_iso())
        values[name] = new_value
        writes.append((name, new_value))
    if not apply:
        emit("dry-run: no writes")
        return 0
    if not writes:
        emit("rotate: nothing to write")
        return 0
    mapping = {name: new_value for name, new_value in writes}
    mapping[LEDGER_SECRET] = json.dumps(ledger, sort_keys=True)
    doppler_write(project, config, mapping, token, transport)
    code, _actions = fan_out(
        secret_map,
        values,
        ledger,
        apply=True,
        only_names={name for name, _value in writes},
        transport=transport,
        authoritative=True,
    )
    return code


def store_rotated_secret(name, new_value, transport=None):
    """Write one new value to Doppler, keep the previous one, then fan out."""
    hold(new_value)
    token = os.environ["DOPPLER_TOKEN"]
    secret_map = load_map(SECRET_MAP) if os.path.exists(SECRET_MAP) else {"secrets": {}}
    project, config = doppler_target(secret_map)
    secrets = doppler_list(project, config, token, transport)
    old = secret_plain(secrets.get(name) or {})
    hold(old)
    ledger = read_ledger(secrets)
    commit_rotation(name, old, new_value, ledger, now_iso())
    doppler_write(
        project,
        config,
        {name: new_value, LEDGER_SECRET: json.dumps(ledger, sort_keys=True)},
        token,
        transport,
    )
    values = plains(secrets)
    values[name] = new_value
    code, _actions = fan_out(
        secret_map,
        values,
        ledger,
        apply=True,
        only_names={name},
        transport=transport,
        authoritative=True,
    )
    return code


def broker_value(key, from_env, transport=None):
    """Doppler wins when DOPPLER_TOKEN is set. Otherwise env, then the age vault."""
    if os.environ.get("DOPPLER_TOKEN"):
        secret_map = load_map(SECRET_MAP) if os.path.exists(SECRET_MAP) else {}
        project, config = doppler_target(secret_map)
        secrets = doppler_list(project, config, os.environ["DOPPLER_TOKEN"], transport)
        plain = secret_plain(secrets.get(key) or {})
        hold(plain)
        if not plain:
            raise SystemExit("no value in Doppler for this name")
        return plain
    value = os.environ.get(from_env or "", "") or vault_load().get((key or "").lower(), "")
    hold(value)
    if not value:
        raise SystemExit("no value found (env var or vault)")
    return value


register_default_hooks()


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["broker", "acquire", "leak", "sync", "rotate"])
    ap.add_argument("--repo")
    ap.add_argument("--key")
    ap.add_argument("--from-env")
    ap.add_argument("--service")
    ap.add_argument("--checklist", action="store_true")
    ap.add_argument("--verify", action="store_true")
    ap.add_argument("--apply", action="store_true", help="write; default is dry-run for sync and rotate")
    ap.add_argument("--map", default=SECRET_MAP)
    ap.add_argument("--name", action="append", help="secret name to rotate")
    a = ap.parse_args(argv)

    if a.mode == "acquire":
        data = vault_load()
        for svc, path in CHECKLIST.items():
            print(f"\n▸ {svc}: {path}")
            v = getpass.getpass(f"  paste value for {svc} (hidden, Enter to skip): ")
            if v:
                data[svc] = v
        vault_save(data)
        print("\n✔ vault updated:", VAULT)

    elif a.mode == "broker":
        if a.verify:
            names = [s["name"] for s in gh_api("GET", f"/repos/{OWNER}/{a.repo}/actions/secrets")["secrets"]]
            print("secrets in", a.repo, ":", ", ".join(names))
            return
        value = broker_value(a.key, a.from_env)
        seal_and_set_secret(a.repo, a.key, value)
        emit(f"✔ {a.key} → {a.repo} (value never shown)")

    elif a.mode == "leak":
        print("1. Rotate:", ROTATION.get(a.service, "see provider console"))
        new = getpass.getpass("2. Paste NEW value (hidden): ")
        hold(new)
        doppler_rc = 0
        if new and os.environ.get("DOPPLER_TOKEN"):
            mapped = SERVICE_TO_DOPPLER.get(a.service)
            if mapped:
                try:
                    doppler_rc = store_rotated_secret(mapped, new)
                except RuntimeError:
                    emit(f"Doppler update failed for {mapped}")
                    doppler_rc = 1
        if new and os.path.exists(SECRET_MAP):
            sm = json.load(open(SECRET_MAP))
            entries = sm.get(a.service, [])
            if isinstance(entries, list):
                for item in entries:
                    if not (isinstance(item, (list, tuple)) and len(item) == 2):
                        continue
                    repo, keyname = item
                    try:
                        seal_and_set_secret(repo, keyname, new)
                    except RuntimeError:
                        emit(f"   GitHub update failed for {repo}/{keyname}")
                        doppler_rc = doppler_rc or 1
                        continue
                    emit(f"   ✔ updated {repo}/{keyname}")
        os.makedirs("docs/security", exist_ok=True)
        with open("docs/security/LEAK_LOG.md", "a") as f:
            import datetime

            f.write(f"- {datetime.date.today()} — {a.service} rotated (leak response)\n")
        print("3. ✔ logged. If leaked in an issue body: gh issue edit <num> --body '<redacted>'")
        return doppler_rc

    elif a.mode == "sync":
        return cmd_sync(load_map(a.map), apply=a.apply)

    elif a.mode == "rotate":
        return cmd_rotate(load_map(a.map), a.name, apply=a.apply)

    return 0


if __name__ == "__main__":
    sys.exit(main() or 0)
