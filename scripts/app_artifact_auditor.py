#!/usr/bin/env python3
"""
App Artifact Auditor — enforces Definition of Done across every app.

Deployment model: a single static Vercel project publishes the repo's docs site,
so each app is run/tested from its docs folder at `<base_url>/docs/<app>/`. This
script, for each app in docs/app-deployments.yml:

  1. Writes docs/<app>/ARTIFACTS.md — the required-deliverable checklist with
     auto-detected status (the "required list for every app").
  2. Writes docs/<app>/index.html — the served test/launcher page (this is the
     live interface you "run from the docs folder").
  3. Ensures the README carries a "## Live Deployment" section linking that page
     — only when a real URL exists (no placeholders; DoD #2).
  4. Writes docs/APP_DELIVERY_STATUS.md — a one-glance dashboard.

A per-app `live_url` in the manifest overrides the derived docs URL (use it when
an app has its own standalone deployment). `deployment.base_url` is filled by
scripts/vercel_sync.py when a VERCEL_TOKEN is present.

Status per requirement: True (✅ met), False (❌ gap), None (➖ n/a). n/a items
don't count toward the DoD score.

Requires: PyYAML
"""
import os
import re
import html
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "docs", "app-deployments.yml")
STATUS = os.path.join(ROOT, "docs", "APP_DELIVERY_STATUS.md")
REGISTRY = os.path.join(ROOT, "docs", "APP_REGISTRY.md")
GH_TREE = "https://github.com/midnghtsapphire/revvel-standards/tree/main"

URL_RE = re.compile(r"^https?://[^\s)\"']+$")
SECTION_RE = re.compile(r"\n## Live Deployment\b.*?(?=\n## |\Z)", re.S)
SAFE_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")
# Code-only extensions — excludes .json/.md so dependency manifests and docs
# don't create false positives for integration checks.
CODE_EXTS = (".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs", ".py", ".env")
MONETIZE_PROVIDERS = ("stripe", "polar", "gumroad", "paddle", "lemonsqueezy", "lemon_squeezy")
TEST_FILE_RE = re.compile(r"\.(test|spec)\.[jt]sx?$|\.spec\.py$")
SKIP_DIRS = ("node_modules", ".next", "dist", "build", ".git", "__pycache__")
TICK = {True: "✅", False: "❌", None: "➖"}


def read(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def find_in_code(app_dir, needles, exts=CODE_EXTS):
    """Single walk: return the first needle found in any code file, else None."""
    if isinstance(needles, str):
        needles = (needles,)
    needles = [n.lower() for n in needles]
    for base, dirs, files in os.walk(app_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if fn.endswith(exts):
                low = read(os.path.join(base, fn)).lower()
                hit = next((n for n in needles if n in low), None)
                if hit:
                    return hit
    return None


def has_tests(app_dir):
    """Detect tests/, __tests__/, test/, spec/ dirs or *.test.* / *.spec.* / *_test.py / test_*.py files."""
    for d in ("tests", "__tests__", "test", "spec"):
        if os.path.isdir(os.path.join(app_dir, d)):
            return True
    for base, dirs, files in os.walk(app_dir):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            if TEST_FILE_RE.search(fn) or fn.startswith("test_") or fn.endswith("_test.py"):
                return True
    return False


def resolve_live_url(name, meta, base_url, external):
    """Explicit per-app live_url wins; else derive the docs-served URL."""
    explicit = (meta.get("live_url") or "").strip()
    if explicit:
        return explicit
    if not external and base_url:
        return f"{base_url.rstrip('/')}/docs/{name}/"
    return ""


def detect(name, meta, registry_text, base_url):
    """Return (checks, live_url, valid_url, external). checks: list of (label, status, note)."""
    path = meta.get("path", "")
    external = path == "external"
    app_dir = os.path.join(ROOT, path) if path and not external else None
    live_url = resolve_live_url(name, meta, base_url, external)
    valid_url = bool(URL_RE.match(live_url))
    readme = read(os.path.join(app_dir, "README.md")) if app_dir else ""
    in_registry = name.lower() in registry_text.lower()

    checks = [("Live deployment URL", valid_url,
               live_url if valid_url else ("invalid URL in manifest" if live_url else "no URL — set deployment.base_url or a per-app live_url"))]

    if external:
        repo = meta.get("repo", "external repo")
        for label in ("README `## Live Deployment`", "Live web test interface",
                      ".mcp.json at root", "Monetization wired", "Tests"):
            checks.append((label, None, f"n/a — lives in {repo}"))
        checks.append(("Listed in APP_REGISTRY.md", in_registry, "listed" if in_registry else "not registered"))
        return checks, live_url, valid_url, external

    has_web = any(os.path.exists(os.path.join(app_dir, p))
                  for p in ("index.html", "app", "pages", "src/app", "public/index.html"))
    has_mcp = os.path.exists(os.path.join(app_dir, ".mcp.json"))
    provider = find_in_code(app_dir, MONETIZE_PROVIDERS)
    tests = has_tests(app_dir)

    checks.append(("README `## Live Deployment`",
                   valid_url and "## Live Deployment" in readme and live_url in readme,
                   "present" if (valid_url and live_url in readme) else "section missing / URL not in README"))
    checks.append(("Live web test interface", has_web,
                   "web app detected" if has_web else "no web playground found (DoD: even API/CLI/MCP needs one)"))
    checks.append((".mcp.json at root", has_mcp, "present" if has_mcp else "missing"))
    checks.append(("Monetization wired", provider is not None,
                   f"{provider} referenced" if provider else "no payment provider found (Stripe/Polar/Gumroad/Paddle/Lemon)"))
    checks.append(("Tests", tests, "tests present" if tests else "no tests found"))
    checks.append(("Listed in APP_REGISTRY.md", in_registry, "listed" if in_registry else "not registered"))
    return checks, live_url, valid_url, external


def score(checks):
    applicable = [s for _, s, _ in checks if s is not None]
    return sum(1 for s in applicable if s), len(applicable)


def source_link(meta, external):
    if external:
        repo = meta.get("repo", "")
        return f"https://github.com/{repo}" if repo else ""
    return f"{GH_TREE}/{meta.get('path', '')}"


def write_artifacts_md(name, meta, checks, valid_url, live_url, external):
    out_dir = os.path.join(ROOT, "docs", name)
    os.makedirs(out_dir, exist_ok=True)
    done, total = score(checks)
    lines = [
        f"# {name} — Delivery Artifacts",
        "",
        f"> Auto-generated by `scripts/app_artifact_auditor.py`. **{done}/{total} requirements met.**",
        f"> Code path: `{meta.get('path', '?')}`" + (f"  ·  external repo: `{meta.get('repo')}`" if external else ""),
        "> Live: " + (f"[{live_url}]({live_url})" if valid_url else "**not deployed yet**"),
        "",
        "## Definition-of-Done requirements",
        "",
        "| Requirement | Status | Notes |",
        "| --- | :---: | --- |",
    ]
    for label, status, note in checks:
        lines.append(f"| {label} | {TICK[status]} | {note} |")
    lines += [
        "",
        "_Legend: ✅ met · ❌ gap · ➖ not applicable._",
        "",
        "## Required deliverable records",
        "",
        "These live here in `docs/` (only code goes in the app dir). Fill each as it ships:",
        "",
        "- [ ] **BOM** — bill of materials / components",
        "- [ ] **Research** — demand/chatter packet from the research engine",
        "- [ ] **Decision / ROI** — revenue ÷ cost gate (auto-approve ≥ 5)",
        "- [ ] **Deploy** — live URL + deploy record (above)",
        "- [ ] **Monetize** — payment provider products / pricing",
        "- [ ] **Market / SEO** — meta, OG, sitemap, listing copy",
        "- [ ] **Sales** — sales tracking / dashboard",
        "",
        "_See `standards/DELIVERY_MATRIX.md` and `docs/DEFINITION_OF_DONE.md`._",
        "",
    ]
    with open(os.path.join(out_dir, "ARTIFACTS.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def write_index_html(name, meta, checks, valid_url, live_url, external):
    """The served test/launcher page — 'run it from the docs folder'."""
    out_dir = os.path.join(ROOT, "docs", name)
    os.makedirs(out_dir, exist_ok=True)
    done, total = score(checks)
    src = source_link(meta, external)
    rows = "\n".join(
        f'      <tr><td>{TICK[s]}</td><td>{html.escape(l)}</td><td>{html.escape(n)}</td></tr>'
        for l, s, n in checks
    )
    # Show an "open the live app" button only when the app has its own standalone
    # deployment (explicit live_url); otherwise this page *is* the served surface.
    explicit = (meta.get("live_url") or "").strip()
    open_btn = f'<a class="btn" href="{html.escape(explicit)}">▶ Open the live app</a>' if explicit else ""
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(name)} — Revvel app</title>
<style>
  :root {{ color-scheme: light dark; }}
  body {{ font: 16px/1.5 system-ui, sans-serif; max-width: 760px; margin: 3rem auto; padding: 0 1.2rem; }}
  h1 {{ margin-bottom: .2rem; }}
  .meta {{ color: #888; margin-bottom: 1.5rem; }}
  .score {{ font-weight: 700; }}
  table {{ border-collapse: collapse; width: 100%; margin: 1rem 0; }}
  th, td {{ text-align: left; padding: .45rem .6rem; border-bottom: 1px solid #8883; }}
  td:first-child {{ width: 2rem; text-align: center; }}
  .btn {{ display: inline-block; padding: .55rem 1rem; margin: .2rem .4rem .2rem 0;
          border: 1px solid #8886; border-radius: 8px; text-decoration: none; }}
</style>
</head>
<body>
<main>
  <h1>{html.escape(name)}</h1>
  <p class="meta">Revvel app · <span class="score">{done}/{total} Definition-of-Done met</span>
    {'· external repo' if external else ''}</p>
  <nav aria-label="App actions">
    {open_btn}
    {f'<a class="btn" href="{html.escape(src)}">View source</a>' if src else ''}
    <a class="btn" href="./ARTIFACTS.md">Delivery artifacts</a>
  </nav>
  <h2>Definition of Done</h2>
  <table>
    <thead><tr><th></th><th>Requirement</th><th>Notes</th></tr></thead>
    <tbody>
{rows}
    </tbody>
  </table>
  <p class="meta">Auto-generated by <code>scripts/app_artifact_auditor.py</code> — served from the docs site.</p>
</main>
</body>
</html>
"""
    with open(os.path.join(out_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write(page)


def ensure_readme_link(meta, valid_url, live_url):
    path = meta.get("path", "")
    if not valid_url or path == "external" or not path:
        return
    readme_path = os.path.join(ROOT, path, "README.md")
    text = read(readme_path)
    if not text:
        return
    section = f"\n## Live Deployment\n\n▶️ **[Open the live app & test it]({live_url})**\n"
    if "## Live Deployment" in text:
        new = SECTION_RE.sub(section, text, count=1)
    else:
        m = re.search(r"^# .*$", text, re.M)
        idx = m.end() if m else 0
        new = text[:idx] + "\n" + section + text[idx:]
    if new != text:
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(new)


def main():
    manifest = yaml.safe_load(read(MANIFEST)) or {}
    apps = manifest.get("apps", {})
    base_url = ((manifest.get("deployment") or {}).get("base_url") or "").strip()
    registry_text = read(REGISTRY)

    rows = []
    for name, meta in apps.items():
        if not SAFE_NAME_RE.match(name):
            print(f"  skipping unsafe app key: {name!r}")
            continue
        checks, live_url, valid_url, external = detect(name, meta, registry_text, base_url)
        write_artifacts_md(name, meta, checks, valid_url, live_url, external)
        write_index_html(name, meta, checks, valid_url, live_url, external)
        ensure_readme_link(meta, valid_url, live_url)
        done, total = score(checks)
        gaps = [label for label, s, _ in checks if s is False]
        rows.append((name, live_url if valid_url else "", done, total, gaps))

    rows.sort(key=lambda r: (r[2] - r[3], r[0]))
    out = [
        "# App Delivery Status",
        "",
        "> Auto-generated by `scripts/app_artifact_auditor.py` (runs every 6h). "
        "Tracks Definition-of-Done compliance per app. Per-app detail: `docs/<app>/ARTIFACTS.md`.",
        f"> Deployment base URL: {('`' + base_url + '`') if base_url else '_unset — fill `deployment.base_url` in app-deployments.yml or add a VERCEL_TOKEN_'}",
        "",
        f"**{len(rows)} apps.** "
        f"{sum(1 for r in rows if r[1])} have a live URL · "
        f"{sum(1 for r in rows if r[2] == r[3] and r[3] > 0)} fully meet DoD.",
        "",
        "| App | Live URL | DoD | Top gaps |",
        "| --- | --- | :---: | --- |",
    ]
    for name, live_url, done, total, gaps in rows:
        link = f"[test]({live_url})" if live_url else "— none —"
        out.append(f"| [{name}](./{name}/ARTIFACTS.md) | {link} | {done}/{total} | {', '.join(gaps[:3]) or 'none 🎉'} |")
    out.append("")
    with open(STATUS, "w", encoding="utf-8") as f:
        f.write("\n".join(out))

    live = sum(1 for r in rows if r[1])
    print(f"Audited {len(rows)} apps -> docs/<app>/{{ARTIFACTS.md,index.html}} + docs/APP_DELIVERY_STATUS.md")
    print(f"Live URLs: {live}/{len(rows)}  (base_url={'set' if base_url else 'unset'})")


if __name__ == "__main__":
    main()
