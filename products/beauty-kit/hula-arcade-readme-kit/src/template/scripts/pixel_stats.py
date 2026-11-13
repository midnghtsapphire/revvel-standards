#!/usr/bin/env python3
"""Hula Arcade pixel stats: writes two static SVG cards (light + dark) from your public GitHub data.
Standard library only. Uses the free GITHUB_TOKEN that every Action already has (or no token locally; low rate limit).

  python3 scripts/pixel_stats.py --user YOUR-USERNAME --out dist
  python3 scripts/pixel_stats.py --sample --out dist        # offline demo with made-up numbers
"""
import argparse, collections, json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from hula_art import C, svg, text_rects, text_width, sprite_g, HIBISCUS, HIB_L, AUKY, AUKY_L, WAVE_TILE, WAVE_L

API = "https://api.github.com"
SHORT = {"JAVASCRIPT": "JS", "TYPESCRIPT": "TS", "JUPYTER NOTEBOOK": "NOTEBOOK", "OBJECTIVE-C": "OBJ-C", "POWERSHELL": "PWSH"}

def get(url, token):
    h = {"Accept": "application/vnd.github+json", "User-Agent": "hula-arcade-pixel-stats", "X-GitHub-Api-Version": "2022-11-28"}
    if token: h["Authorization"] = "Bearer " + token
    with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=30) as r:
        return json.load(r)

def fetch(user, token):
    u = get(f"{API}/users/{user}", token)
    repos, page = [], 1
    while page <= 10:
        batch = get(f"{API}/users/{user}/repos?per_page=100&type=owner&page={page}", token)
        repos += batch
        if len(batch) < 100: break
        page += 1
    own = [r for r in repos if not r.get("fork")]
    langs = collections.Counter(r["language"] for r in own if r.get("language"))
    return dict(user=u["login"], repos=u["public_repos"], followers=u["followers"],
                stars=sum(r["stargazers_count"] for r in own), forks=sum(r["forks_count"] for r in own), langs=langs.most_common(5))

def sample():
    return dict(user="your-username", repos=24, followers=128, stars=342, forks=57,
                langs=[("Python", 9), ("TypeScript", 6), ("Go", 4), ("Shell", 3), ("Rust", 2)])

def card(d, light):
    u, W, H = 3, 280, 86
    bg, border = (C["cream"], C["teal"]) if light else (C["ink"], C["teal"])
    title = C["hibiscus"] if light else C["yellow"]
    text = C["ink"] if light else C["cream"]
    bars = [C["hibiscus"], C["teal"], C["lavender"], C["yellow"], C["navy"] if light else C["cream"]]
    b = [f'<rect width="{W*u}" height="{H*u}" fill="{bg}"/>',
         f'<rect x="{u}" y="{u}" width="{(W-2)*u}" height="{u}" fill="{border}"/>', f'<rect x="{u}" y="{(H-2)*u}" width="{(W-2)*u}" height="{u}" fill="{border}"/>',
         f'<rect x="{u}" y="{u}" width="{u}" height="{(H-2)*u}" fill="{border}"/>', f'<rect x="{(W-2)*u}" y="{u}" width="{u}" height="{(H-2)*u}" fill="{border}"/>']
    b.append(text_rects("PIXEL STATS", 10*u, 8*u, u, title, scale=2))
    b.append(text_rects(d["user"][:24], (10 + text_width("PIXEL STATS", 2) + 8)*u, 12*u, u, text, scale=1))
    rows = [("STARS", d["stars"]), ("REPOS", d["repos"]), ("FOLLOWERS", d["followers"]), ("FORKS", d["forks"])]
    for i, (label, val) in enumerate(rows):
        y = (30 + i * 11) * u
        b.append(text_rects(label, 10*u, y, u, text))
        num = f"{val:,}"
        b.append(text_rects(num, (112 - text_width(num)) * u, y, u, title))
    total = sum(n for _, n in d["langs"]) or 1
    b.append(text_rects("TOP LANGUAGES", 140*u, 26*u - u, u, title))
    for i, (name, n) in enumerate(d["langs"][:5]):
        y = (36 + i * 9) * u
        nm = SHORT.get(name.upper(), name.upper())[:9]
        b.append(text_rects(nm, 140*u, y, u, text))
        blocks = max(1, round(10 * n / total))
        for k in range(blocks):
            b.append(f'<rect x="{(200 + k*7)*u}" y="{y}" width="{6*u}" height="{7*u}" fill="{bars[i]}"/>')
    b.append(sprite_g(HIBISCUS, HIB_L, 262*u, 7*u, u))
    return svg(W*u, H*u, "".join(b), title=f"Pixel stats for {d['user']}", desc=f"{d['stars']} stars, {d['repos']} repositories, {d['followers']} followers")

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--user"); ap.add_argument("--out", default="dist"); ap.add_argument("--sample", action="store_true")
    a = ap.parse_args()
    if not a.sample and not a.user: ap.error("--user or --sample is required")
    d = sample() if a.sample else fetch(a.user, os.environ.get("GITHUB_TOKEN"))
    os.makedirs(a.out, exist_ok=True)
    for light, name in ((True, "stats-light.svg"), (False, "stats-dark.svg")):
        with open(os.path.join(a.out, name), "w", encoding="utf-8") as f: f.write(card(d, light))
    print("wrote", os.path.join(a.out, "stats-light.svg"), "and stats-dark.svg for", d["user"])

if __name__ == "__main__":
    main()
