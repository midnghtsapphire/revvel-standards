#!/usr/bin/env python3
"""
count-reviewer-bot-comments.py — Ground-truth reviewer activity.

For a given repo, scan the last N PRs and count comments + reviews by every
`[bot]` account. This is the CORRECT way to measure whether a review app is
running — NOT the workflow output, because many review tools (Bito, Recurse,
Cubic, Copilot, Jules) are GitHub Apps that authenticate independently and
never touch Actions secrets or workflow logs.

Origin: written 2026-08-09 to debunk D006/D007's "50 PRs zero unique catches"
claim, which was measuring the wrong thing (workflow output for tools whose
workflow attempt never authenticated).

Usage:
    export GITHUB_TOKEN=ghp_...  (or GH_TOKEN, or an ADMIN_GITHUB_TOKEN)
    python3 count-reviewer-bot-comments.py OWNER REPO [--prs 30]

Outputs a bot activity table sorted by comment count, with most-recent
timestamp so you can see who is currently active.
"""
import argparse
import json
import os
import subprocess
import sys
from collections import Counter


def api_get(url, token):
    r = subprocess.run(
        ['curl', '-sS', '-H', f'Authorization: Bearer {token}', url],
        capture_output=True, text=True)
    try:
        return json.loads(r.stdout)
    except json.JSONDecodeError:
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('owner')
    parser.add_argument('repo')
    parser.add_argument('--prs', type=int, default=30, help='number of most-recent PRs to scan')
    args = parser.parse_args()

    token = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_TOKEN') or os.environ.get('ADMIN_GITHUB_TOKEN')
    if not token:
        print('ERROR: set GITHUB_TOKEN / GH_TOKEN / ADMIN_GITHUB_TOKEN', file=sys.stderr)
        sys.exit(2)

    prs_url = (f'https://api.github.com/repos/{args.owner}/{args.repo}/pulls'
               f'?state=all&per_page={args.prs}&sort=updated&direction=desc')
    prs = api_get(prs_url, token)
    if not isinstance(prs, list):
        print(f'ERROR fetching PRs: {prs}', file=sys.stderr)
        sys.exit(3)

    bots = Counter()
    bot_recent = {}
    for pr in prs[:args.prs]:
        n = pr['number']
        for endpoint in [f'issues/{n}/comments', f'pulls/{n}/reviews']:
            url = f'https://api.github.com/repos/{args.owner}/{args.repo}/{endpoint}?per_page=100'
            items = api_get(url, token)
            if not isinstance(items, list):
                continue
            for c in items:
                login = (c.get('user') or {}).get('login', '')
                if '[bot]' in login:
                    bots[login] += 1
                    ts = c.get('created_at') or c.get('submitted_at') or ''
                    if login not in bot_recent or ts > bot_recent[login]:
                        bot_recent[login] = ts

    print(f'Bots active on the {args.prs} most-recent PRs of {args.owner}/{args.repo}:')
    print()
    print(f'{"BOT":<40} {"COMMENTS":>9}  MOST RECENT')
    print('-' * 80)
    if not bots:
        print('  (no bot activity found)')
        return
    for bot, count in bots.most_common():
        print(f'  {bot:<38} {count:>9}  {bot_recent[bot]}')


if __name__ == '__main__':
    main()
