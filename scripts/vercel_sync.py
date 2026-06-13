#!/usr/bin/env python3
"""
Vercel sync — auto-fill live_url in docs/app-deployments.yml from Vercel.

No-op (exit 0) unless a VERCEL_TOKEN env var is present, so it's safe to wire
into CI now and "turn on" later just by adding the secret. Optional VERCEL_TEAM_ID.

Matches Vercel project name == app key in the manifest, takes the latest READY
production deployment, and writes its https URL back — preserving file formatting
via targeted replacement.

Requires: requests, PyYAML
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "docs", "app-deployments.yml")

TOKEN = os.environ.get("VERCEL_TOKEN", "").strip()
TEAM = os.environ.get("VERCEL_TEAM_ID", "").strip()


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

    try:
        projects = requests.get("https://api.vercel.com/v9/projects",
                                headers=headers, params={**team_q, "limit": 100}, timeout=30).json().get("projects", [])
    except Exception as e:
        print(f"vercel_sync: project list failed ({e}); skipping.")
        return 0

    updated = 0
    for proj in projects:
        name = proj.get("name", "")
        if name not in app_keys:
            continue
        try:
            deps = requests.get("https://api.vercel.com/v6/deployments", headers=headers,
                                params={**team_q, "projectId": proj.get("id"), "target": "production",
                                        "state": "READY", "limit": 1}, timeout=30).json().get("deployments", [])
        except Exception:
            continue
        if not deps:
            continue
        host = deps[0].get("url", "")
        if not host:
            continue
        url = host if host.startswith("http") else f"https://{host}"
        # targeted replace of this app's live_url, formatting preserved
        pat = re.compile(rf'(\b{re.escape(name)}:\s*\{{[^}}]*?live_url:\s*")[^"]*(")')
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
