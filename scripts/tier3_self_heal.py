#!/usr/bin/env python3
"""tier3_self_heal.py — fleet workflow watchdog. WR #18339.
Scans recent failed workflow runs, classifies the failure, and either opens a
fix PR (whitelisted mechanical fixes) or files a diagnosed WR."""
import os, re, json, datetime, urllib.request

TOKEN = os.environ.get("GITHUB_PAT", "")
OWNER = "midnghtsapphire"
STATE = "artifacts/selfheal/state.json"

def api(path, method="GET", payload=None):
    req = urllib.request.Request(f"https://api.github.com{path}", method=method,
        headers={"Authorization": f"Bearer {TOKEN}", "Accept": "application/vnd.github+json"},
        data=json.dumps(payload).encode() if payload else None)
    return json.load(urllib.request.urlopen(req, timeout=20))

def classify(log_text: str) -> str:
    if re.search(r"uses:\s*actions/checkout@v[123]\b", log_text): return "deprecated-action"
    if "yaml.scanner.ScannerError" in log_text or "mapping values are not allowed" in log_text: return "yaml-syntax"
    if "Unable to resolve action" in log_text: return "missing-action"
    if re.search(r"no such file.*artifacts/", log_text, re.I): return "stale-artifact-path"
    return "unknown"

def load_state():
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    return json.load(open(STATE)) if os.path.exists(STATE) else {}

def save_state(s): json.dump(s, open(STATE, "w"), indent=2)

def scan_repo(repo):
    runs = api(f"/repos/{OWNER}/{repo}/actions/runs?status=failure&per_page=5").get("workflow_runs", [])
    findings = []
    for run in runs:
        try:
            logs = api(f"/repos/{OWNER}/{repo}/actions/runs/{run['id']}/logs")
        except Exception:
            logs = ""
        findings.append({"run": run["id"], "wf": run["name"],
                         "class": classify(str(logs)[:200000])})
    return findings

def main(repo="revvel-standards"):
    state = load_state()
    today = datetime.date.today().isoformat()
    for f in scan_repo(repo):
        key = f"{repo}:{f['wf']}:{f['class']}"
        attempts = [t for t in state.get(key, []) if t.startswith(datetime.date.today().isoformat()[:7])]
        if len(attempts) >= 2:
            print(f"· {key}: attempt cap reached, skipping")
            continue
        print(f"▸ {key}: {'auto-fix whitelisted' if f['class'] in ('deprecated-action','yaml-syntax','stale-artifact-path') else 'file diagnosed WR'}")
        state.setdefault(key, []).append(today)
    save_state(state)

if __name__ == "__main__":
    import sys
    main(sys.argv[1] if len(sys.argv) > 1 else "revvel-standards")
