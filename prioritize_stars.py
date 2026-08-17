#!/usr/bin/env python3
import json
import math
import os
import sys
import time
from datetime import datetime, timezone
import httpx

GITHUB_TOKEN = os.environ.get("GH_PAT") or os.environ.get("GITHUB_TOKEN")
HEADERS = {
    "Authorization": f"Bearer {GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
}
STATE_FILE = "stars_state.json"
OUTPUT_FILE = "PRIORITIZED_STARS.md"

def load_state():
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {"cursor": None, "has_next": True, "repos": {}}
    return {"cursor": None, "has_next": True, "repos": {}}

def save_state(state):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)

def fetch_starred_repos(state, limit=250):
    """Fetches starred repositories using GraphQL for fast, paginated bulk retrieval."""
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

    # If we finished pagination on the last run, reset to beginning to update stats/fetch new stars.
    if not has_next:
        cursor = None
        has_next = True

    fetched_count = 0
    with httpx.Client(timeout=15.0) as client:
        while has_next and fetched_count < limit:
            response = client.post(
                "https://api.github.com/graphql",
                json={"query": query, "variables": {"cursor": cursor}},
                headers=HEADERS
            )
            if response.status_code == 403:
                print("Rate limit reached or secondary limit triggered. Backing off...")
                break

            response.raise_for_status()
            data = response.json()

            if "errors" in data:
                print(f"GraphQL errors: {data['errors']}")
                break

            star_data = data["data"]["viewer"]["starredRepositories"]
            for edge in star_data["edges"]:
                repo_node = edge["node"]
                repo_node["starredAt"] = edge["starredAt"]
                repos_dict[repo_node["nameWithOwner"]] = repo_node
                fetched_count += 1

            has_next = star_data["pageInfo"]["hasNextPage"]
            cursor = star_data["pageInfo"]["endCursor"]

            # Save state iteratively to checkpoint progress
            state["cursor"] = cursor
            state["has_next"] = has_next
            state["repos"] = repos_dict
            save_state(state)

            # Small delay to respect GitHub secondary rate limits
            time.sleep(0.2)

    return list(repos_dict.values())

def calculate_priority_score(repo):
    """Calculates priority based on historical activity metrics."""
    now = datetime.now(timezone.utc)

    # 1. Days since last push
    pushed_at_str = repo.get("pushedAt")
    if pushed_at_str:
        pushed_at = datetime.fromisoformat(pushed_at_str.replace("Z", "+00:00"))
        days_since_push = max((now - pushed_at).days, 0)
        score_push = math.exp(-days_since_push / 60) * 40  # Decay over 60 days
    else:
        score_push = 0

    # 2. Days since last release
    releases = repo.get("releases", {}).get("nodes", [])
    if releases:
        release_at = datetime.fromisoformat(releases[0]["createdAt"].replace("Z", "+00:00"))
        days_since_release = max((now - release_at).days, 0)
        score_release = math.exp(-days_since_release / 90) * 30
    else:
        score_release = 0

    # 3. Logarithmic star weight
    stars = repo.get("stargazerCount", 0)
    score_stars = min(math.log10(max(stars, 1)) * 10, 20)

    # 4. Starred Recency Boost
    starred_at_str = repo.get("starredAt")
    if starred_at_str:
        starred_at = datetime.fromisoformat(starred_at_str.replace("Z", "+00:00"))
        days_starred = max((now - starred_at).days, 0)
        score_starred = math.exp(-days_starred / 14) * 10  # Priority boost for newly starred
    else:
        score_starred = 0

    total_score = round(score_push + score_release + score_stars + score_starred, 2)
    return total_score

def generate_markdown(scored_repos):
    """Formats prioritized repositories into a structured Markdown list."""
    lines = [
        "# Prioritized Starred Repositories",
        f"*Last Updated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}*",
        "",
        "| Rank | Score | Repository | Primary Lang | Stars | Last Push | Topics |",
        "| :---: | :---: | :--- | :---: | :---: | :---: | :--- |"
    ]

    for idx, (repo, score) in enumerate(scored_repos, start=1):
        name = f"[{repo['nameWithOwner']}]({repo['url']})"
        lang = repo.get('primaryLanguage')
        lang_name = lang['name'] if lang else "N/A"
        pushed = repo.get('pushedAt', 'N/A')[:10] if repo.get('pushedAt') else 'N/A'
        topics_nodes = repo.get('repositoryTopics', {}).get('nodes', [])
        topics = ", ".join([t['topic']['name'] for t in topics_nodes]) or "-"
        stars = repo.get('stargazerCount', 0)
        lines.append(f"| {idx} | **{score}** | {name} | {lang_name} | {stars:,} | {pushed} | `{topics}` |")

    return "\n".join(lines)

def main():
    if not GITHUB_TOKEN:
        print("Error: GITHUB_TOKEN or GH_PAT environment variable missing.")
        sys.exit(1)

    print("Loading state checkpoint...")
    state = load_state()

    print("Fetching starred repositories...")
    repos = fetch_starred_repos(state, limit=250)

    print("Computing priority scores...")
    scored = []
    for r in repos:
        score = calculate_priority_score(r)
        scored.append((r, score))

    # Sort descending by priority score
    scored.sort(key=lambda x: x[1], reverse=True)

    # Save output
    md_content = generate_markdown(scored)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(md_content)

    print(f"Successfully processed {len(scored)} repos. Report saved to {OUTPUT_FILE}.")

if __name__ == "__main__":
    main()
