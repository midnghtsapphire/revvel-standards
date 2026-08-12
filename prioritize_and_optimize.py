#!/usr/bin/env python3
"""Hourly star prioritization & organic discoverability engine.

Free / TOS-compliant path:
  - GitHub GraphQL starred-repo fetch (optional when offline)
  - Priority scoring (push/release/stars/starred-at)
  - PRIORITIZED_STARS.md generation with star CTA
  - Optional topic SEO merge on current or owned public repos

Env:
  GH_PAT / GITHUB_TOKEN   auth (required for live API modes)
  ENABLE_TOPIC_UPDATES    "true" to allow topic PUT (default off)
  STAR_MAGNET_TOPIC_SCOPE current|owned (default current)
  GITHUB_REPOSITORY       owner/name when scope=current
  STAR_MAGNET_OFFLINE=1   skip network; write index from stars_state.json / empty
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from datetime import datetime, timezone

try:
    import httpx
except ImportError:  # pragma: no cover - CI installs httpx in the workflow
    httpx = None

GITHUB_TOKEN = os.environ.get("GH_PAT") or os.environ.get("GITHUB_TOKEN")
HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
}
if GITHUB_TOKEN:
    HEADERS["Authorization"] = "Bearer " + str(GITHUB_TOKEN)

STATE_FILE = os.environ.get("STAR_MAGNET_STATE_FILE", "stars_state.json")
OUTPUT_FILE = os.environ.get("STAR_MAGNET_OUTPUT_FILE", "PRIORITIZED_STARS.md")
ENABLE_TOPIC_UPDATES = os.environ.get("ENABLE_TOPIC_UPDATES", "").lower() in {
    "1",
    "true",
    "yes",
}
TOPIC_SCOPE = os.environ.get("STAR_MAGNET_TOPIC_SCOPE", "current").lower()
OFFLINE = os.environ.get("STAR_MAGNET_OFFLINE", "").lower() in {"1", "true", "yes"}

TRENDING_TOPICS = [
    "ai",
    "llm",
    "agents",
    "mcp",
    "automation",
    "developer-tools",
    "standards",
    "workflow",
]

DISCOVERY_TOPICS = [
    "ai-agents",
    "mcp",
    "developer-tools",
    "standards",
]


def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as handle:
            try:
                return json.load(handle)
            except json.JSONDecodeError:
                pass
    return {"cursor": None, "has_next": True, "repos": {}}


def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as handle:
        json.dump(state, handle, indent=2)


def fetch_starred_repos(state, limit=250):
    """Fetches starred repositories using GraphQL with checkpointed pagination."""
    if httpx is None:
        raise RuntimeError("httpx is required for live fetch mode")

    query = """
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

    cursor = state.get("cursor")
    has_next = state.get("has_next", True)
    repos_dict = state.get("repos", {})

    if not has_next:
        cursor = None
        has_next = True

    fetched_count = 0
    with httpx.Client(timeout=15.0) as client:
        while has_next and fetched_count < limit:
            response = client.post(
                "https://api.github.com/graphql",
                json={"query": query, "variables": {"cursor": cursor}},
                headers=HEADERS,
            )
            if response.status_code in (403, 429):
                print("Rate limit reached. Backing off 60s...")
                time.sleep(60)
                continue

            response.raise_for_status()
            data = response.json()

            if "errors" in data:
                print(f"GraphQL errors: {data['errors']}")
                break
            if "data" not in data or not data["data"] or "viewer" not in data["data"]:
                print(f"API Warning: {data}")
                break

            star_data = data["data"]["viewer"]["starredRepositories"]
            for edge in star_data["edges"]:
                repo_node = edge["node"]
                repo_node["starredAt"] = edge["starredAt"]
                repos_dict[repo_node["nameWithOwner"]] = repo_node
                fetched_count += 1

            has_next = star_data["pageInfo"]["hasNextPage"]
            cursor = star_data["pageInfo"]["endCursor"]

            state["cursor"] = cursor
            state["has_next"] = has_next
            state["repos"] = repos_dict
            save_state(state)
            time.sleep(0.2)

    return list(repos_dict.values())


def calculate_priority_score(repo, now=None):
    """Calculates priority based on historical activity metrics."""
    now = now or datetime.now(timezone.utc)

    pushed_at_str = repo.get("pushedAt")
    if pushed_at_str:
        pushed_at = datetime.fromisoformat(pushed_at_str.replace("Z", "+00:00"))
        days_since_push = max((now - pushed_at).days, 0)
        score_push = math.exp(-days_since_push / 60) * 40
    else:
        score_push = 0.0

    releases = repo.get("releases", {}).get("nodes", []) or []
    if releases:
        release_at = datetime.fromisoformat(releases[0]["createdAt"].replace("Z", "+00:00"))
        days_since_release = max((now - release_at).days, 0)
        score_release = math.exp(-days_since_release / 90) * 30
    else:
        score_release = 0.0

    stars = repo.get("stargazerCount", 0) or 0
    score_stars = min(math.log10(max(stars, 1)) * 10, 20)

    starred_at_str = repo.get("starredAt")
    if starred_at_str:
        starred_at = datetime.fromisoformat(starred_at_str.replace("Z", "+00:00"))
        days_starred = max((now - starred_at).days, 0)
        score_starred = math.exp(-days_starred / 14) * 10
    else:
        score_starred = 0.0

    return round(score_push + score_release + score_stars + score_starred, 2)


def generate_markdown(scored_repos, now=None, limit=100):
    """Formats prioritized repositories with call-to-action star drivers."""
    now = now or datetime.now(timezone.utc)
    lines = [
        "# 🌟 Prioritized & Trending Open-Source Index",
        f"*Automated Index Updated: {now.strftime('%Y-%m-%d %H:%M UTC')}*",
        "",
        "> 💡 **Found this resource valuable? Give this repository a ⭐ star to stay updated on emerging tooling!**",
        "",
        "| Rank | Score | Repository | Primary Lang | Stars | Last Push | Topics |",
        "| :---: | :---: | :--- | :---: | :---: | :---: | :--- |",
    ]

    for idx, (repo, score) in enumerate(scored_repos[:limit], start=1):
        name = f"[{repo['nameWithOwner']}]({repo.get('url') or '#'})"
        lang = (
            repo["primaryLanguage"]["name"]
            if repo.get("primaryLanguage")
            else "N/A"
        )
        pushed = (repo.get("pushedAt") or "N/A")[:10]
        topics_nodes = repo.get("repositoryTopics", {}).get("nodes", []) or []
        topics = ", ".join(t["topic"]["name"] for t in topics_nodes) or "-"
        stars = repo.get("stargazerCount", 0) or 0
        lines.append(
            f"| {idx} | **{score}** | {name} | {lang} | {stars:,} | {pushed} | `{topics}` |"
        )

    lines.extend(
        [
            "",
            "---",
            "",
            "*Generated by prioritize_and_optimize.py (TOS-compliant star magnet engine).*",
            "",
        ]
    )
    return "\n".join(lines)


def merge_topics(current_topics, extras=None, limit=20):
    extras = extras or DISCOVERY_TOPICS
    seen = set()
    merged = []
    for topic in list(current_topics or []) + list(extras):
        normalized = str(topic or "").strip().lower().replace(" ", "-")
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        merged.append(normalized)
        if len(merged) >= limit:
            break
    return merged


def _put_topics(client, owner, repo_name, names):
    response = client.put(
        f"https://api.github.com/repos/{owner}/{repo_name}/topics",
        headers=HEADERS,
        json={"names": names},
    )
    if response.status_code >= 400:
        print(
            f"Topic update failed for {owner}/{repo_name}: "
            f"{response.status_code} {response.text[:200]}"
        )
        return False
    print(f"Updated topics on {owner}/{repo_name}: {', '.join(names)}")
    return True


def update_repo_topics_for_discovery():
    """Optionally merge discovery topics onto current or owned public repos."""
    if not ENABLE_TOPIC_UPDATES:
        print("Topic updates disabled (set ENABLE_TOPIC_UPDATES=true to enable).")
        return
    if httpx is None:
        print("httpx missing; cannot update topics.")
        return

    with httpx.Client(timeout=15.0) as client:
        if TOPIC_SCOPE == "owned":
            res = client.get(
                "https://api.github.com/user/repos",
                params={"type": "owner", "per_page": 10, "sort": "updated"},
                headers=HEADERS,
            )
            if res.status_code != 200:
                print(f"Owned-repo list failed: {res.status_code}")
                return
            for repo in res.json():
                if repo.get("private") or repo.get("fork"):
                    continue
                owner = repo["owner"]["login"]
                name = repo["name"]
                # topics may be missing unless Accept includes the topics media type;
                # re-fetch About topics via the dedicated endpoint when empty.
                current = repo.get("topics") or []
                if not current:
                    t_res = client.get(
                        f"https://api.github.com/repos/{owner}/{name}/topics",
                        headers=HEADERS,
                    )
                    if t_res.status_code == 200:
                        current = t_res.json().get("names", [])
                new_topics = merge_topics(current, DISCOVERY_TOPICS)
                _put_topics(client, owner, name, new_topics)
            return

        repo_full = os.environ.get("GITHUB_REPOSITORY", "")
        if "/" not in repo_full:
            print("GITHUB_REPOSITORY not set; cannot update current repo topics.")
            return
        owner, name = repo_full.split("/", 1)
        t_res = client.get(
            f"https://api.github.com/repos/{owner}/{name}/topics",
            headers=HEADERS,
        )
        current = t_res.json().get("names", []) if t_res.status_code == 200 else []
        new_topics = merge_topics(current, DISCOVERY_TOPICS)
        _put_topics(client, owner, name, new_topics)


def main(argv=None):
    argv = list(sys.argv[1:] if argv is None else argv)
    if "--help" in argv or "-h" in argv:
        print(__doc__)
        return 0

    print("Executing hourly star prioritization & growth engine...")
    state = load_state()
    repos = list(state.get("repos", {}).values())

    if OFFLINE or not GITHUB_TOKEN:
        if not GITHUB_TOKEN and not OFFLINE:
            print(
                "Warning: GITHUB_TOKEN/GH_PAT missing — writing index from local state only."
            )
        print(f"Offline/local mode with {len(repos)} cached repos.")
    else:
        try:
            repos = fetch_starred_repos(state, limit=250)
        except Exception as exc:  # noqa: BLE001 - keep hourly job resilient
            print(f"Live fetch failed ({exc}); falling back to cached state.")
            repos = list(state.get("repos", {}).values())

    scored = [(repo, calculate_priority_score(repo)) for repo in repos]
    scored.sort(key=lambda item: item[1], reverse=True)

    md_content = generate_markdown(scored)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as handle:
        handle.write(md_content)
    print(f"Wrote {OUTPUT_FILE} ({len(scored)} scored repos).")

    print("Optimizing topic tags for organic discoverability...")
    try:
        update_repo_topics_for_discovery()
    except Exception as exc:  # noqa: BLE001
        print(f"Topic update skipped/failed: {exc}")

    print("Hourly prioritization and organic star driver complete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
