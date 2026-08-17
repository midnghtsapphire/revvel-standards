#!/usr/bin/env python3
"""Star Optimizer — prioritize starred GitHub repositories.

Fetches starred repos via GraphQL (bulk), scores them with a weighted
activity model, checkpoints progress in stars_state.json for idempotent
resumes, and writes PRIORITIZED_STARS.md + prioritized_stars.json.

Auth: GH_PAT (preferred, 5k req/hr) or GITHUB_TOKEN.
Rate limits: handles HTTP 403/429 with Retry-After / exponential backoff.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import httpx
except ImportError:  # pragma: no cover - exercised only without deps
    httpx = None  # type: ignore

GITHUB_TOKEN = os.environ.get("GH_PAT") or os.environ.get("GITHUB_TOKEN")
GRAPHQL_URL = "https://api.github.com/graphql"
DEFAULT_STATE_FILE = "stars_state.json"
DEFAULT_OUTPUT_MD = "PRIORITIZED_STARS.md"
DEFAULT_OUTPUT_JSON = "prioritized_stars.json"
PAGE_SIZE = 50
DEFAULT_LIMIT = 250
REQUEST_PACING_SEC = 0.2
MAX_RETRIES = 6


def auth_headers(token: str | None = None) -> dict[str, str]:
    value = token if token is not None else GITHUB_TOKEN
    return {
        "Authorization": f"Bearer {value}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "revvel-star-optimizer",
    }


def load_state(path: str | Path) -> dict[str, Any]:
    """Load checkpoint; empty structure if missing or corrupt."""
    p = Path(path)
    if not p.exists():
        return {"cursor": None, "has_next": True, "repos": {}, "updated_at": None}
    try:
        with p.open("r", encoding="utf-8") as fh:
            data = json.load(fh)
    except (OSError, json.JSONDecodeError):
        return {"cursor": None, "has_next": True, "repos": {}, "updated_at": None}
    if not isinstance(data, dict):
        return {"cursor": None, "has_next": True, "repos": {}, "updated_at": None}
    data.setdefault("cursor", None)
    data.setdefault("has_next", True)
    data.setdefault("repos", {})
    if not isinstance(data["repos"], dict):
        data["repos"] = {}
    return data


def save_state(path: str | Path, state: dict[str, Any]) -> None:
    state = dict(state)
    state["updated_at"] = datetime.now(timezone.utc).isoformat()
    p = Path(path)
    tmp = p.with_suffix(p.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as fh:
        json.dump(state, fh, indent=2, sort_keys=True)
        fh.write("\n")
    tmp.replace(p)


def parse_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def days_between(now: datetime, then: datetime | None) -> int | None:
    if then is None:
        return None
    return max((now - then).days, 0)


def score_breakdown(
    repo: dict[str, Any],
    *,
    now: datetime | None = None,
) -> dict[str, float]:
    """Component scores + total. Single source of truth for the formula."""
    clock = now or datetime.now(timezone.utc)
    days_since_push = days_between(clock, parse_iso(repo.get("pushedAt")))
    score_push = math.exp(-days_since_push / 60) * 40 if days_since_push is not None else 0.0
    releases = (repo.get("releases") or {}).get("nodes") or []
    if releases:
        days_since_release = days_between(clock, parse_iso(releases[0].get("createdAt")))
        score_release = (
            math.exp(-(days_since_release or 3650) / 90) * 30
            if days_since_release is not None
            else 0.0
        )
    else:
        score_release = 0.0
    stars = int(repo.get("stargazerCount") or 0)
    score_stars = min(math.log10(max(stars, 1)) * 10, 20)
    days_starred = days_between(clock, parse_iso(repo.get("starredAt")))
    score_starred = (
        math.exp(-(days_starred or 3650) / 14) * 10 if days_starred is not None else 0.0
    )
    total = round(score_push + score_release + score_stars + score_starred, 2)
    return {
        "push": round(score_push, 2),
        "release": round(score_release, 2),
        "stars": round(score_stars, 2),
        "starred_at": round(score_starred, 2),
        "total": total,
    }


def calculate_priority_score(
    repo: dict[str, Any],
    *,
    now: datetime | None = None,
) -> float:
    """Weighted score: push recency + release recency + log stars + starred age."""
    return score_breakdown(repo, now=now)["total"]


STARRED_REPOS_QUERY = """
query($cursor: String) {
  viewer {
    starredRepositories(first: 50, after: $cursor, orderBy: {field: STARRED_AT, direction: DESC}) {
      pageInfo { hasNextPage endCursor }
      edges {
        starredAt
        node {
          nameWithOwner
          url
          description
          stargazerCount
          pushedAt
          primaryLanguage { name }
          releases(first: 1, orderBy: {field: CREATED_AT, direction: DESC}) {
            nodes { createdAt }
          }
          repositoryTopics(first: 5) {
            nodes { topic { name } }
          }
        }
      }
    }
  }
}
"""


def _retry_wait_seconds(response: Any, attempt: int) -> int:
    retry_after = None
    try:
        retry_after = response.headers.get("Retry-After")
    except Exception:
        retry_after = None
    if retry_after:
        try:
            return max(int(retry_after), 1)
        except ValueError:
            pass
    # Exponential backoff capped at 5 minutes.
    return min(60 * (2 ** max(attempt - 1, 0)), 300)


def fetch_starred_repos(
    state: dict[str, Any],
    *,
    limit: int = DEFAULT_LIMIT,
    state_path: str | Path = DEFAULT_STATE_FILE,
    token: str | None = None,
    client: Any | None = None,
) -> list[dict[str, Any]]:
    """Paginate GraphQL starred repos, checkpointing after each page."""
    if httpx is None and client is None:
        raise RuntimeError("httpx is required. Install with: pip install httpx")

    cursor = state.get("cursor")
    has_next = bool(state.get("has_next", True))
    repos_dict: dict[str, Any] = dict(state.get("repos") or {})

    # Full cycle completed last run → refresh from the start.
    if not has_next:
        cursor = None
        has_next = True

    fetched_count = 0
    owns_client = client is None
    session = client or httpx.Client(timeout=15.0)
    headers = auth_headers(token)

    try:
        while has_next and fetched_count < limit:
            attempt = 0
            while True:
                attempt += 1
                response = session.post(
                    GRAPHQL_URL,
                    json={"query": STARRED_REPOS_QUERY, "variables": {"cursor": cursor}},
                    headers=headers,
                )
                if response.status_code in (403, 429):
                    if attempt >= MAX_RETRIES:
                        print(
                            f"Rate limit persisted after {MAX_RETRIES} retries; "
                            "saving checkpoint and stopping page fetch.",
                            file=sys.stderr,
                        )
                        state["cursor"] = cursor
                        state["has_next"] = has_next
                        state["repos"] = repos_dict
                        save_state(state_path, state)
                        raise RuntimeError(
                            f"Rate limit persisted after {MAX_RETRIES} retries; checkpoint saved"
                        )
                    wait_sec = _retry_wait_seconds(response, attempt)
                    print(
                        f"Rate limit HTTP {response.status_code}. "
                        f"Backing off {wait_sec}s (attempt {attempt}/{MAX_RETRIES})..."
                    )
                    time.sleep(wait_sec)
                    continue
                break

            response.raise_for_status()
            payload = response.json()
            if payload.get("errors"):
                print(f"GraphQL errors: {payload['errors']}", file=sys.stderr)
                state["cursor"] = cursor
                state["has_next"] = has_next
                state["repos"] = repos_dict
                save_state(state_path, state)
                break

            star_data = payload["data"]["viewer"]["starredRepositories"]
            for edge in star_data["edges"]:
                node = edge["node"]
                node["starredAt"] = edge["starredAt"]
                repos_dict[node["nameWithOwner"]] = node
                fetched_count += 1
                if fetched_count >= limit:
                    break

            has_next = bool(star_data["pageInfo"]["hasNextPage"]) and fetched_count < limit
            cursor = star_data["pageInfo"]["endCursor"]

            state["cursor"] = cursor
            state["has_next"] = bool(star_data["pageInfo"]["hasNextPage"])
            state["repos"] = repos_dict
            save_state(state_path, state)

            time.sleep(REQUEST_PACING_SEC)
    finally:
        if owns_client:
            session.close()

    return list(repos_dict.values())


def generate_markdown(
    scored_repos: list[tuple[dict[str, Any], float]],
    *,
    now: datetime | None = None,
) -> str:
    clock = now or datetime.now(timezone.utc)
    lines = [
        "# Prioritized Starred Repositories",
        f"*Last Updated: {clock.strftime('%Y-%m-%d %H:%M UTC')}*",
        "",
        "| Rank | Score | Repository | Primary Lang | Stars | Last Push | Topics |",
        "| :---: | :---: | :--- | :---: | :---: | :---: | :--- |",
    ]
    for idx, (repo, score) in enumerate(scored_repos, start=1):
        name = f"[{repo.get('nameWithOwner', 'unknown')}]({repo.get('url', '#')})"
        lang = (repo.get("primaryLanguage") or {}).get("name") or "N/A"
        pushed = (repo.get("pushedAt") or "N/A")[:10]
        topics_nodes = (repo.get("repositoryTopics") or {}).get("nodes") or []
        topics = ", ".join(
            t.get("topic", {}).get("name", "") for t in topics_nodes if t.get("topic")
        ) or "-"
        stars = int(repo.get("stargazerCount") or 0)
        lines.append(
            f"| {idx} | **{score}** | {name} | {lang} | {stars:,} | {pushed} | `{topics}` |"
        )
    lines.append("")
    return "\n".join(lines)


def build_json_report(
    scored_repos: list[tuple[dict[str, Any], float]],
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    clock = now or datetime.now(timezone.utc)
    items = []
    for idx, (repo, score) in enumerate(scored_repos, start=1):
        parts = score_breakdown(repo, now=clock)
        items.append(
            {
                "rank": idx,
                "score": score,
                "breakdown": parts,
                "nameWithOwner": repo.get("nameWithOwner"),
                "url": repo.get("url"),
                "description": repo.get("description"),
                "stargazerCount": repo.get("stargazerCount"),
                "pushedAt": repo.get("pushedAt"),
                "starredAt": repo.get("starredAt"),
                "primaryLanguage": (repo.get("primaryLanguage") or {}).get("name"),
                "topics": [
                    t.get("topic", {}).get("name")
                    for t in ((repo.get("repositoryTopics") or {}).get("nodes") or [])
                    if t.get("topic")
                ],
            }
        )
    return {
        "generatedAt": clock.isoformat(),
        "count": len(items),
        "repos": items,
    }


def prioritize(repos: list[dict[str, Any]], *, now: datetime | None = None) -> list[tuple[dict[str, Any], float]]:
    scored = [(repo, calculate_priority_score(repo, now=now)) for repo in repos]
    scored.sort(key=lambda item: item[1], reverse=True)
    return scored


def sample_fixture_repos() -> list[dict[str, Any]]:
    """Deterministic fixtures for --self-test (no network)."""
    return [
        {
            "nameWithOwner": "active/tool",
            "url": "https://github.com/active/tool",
            "description": "Freshly starred active tool",
            "stargazerCount": 1200,
            "pushedAt": "2026-08-01T12:00:00Z",
            "starredAt": "2026-08-06T12:00:00Z",
            "primaryLanguage": {"name": "Python"},
            "releases": {"nodes": [{"createdAt": "2026-07-20T12:00:00Z"}]},
            "repositoryTopics": {"nodes": [{"topic": {"name": "cli"}}]},
        },
        {
            "nameWithOwner": "stale/archive",
            "url": "https://github.com/stale/archive",
            "description": "Old mega-repo",
            "stargazerCount": 90000,
            "pushedAt": "2020-01-01T12:00:00Z",
            "starredAt": "2024-01-01T12:00:00Z",
            "primaryLanguage": {"name": "JavaScript"},
            "releases": {"nodes": []},
            "repositoryTopics": {"nodes": []},
        },
        {
            "nameWithOwner": "mid/niche",
            "url": "https://github.com/mid/niche",
            "description": "Niche mid activity",
            "stargazerCount": 80,
            "pushedAt": "2026-06-01T12:00:00Z",
            "starredAt": "2026-05-01T12:00:00Z",
            "primaryLanguage": None,
            "releases": {"nodes": [{"createdAt": "2026-05-15T12:00:00Z"}]},
            "repositoryTopics": {
                "nodes": [
                    {"topic": {"name": "osint"}},
                    {"topic": {"name": "security"}},
                ]
            },
        },
    ]


def run_self_test() -> int:
    fixed_now = datetime(2026, 8, 8, 12, 0, 0, tzinfo=timezone.utc)
    repos = sample_fixture_repos()
    scored = prioritize(repos, now=fixed_now)
    assert scored[0][0]["nameWithOwner"] == "active/tool", scored
    active_score = scored[0][1]
    stale_score = next(s for r, s in scored if r["nameWithOwner"] == "stale/archive")
    assert active_score > stale_score, (active_score, stale_score)
    md = generate_markdown(scored, now=fixed_now)
    assert "Prioritized Starred Repositories" in md
    assert "active/tool" in md
    report = build_json_report(scored, now=fixed_now)
    assert report["count"] == 3
    assert report["repos"][0]["rank"] == 1
    # Log-star cap: mega-repo star component must not exceed 20.
    mega = next(r for r in repos if r["nameWithOwner"] == "stale/archive")
    parts = score_breakdown(mega, now=fixed_now)
    assert parts["stars"] <= 20
    print("self-test ok")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Prioritize starred GitHub repositories")
    parser.add_argument("--limit", type=int, default=DEFAULT_LIMIT)
    parser.add_argument("--state-file", default=DEFAULT_STATE_FILE)
    parser.add_argument("--output-md", default=DEFAULT_OUTPUT_MD)
    parser.add_argument("--output-json", default=DEFAULT_OUTPUT_JSON)
    parser.add_argument(
        "--self-test",
        action="store_true",
        help="Run offline fixture assertions (no network, no token)",
    )
    parser.add_argument(
        "--fixture",
        action="store_true",
        help="Score built-in fixtures instead of calling the API",
    )
    args = parser.parse_args(argv)

    if args.self_test:
        return run_self_test()

    if args.fixture:
        repos = sample_fixture_repos()
    else:
        if not GITHUB_TOKEN:
            print("Error: GITHUB_TOKEN or GH_PAT environment variable missing.", file=sys.stderr)
            return 1
        if httpx is None:
            print("Error: httpx is required. Install with: pip install httpx", file=sys.stderr)
            return 1
        print("Loading state checkpoint...")
        state = load_state(args.state_file)
        print("Fetching starred repositories...")
        repos = fetch_starred_repos(
            state,
            limit=max(args.limit, 1),
            state_path=args.state_file,
        )

    print(f"Scoring {len(repos)} repositories...")
    scored = prioritize(repos)
    md = generate_markdown(scored)
    Path(args.output_md).write_text(md, encoding="utf-8")
    report = build_json_report(scored)
    Path(args.output_json).write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(
        f"Successfully processed {len(scored)} repos. "
        f"Wrote {args.output_md} and {args.output_json}."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
