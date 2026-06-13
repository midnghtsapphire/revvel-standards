#!/usr/bin/env python3
"""
Vercel sync — auto-fill live_url in docs/app-deployments.yml from Vercel.

No-op (exit 0) unless a VERCEL_TOKEN env var is present, so it's safe to wire
into CI now and "turn on" later just by adding the secret. Optional VERCEL_TEAM_ID.

Matches Vercel project name == app key in the manifest, takes the latest READY
production deployment, and writes its https URL back.

API failures (e.g. a 401 from a bad token) are surfaced as a clear ERROR rather
than silently producing "updated 0" — but the script still exits 0 so the rest
of the audit pipeline runs.

Requires: requests, PyYAML
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "docs", "app-deployments.yml")

TOKEN = os.environ.get("VERCEL_TOKEN", "").strip()
TEAM = os.environ.get("VERCEL_TEAM_ID", "").strip()


def list_all_projects(requests, headers, team_q):
    """Paginate through every Vercel project (v9 cursor pagination)."""
    projects, params = [], {**team_q, "limit": 100}
    while True:
        resp = requests.get("https://api.vercel.com/v9/projects",
                            headers=headers, params=params, timeout=30)
        resp.raise_for_status()
        body = resp.json()
        projects.extend(body.get("projects", []))
        nxt = (body.get("pagination") or {}).get("next")
        if not nxt:
            return projects
        params = {**team_q, "limit": 100, "until": nxt}


def latest_prod_url(requests, headers, team_q, project_id):
    resp = requests.get("https://api.vercel.com/v6/deployments", headers=headers,
                        params={**team_q, "projectId": project_id, "target": "production",
                                "state": "READY", "limit": 1}, timeout=30)
    resp.raise_for_status()
    deps = resp.json().get("deployments", [])
    if not deps:
        return ""
    host = deps[0].get("url", "")
    if not host:
        return ""
    return host if host.startswith("http") else f"https://{host}"


def main():
    if not TOKEN:
        print("vercel_sync: no VERCEL_TOKEN — skipping (manifest unchanged).")
        return 0
    try:
        import requests
        import yaml
    except ImportError as e:
        print(f"vercel_sync: missing dep ({e}); skipping.")
        return 0

    headers = {"Authorization": f"Bearer {TOKEN}"}
    team_q = {"teamId": TEAM} if TEAM else {}

    with open(MANIFEST, encoding="utf-8") as f:
        text = f.read()
    manifest = yaml.safe_load(text) or {}
    app_keys = set((manifest.get("apps") or {}).keys())
    deploy_project = ((manifest.get("deployment") or {}).get("project") or "").strip()

    try:
        projects = list_all_projects(requests, headers, team_q)
    except Exception as e:
        # Surface auth/API failures loudly instead of masking them as "updated 0".
        print(f"vercel_sync: ERROR talking to Vercel API ({e}); manifest unchanged.", file=sys.stderr)
        return 0

    updated = 0
    # Fill deployment.base_url from the single docs-serving project, so every app
    # gets a working <base_url>/docs/<app>/ link.
    if deploy_project:
        proj = next((p for p in projects if p.get("name") == deploy_project), None)
        if proj:
            try:
                base = latest_prod_url(requests, headers, team_q, proj.get("id"))
            except Exception as e:
                print(f"vercel_sync: ERROR fetching base deployment ({e}).", file=sys.stderr)
                base = ""
            if base:
                pat = re.compile(r'(?m)^(\s*base_url:\s*")[^"\n]*(")')
                new, n = pat.subn(rf'\g<1>{base}\g<2>', text)
                if n:
                    text = new
                    updated += 1
                    print(f"  deployment.base_url -> {base}")

    for proj in projects:
        name = proj.get("name", "")
        if name not in app_keys:
            continue
        try:
            url = latest_prod_url(requests, headers, team_q, proj.get("id"))
        except Exception as e:
            print(f"vercel_sync: ERROR fetching deployments for {name} ({e}); skipping.", file=sys.stderr)
            continue
        if not url:
            continue
        # Line-anchored replace of this exact app's live_url. Anchoring on
        # start-of-line + exact key + ':' prevents a short name from matching
        # inside a longer key (e.g. 'saas' inside 'lead-saas'). Assumes the
        # repo's flow-style manifest (one app per line).
        pat = re.compile(rf'(?m)^(\s*{re.escape(name)}:\s*\{{[^}}\n]*?live_url:\s*")[^"\n]*(")')
        new, n = pat.subn(rf'\g<1>{url}\g<2>', text)
        if n:
            text = new
            updated += 1
            print(f"  {name} -> {url}")

    if updated:
        with open(MANIFEST, "w", encoding="utf-8") as f:
            f.write(text)
    print(f"vercel_sync: updated {updated} live URL(s).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
