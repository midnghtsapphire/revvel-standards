#!/usr/bin/env python3
"""
App Artifact Auditor — enforces Definition of Done across every app.

For each app in docs/app-deployments.yml it:
  1. Writes/refreshes docs/<app>/ARTIFACTS.md — the required-deliverable checklist
     with auto-detected status (the "required list for every app").
  2. Ensures the README carries a "## Live Deployment" section with the clickable
     live URL — but only when a real URL exists (no placeholders; DoD #2).
  3. Writes docs/APP_DELIVERY_STATUS.md — a one-glance dashboard of every app.

Principle: only code lives in the app dir; the deliverable record + test link
live in docs/. Idempotent — safe to run several times a day.

Status values per requirement: True (✅ met), False (❌ gap), None (➖ n/a, e.g.
checks that can't apply to an external-repo app). n/a items don't count toward
the DoD score.

Requires: PyYAML
"""
import os
import re
import yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "docs", "app-deployments.yml")
STATUS = os.path.join(ROOT, "docs", "APP_DELIVERY_STATUS.md")
REGISTRY = os.path.join(ROOT, "docs", "APP_REGISTRY.md")

URL_RE = re.compile(r"^https?://[^\s)\"']+$")
SECTION_RE = re.compile(r"\n## Live Deployment\b.*?(?=\n## |\Z)", re.S)
# App keys must be safe for filesystem paths (no traversal) and markdown.
SAFE_NAME_RE = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")
# Code-only extensions — excludes .json/.md so dependency manifests and docs
# don't create false positives for integration checks.
CODE_EXTS = (".js", ".ts", ".tsx", ".jsx", ".mjs", ".cjs", ".py", ".env")
# Monetization providers used across the portfolio (not just Stripe).
MONETIZE_PROVIDERS = ("stripe", "polar", "gumroad", "paddle", "lemonsqueezy", "lemon_squeezy")
TICK = {True: "✅", False: "❌", None: "➖"}


def read(path):
    try:
        with open(path, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""


def grep_dir(app_dir, needles, exts=CODE_EXTS):
    """True if any needle appears in any code file under app_dir."""
    if isinstance(needles, str):
        needles = (needles,)
    needles = [n.lower() for n in needles]
    for base, dirs, files in os.walk(app_dir):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".next", "dist", "build", ".git")]
        for fn in files:
            if fn.endswith(exts):
                low = read(os.path.join(base, fn)).lower()
                if any(n in low for n in needles):
                    return True
    return False


def has_tests(app_dir):
    """Detect tests/, __tests__/, test/, spec/ dirs or *.test.* / *.spec.* files."""
    for d in ("tests", "__tests__", "test", "spec"):
        if os.path.isdir(os.path.join(app_dir, d)):
            return True
    for base, dirs, files in os.walk(app_dir):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".next", "dist", "build", ".git")]
        for fn in files:
            if re.search(r"\.(test|spec)\.[jt]sx?$", fn) or re.search(r"\.spec\.py$", fn) or fn.startswith("test_"):
                return True
    return False


def detect(name, meta, registry_text):
    """Return ordered list of (label, status, note). status: True/False/None."""
    path = meta.get("path", "")
    external = path == "external"
    app_dir = os.path.join(ROOT, path) if path and not external else None
    live_url = (meta.get("live_url") or "").strip()
    valid_url = bool(URL_RE.match(live_url))
    readme = read(os.path.join(app_dir, "README.md")) if app_dir else ""

    in_registry = name.lower() in registry_text.lower()

    checks = []
    checks.append(("Live deployment URL", valid_url,
                   live_url if valid_url else ("invalid URL in manifest" if live_url else "no URL in app-deployments.yml")))

    if external:
        repo = meta.get("repo", "external repo")
        # Local-file checks can't apply to a repo that isn't checked out here.
        for label in ("README `## Live Deployment`", "Live web test interface",
                      ".mcp.json at root", "Monetization wired", "Tests"):
            checks.append((label, None, f"n/a — lives in {repo}"))
        checks.append(("Listed in APP_REGISTRY.md", in_registry, "listed" if in_registry else "not registered"))
        return checks, live_url, valid_url, external

    has_web = any(os.path.exists(os.path.join(app_dir, p))
                  for p in ("index.html", "app", "pages", "src/app", "public/index.html"))
    has_mcp = os.path.exists(os.path.join(app_dir, ".mcp.json"))
    monetized = grep_dir(app_dir, MONETIZE_PROVIDERS)
    provider = next((p for p in MONETIZE_PROVIDERS if grep_dir(app_dir, p)), None) if monetized else None
    tests = has_tests(app_dir)

    checks.append(("README `## Live Deployment`",
                   valid_url and "## Live Deployment" in readme and live_url in readme,
                   "present" if (valid_url and live_url in readme) else "section missing / URL not in README"))
    checks.append(("Live web test interface", has_web,
                   "web app detected" if has_web else "no web playground found (DoD: even API/CLI/MCP needs one)"))
    checks.append((".mcp.json at root", has_mcp, "present" if has_mcp else "missing"))
    checks.append(("Monetization wired", monetized,
                   f"{provider} referenced" if monetized else "no payment provider found (Stripe/Polar/Gumroad/Paddle/Lemon)"))
    checks.append(("Tests", tests, "tests present" if tests else "no tests found"))
    checks.append(("Listed in APP_REGISTRY.md", in_registry, "listed" if in_registry else "not registered"))
    return checks, live_url, valid_url, external


def score(checks):
    applicable = [s for _, s, _ in checks if s is not None]
    done = sum(1 for s in applicable if s)
    return done, len(applicable)


def write_artifacts_md(name, meta, checks, valid_url, live_url, external):
    out_dir = os.path.join(ROOT, "docs", name)
    os.makedirs(out_dir, exist_ok=True)
    done, total = score(checks)
    lines = [
        f"# {name} — Delivery Artifacts",
        "",
        f"> Auto-generated by `scripts/app_artifact_auditor.py`. **{done}/{total} requirements met.**",
        f"> Code path: `{meta.get('path','?')}`" + (f"  ·  external repo: `{meta.get('repo')}`" if external else ""),
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


def ensure_readme_link(meta, valid_url, live_url):
    """Insert/refresh '## Live Deployment' in the README — only when a URL is valid."""
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
    registry_text = read(REGISTRY)

    rows = []
    for name, meta in apps.items():
        if not SAFE_NAME_RE.match(name):
            print(f"  skipping unsafe app key: {name!r}")
            continue
        checks, live_url, valid_url, external = detect(name, meta, registry_text)
        write_artifacts_md(name, meta, checks, valid_url, live_url, external)
        ensure_readme_link(meta, valid_url, live_url)
        done, total = score(checks)
        gaps = [label for label, s, _ in checks if s is False]
        rows.append((name, live_url if valid_url else "", done, total, gaps))

    rows.sort(key=lambda r: (r[2] - r[3], r[0]))  # most-incomplete first, then name
    out = [
        "# App Delivery Status",
        "",
        "> Auto-generated by `scripts/app_artifact_auditor.py` (runs every 6h). "
        "Tracks Definition-of-Done compliance per app. Per-app detail: `docs/<app>/ARTIFACTS.md`.",
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
    print(f"Audited {len(rows)} apps -> docs/<app>/ARTIFACTS.md + docs/APP_DELIVERY_STATUS.md")
    print(f"Live URLs: {live}/{len(rows)}  (fill docs/app-deployments.yml to close gaps)")


if __name__ == "__main__":
    main()
