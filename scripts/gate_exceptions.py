#!/usr/bin/env python3
"""Gate exceptions: decide whether ONE specific check result is blocking or non-blocking.

TriageChief, 2026-11-19. WR: https://github.com/midnghtsapphire/revvel-standards/issues/18477

The exception table is a Notion database ("Gate Exceptions"), read at run time over the Notion
API. There is no YAML/CSV/JSON data file in this repo. Columns: check_id, result_match, scope,
enabled (number), reason, owner, created, expires, wr_link.

    enabled = 1  exception ACTIVE: a result that matches the row is non-blocking.
    enabled = 0  exception OFF: the result is enforced again (blocking).

Hard rules (enforced here, not by the table):
  * Real findings always block: findings must be supplied and be 0 for any exception to apply.
  * Real test failures always block (--test-failure, or a test/CI check name such as CircleCI).
  * A row can only switch off a specific result. Rows with an empty or wildcard-only
    result_match are ignored, so the table can never turn off a whole check.
  * Expired rows (today >= expires) and rows with enabled != 1 are ignored.
  * Fail closed: if Notion is unreachable or the response is bad, no exceptions are applied
    (everything blocks) and a clear message is logged to stderr.

Credentials come from the environment (CircleCI env vars): NOTION_TOKEN and
NOTION_GATE_EXCEPTIONS_DB_ID. They are never printed or logged.

CLI (exit code 0 = non-blocking, 1 = blocking):
    python3 scripts/gate_exceptions.py --check "Devin Review" \
        --result "Bugfinder incomplete" --repo midnghtsapphire/linear-a --findings 0
"""
from __future__ import annotations

import argparse
import datetime as dt
import fnmatch
import json
import os
import re
import sys
import urllib.error
import urllib.request

NOTION_VERSION = "2022-06-28"
API_ROOT = "https://api.notion.com/v1"
MIN_MATCH_LEN = 4  # result_match must carry at least this many non-wildcard characters

# Checks whose failures are real test/safety results. The table can never exempt these.
NEVER_EXEMPT_CHECK = re.compile(
    r"circleci|bugbot|gitguardian|sonarcloud|run_all|pytest|unit[ -]?test|\btests?\b", re.I
)

BLOCKING = "blocking"
NON_BLOCKING = "non-blocking"


def log(msg: str) -> None:
    print("gate_exceptions: " + msg, file=sys.stderr)


# --------------------------------------------------------------------------- Notion reading
def _text(prop) -> str:
    if not isinstance(prop, dict):
        return ""
    for key in ("title", "rich_text"):
        if key in prop:
            return "".join(p.get("plain_text", "") for p in prop[key] or []).strip()
    if "url" in prop:
        return (prop["url"] or "").strip()
    return ""


def _date(prop):
    d = (prop or {}).get("date") if isinstance(prop, dict) else None
    if not d or not d.get("start"):
        return None
    return dt.date.fromisoformat(d["start"][:10])


def _row(page: dict) -> dict:
    p = page.get("properties", {})
    num = (p.get("enabled") or {}).get("number")
    return {
        "check_id": _text(p.get("check_id")),
        "result_match": _text(p.get("result_match")),
        "scope": _text(p.get("scope")),
        "enabled": num,
        "reason": _text(p.get("reason")),
        "owner": _text(p.get("owner")),
        "created": _date(p.get("created")),
        "expires": _date(p.get("expires")),
        "wr_link": _text(p.get("wr_link")),
    }


def fetch_rows(token: str, db_id: str, timeout: float = 15.0) -> list:
    """Query the Notion database. Raises on any problem (caller fails closed)."""
    rows, cursor = [], None
    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        req = urllib.request.Request(
            "%s/databases/%s/query" % (API_ROOT, db_id),
            data=json.dumps(body).encode(),
            method="POST",
            headers={
                "Authorization": "Bearer " + token,
                "Notion-Version": NOTION_VERSION,
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode())
        rows.extend(_row(pg) for pg in data.get("results", []))
        if not data.get("has_more"):
            return rows
        cursor = data.get("next_cursor")


def load_rows() -> list:
    """Rows from Notion, or [] (fail closed) with a clear log line. Never prints credentials."""
    token = os.environ.get("NOTION_TOKEN", "")
    db_id = os.environ.get("NOTION_GATE_EXCEPTIONS_DB_ID", "")
    if not token or not db_id:
        log("NOTION_TOKEN or NOTION_GATE_EXCEPTIONS_DB_ID is not set; failing closed "
            "(no exceptions applied, everything blocks).")
        return []
    try:
        return fetch_rows(token, db_id)
    except urllib.error.HTTPError as e:  # status code only; never echo headers or body
        log("Notion returned HTTP %s; failing closed (no exceptions applied, everything blocks)." % e.code)
    except Exception as e:  # network, JSON, date parse...
        log("Notion table unreachable or unreadable (%s); failing closed "
            "(no exceptions applied, everything blocks)." % type(e).__name__)
    return []


# --------------------------------------------------------------------------- matching
def derived_tags(result: str, duration_seconds=None) -> str:
    """Result text plus normalized tags that table rows can match on."""
    low = result.lower()
    tags = [low]
    if "startup_failure" in low or (
        duration_seconds is not None and 1 <= duration_seconds <= 3 and "fail" in low
    ):
        tags.append("billing-lock")
    if "automatic reviews are paused" in low or "quota" in low:
        tags.append("quota-paused")
    return " | ".join(tags)


def _wild_len(pattern: str) -> int:
    return len(re.sub(r"[*?\[\]%\s]", "", pattern))


def _check_matches(pattern: str, name: str) -> bool:
    p, n = pattern.strip().lower(), name.strip().lower()
    if not p:
        return False
    if fnmatch.fnmatchcase(n, p):
        return True
    # plain id also matches a longer display name: "cubic" -> "cubic · AI code reviewer"
    return not re.search(r"[*?\[]", p) and n.startswith(p) and (len(n) == len(p) or not n[len(p)].isalnum())


def _scope_matches(scope: str, repo: str) -> bool:
    s = scope.strip().lower()
    return bool(s) and fnmatch.fnmatchcase(repo.strip().lower(), s)


def _result_matches(pattern: str, haystack: str) -> bool:
    p = pattern.strip().lower()
    if _wild_len(p) < MIN_MATCH_LEN:  # empty / wildcard-only: would switch off a whole check
        return False
    if re.search(r"[*?\[]", p):
        return fnmatch.fnmatchcase(haystack, "*" + p + "*")
    return p in haystack


def row_active(row: dict, today: dt.date) -> bool:
    if row.get("enabled") != 1:  # only an explicit 1 switches the exception on
        return False
    exp = row.get("expires")
    if exp is not None and today >= exp:
        return False
    return True


def decide(check, result, repo, findings=None, duration_seconds=None, test_failure=False,
           rows=None, today=None) -> tuple:
    """Return (BLOCKING | NON_BLOCKING, reason). rows=None reads the Notion table."""
    today = today or dt.date.today()
    if test_failure:
        return BLOCKING, "real test failure always blocks"
    if NEVER_EXEMPT_CHECK.search(check or ""):
        return BLOCKING, "test/CI/security check results are never exempted by the table"
    if findings is None:
        return BLOCKING, "findings count not supplied; real findings always block"
    if findings != 0:
        return BLOCKING, "%s real finding(s) reported; real findings always block" % findings
    if not (result or "").strip():
        return BLOCKING, "no result text supplied; a whole check can never be switched off"
    if rows is None:
        rows = load_rows()
    hay = derived_tags(result, duration_seconds)
    for row in rows:
        if not row_active(row, today):
            continue
        if (_check_matches(row["check_id"], check) and _scope_matches(row["scope"], repo)
                and _result_matches(row["result_match"], hay)):
            return NON_BLOCKING, "exception '%s' / '%s' (owner %s, WR %s)" % (
                row["check_id"], row["result_match"], row["owner"] or "?", row["wr_link"] or "?")
    return BLOCKING, "no active exception matches this result"


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", required=True, help="check name, e.g. 'Devin Review'")
    ap.add_argument("--result", required=True, help="result text, e.g. 'Bugfinder incomplete'")
    ap.add_argument("--repo", required=True, help="owner/name or process name")
    ap.add_argument("--findings", type=int, required=True, help="real findings count (must be 0)")
    ap.add_argument("--duration-seconds", type=float, default=None)
    ap.add_argument("--test-failure", action="store_true", help="this is a real test failure")
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args(argv)
    verdict, why = decide(a.check, a.result, a.repo, findings=a.findings,
                          duration_seconds=a.duration_seconds, test_failure=a.test_failure)
    if a.json:
        print(json.dumps({"verdict": verdict, "reason": why}))
    else:
        print(verdict)
        log(why)
    return 0 if verdict == NON_BLOCKING else 1


if __name__ == "__main__":
    sys.exit(main())
