#!/usr/bin/env python3
"""Export open WRs as Roo-Code prompt packs.

Usage:
    python scripts/export_wr_queue.py                 # all open WRs -> wr/roo-queue/
    python scripts/export_wr_queue.py --issue 18392   # single WR

Writes one Markdown file per WR: title, body, repo, labels, plus the fleet
conventions header Roo must follow (branch naming, LEDGER rules, no secrets).
Requires GITHUB_READ_TOKEN (or GITHUB_TOKEN) in the environment.
"""
import argparse, json, os, re, sys, urllib.request

OWNER = "midnghtsapphire"
API = "https://api.github.com"
TOKEN = os.environ.get("GITHUB_READ_TOKEN") or os.environ.get("GITHUB_TOKEN")
OUT_DIR = os.path.join("wr", "roo-queue")

HEADER = """# Roo task pack — {repo}#{num}: {title}

Repo: {owner}/{repo}
WR: #{num} — {url}
Labels: {labels}
State: {state} | Created: {created}

## Fleet conventions (binding)

- Branch: `roo/wr-{num}-<slug>`; one PR per WR; PR body links `Closes #{num}`.
- Comment `Claiming — Roo` and self-assign before coding.
- Append-only files (LEDGER.md, CHANGELOG.md, decisions.jsonl): append, never rewrite.
- New behavior ships with tests where a suite exists. No secrets in git.
- Ambiguous acceptance criteria: comment on the issue and stop. Do not guess.
- Do not merge your own PR.

## WR body

{body}
"""

def gh(path, params=None):
    qs = ""
    if params:
        from urllib.parse import urlencode
        qs = "?" + urlencode(params)
    req = urllib.request.Request(API + path + qs, headers={
        "Authorization": f"Bearer {TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "revvel-wr-exporter",
    })
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

def is_wr(issue):
    if "pull_request" in issue:
        return False
    t = issue.get("title", "")
    return bool(re.search(r"\bWR\b|work request", t, re.I)) or \
           any(l["name"].lower() in ("wr", "work-request") for l in issue.get("labels", []))

def export(issue):
    repo = issue["repository_url"].split("/")[-1]
    num = issue["number"]
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, f"WR-{repo}-{num}.md")
    with open(path, "w") as f:
        f.write(HEADER.format(
            repo=repo, num=num, owner=OWNER,
            title=issue["title"].strip(),
            url=issue["html_url"],
            labels=", ".join(l["name"] for l in issue.get("labels", [])) or "none",
            state=issue["state"], created=issue["created_at"],
            body=(issue.get("body") or "(empty body)").strip(),
        ))
    return path

def main():
    if not TOKEN:
        sys.exit("Set GITHUB_READ_TOKEN or GITHUB_TOKEN.")
    ap = argparse.ArgumentParser()
    ap.add_argument("--issue", type=int, help="single issue number (needs --repo)")
    ap.add_argument("--repo", default="revvel-standards")
    args = ap.parse_args()

    if args.issue:
        issues = [gh(f"/repos/{OWNER}/{args.repo}/issues/{args.issue}")]
    else:
        issues, page = [], 1
        while True:
            batch = gh("/search/issues", {
                "q": f"is:issue is:open user:{OWNER}",
                "per_page": 100, "page": page})
            issues += batch.get("items", [])
            if len(issues) >= batch.get("total_count", 0) or page >= 10:
                break
            page += 1
        issues = [i for i in issues if is_wr(i)]

    for i in issues:
        print("wrote", export(i))
    print(f"{len(issues)} WR prompt pack(s) in {OUT_DIR}/")

if __name__ == "__main__":
    main()
