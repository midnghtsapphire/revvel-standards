---
name: patch-agent
description: Deterministic dependency-vulnerability patcher. Use when you need to check whether the repo is affected by a known CVE/advisory (e.g. the semver ReDoS) and apply the minimal safe version bump as a PR.
---

# Patch Agent

Delivers WR #14579 — *"Need n8n or gumloop applies patches or agent called Patch."*

## The research: what's the best way to "apply patches

The request offered three shapes — **n8n**, **gumloop**, or **a dedicated agent/fleet**.
For *patching code dependencies*, here is the honest comparison and the pick.

| Option | Fit for dependency patching | Cost / deps | Verdict |
| --- | --- | --- | --- |
| **n8n** (self-host/SaaS workflow engine) | Good for cross-app glue (Slack→Sheets), weak for code: still needs a runner to touch git, run npm, open PRs. Adds a second system to host + secure. | Hosting or SaaS seat; external creds | ❌ Overkill for code |
| **gumloop** (SaaS automation) | Same gap — it would just call out to a code runner anyway, and stores your tokens off-platform. | SaaS seat; tokens leave the repo | ❌ Not for code patches |
| **GitHub-native agent (this skill)** | Patching lives next to the code, uses the git/PR/CI primitives directly, runs free on Actions, fully reproducible, FOSS. | $0; no new secrets | ✅ **Best solution** |

**Recommendation: a repo-native agent**, because patching is a *code* task that needs
git, the lockfile, and CI — all of which GitHub Actions already provides deterministically
and for free. n8n/gumloop would each need a code runner *anyway*, while adding an external
system to host and a place for your tokens to live. (Dependabot covers the same ground for
many ecosystems; this agent complements it by acting on a curated advisory feed you control,
and by giving a deterministic, testable verdict you can run locally.)

## What it does

`scripts/patch-agent.js`, driven by `data/security-advisories.json`:

1. Loads advisories (seeded with the semver ReDoS, **CVE-2022-25883**).
2. Scans every tracked `package.json`, resolves the installed version from the
   nearest `package-lock.json`, and gives a verdict: `vulnerable` / `safe` / `unknown`
   (using the real `node-semver` range engine — no guessing).
3. With `--fix`, raises only the *declared range floor* to the minimal patched version
   in the same major line (no surprise major upgrades), and the workflow opens a PR.

It never reports a transitive-only or already-safe version as "fixed." On this repo today
it correctly reports **not affected** — semver resolves to 7.8.1 (≥ 7.5.2).

## Usage

```bash
node scripts/patch-agent.js --check          # report only
node scripts/patch-agent.js --check --strict # non-zero exit if anything vulnerable (CI gate)
node scripts/patch-agent.js --fix            # raise vulnerable floors locally
```

Or run the **Patch Agent** workflow (`workflow_dispatch`, manual by design) with
`fix: true` to have it open a PR. It is intentionally *not* auto-triggered — this repo's
prior automation looped precisely because everything fired on label/comment/schedule churn.

## Extending

Add advisories to `data/security-advisories.json` (one object per CVE, `vulnerableRange`
in node-semver syntax — copy ranges straight from the GitHub Advisory Database or OSV).
Add a test case to `tests/patch-agent.test.js` for each new advisory.
