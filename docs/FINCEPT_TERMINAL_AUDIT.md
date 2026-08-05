# FinceptTerminal — Audit, Review & Improvement Plan

**Subject repository:** [`Fincept-Corporation/FinceptTerminal`](https://github.com/Fincept-Corporation/FinceptTerminal)
**Auditor:** `midnghtsapphire/revvel-standards` — Copilot coding agent
**Audit date:** 2026-04-20
**Repo snapshot commit:** `0c6d17a54ada161b8cf5b486fa8e4b3798cabe1d` (default branch `main`)
**Latest release at audit time:** `v4.0.2` (README) / `v4.0.1` (releases API, published 2026-04-15)

---

## 0. Scope & Method

This is an **external audit** of a third-party open-source repository owned by Fincept-Corporation. It was performed from public metadata and content (README, repo tree, workflows list, open issues, open PRs, releases, license posture). The full source tree was not cloned — the sandbox running this audit is not permitted to clone external repositories or open PRs in them. The concluding section (§7) contains a **ready-to-file upstream issue body** so the Fincept maintainers or the requesting user can file the audit directly against the upstream repository in one paste.

Sources used:
- GitHub REST metadata for the repo (stars, forks, language, license, topic tags)
- `README.md` at `main`
- `/`, `/.github`, `/.github/workflows`, `/docs`, `/fincept-qt` directory listings at `main`
- Open issues and open pull requests (top pages)
- Releases list (last 5)

---

## 1. Snapshot / Project Profile

| Item | Value |
|------|-------|
| Full name | `Fincept-Corporation/FinceptTerminal` |
| Homepage | <https://fincept.in> |
| Created | 2024-08-29 |
| Last pushed | 2026-04-20 (active — same day as audit) |
| Stars | **8,550** |
| Forks | **1,212** |
| Open issues | ~20 |
| Primary language (GitHub) | Python |
| Actual primary language | **C++20** (Qt6) with embedded **Python 3.11** for analytics (since v4) |
| License (claimed in README) | AGPL-3.0 + Commercial (dual) |
| License (detected by GitHub) | **"Other / NOASSERTION"** ⚠️ (mismatch — see §3.1) |
| Topics | `bloomberg-terminal`, `finance`, `quantitative-finance`, `stock-market`, `foss`, `help-wanted`, `good-first-issue`, `machine-learning`, … |
| Has Issues / Discussions / Wiki | Yes / Yes / Yes |

### Product in one sentence
An **open-source, native-desktop Bloomberg-terminal alternative** — CFA-level analytics, 100+ data connectors, 37 AI agents across investor/economic/geopolitics frameworks, 16 broker integrations, and real-time crypto/equity trading — shipped as a single Qt6/C++20 binary per platform.

### Repo top-level layout
```text
.
├── .github/            # workflows, issue/PR templates, CONTRIBUTING, FUNDING.yml
├── docs/               # ARCHITECTURE, CONTRIBUTING, CPP/PYTHON guides, GETTING_STARTED, translations, COMMERCIAL_LICENSE, CODE_OF_CONDUCT
├── fincept-qt/         # C++20 Qt6 application (src, tests, cmake, packaging, scripts, resources)
│   ├── .clang-format  .clang-tidy  .clangd  .cppcheck-suppressions
│   ├── CMakeLists.txt (~100 KB)   CMakePresets.json
│   ├── DATAHUB_ARCHITECTURE.md  DATAHUB_PHASES.md
│   └── src/ tests/ packaging/ ...
├── images/             # screenshots
├── Dockerfile
├── LICENSE             # AGPL + custom preamble (see §3.1)
├── README.md           # rich marketing README
├── setup.sh            # Linux/macOS one-click build
├── package.json        # 3 bytes, contents: {}        ← stray stub (see §3.2)
├── package-lock.json   # 94 bytes                    ← stray stub (see §3.2)
├── fincept_icon.ico
├── funding.json        # Drips / OSS funding manifest
└── updates.json        # auto-updater manifest
```

### CI surface
`.github/workflows/` contains:
- `build-cpp.yml` (~40 KB — substantial build matrix)
- `lint.yml`
- `release.yml` (~58 KB — substantial release pipeline)
- `test-setup.yml`
- `translate-readme.yml`

No `codeql.yml` / security-scan workflow was found at the snapshot commit.

### Release cadence (last ~2 months)
`v3.3.0` (2026-02-09) → `v3.3.3` (2026-02-23) → `v4.0.0` (2026-03-30, C++ rewrite GA) → `v4.0.1` (2026-04-15) → `v4.0.2` (README). **Healthy and accelerating.**

---

## 2. What's Good ✅

1. **Genuine product with scale.** 8.5k stars / 1.2k forks, daily pushes, Trendshift-listed. This is not vaporware; it is a real, shipping financial terminal with a paying-customer path (university licensing @ $799/month/20 seats, commercial data API).
2. **Ambitious and well-executed v4 rewrite** — pure native C++20 + Qt6 with embedded Python. Ships as a single per-platform binary (no Electron, no Node runtime).
3. **Toolchain is pinned and reproducible.** `CMakeLists.txt` is enormous (~100 KB) but the project commits to exact versions: CMake 3.27.7, Ninja 1.11.1, Qt 6.8.3, Python 3.11.9, with platform SDK floors. There is an explicit `FINCEPT_ALLOW_QT_DRIFT=ON` escape hatch. This is the right model for a desktop app shipping installers.
4. **Solid C++ tooling is actually checked in** — `.clang-format`, `.clang-tidy`, `.clangd`, `.cppcheck-suppressions`. Good editor-day-one ergonomics.
5. **CMake presets** (`win-release`, `linux-release`, `macos-release`, and `-debug` variants). Contributors need two commands.
6. **Multi-platform shipping in one pipeline.** `release.yml` is 58 KB and produces Windows x64 setup, Linux x64 `.run`, macOS arm64 `.dmg`. Releases are cut by `github-actions[bot]` — automated.
7. **Auto-update in the product** via `updates.json` at repo root. End-users get patched without scraping releases.
8. **Dual-track contributor story.** Separate `CPP_CONTRIBUTOR_GUIDE.md` and `PYTHON_CONTRIBUTOR_GUIDE.md` — recognizes the polyglot reality and removes ambiguity for newcomers.
9. **Governance files are present:** `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `COMMERCIAL_LICENSE.md`, issue templates, PR templates, `FUNDING.yml`, `funding.json` (Drips), `ARCHITECTURE.md`, `GETTING_STARTED.md`, a `DATAHUB_ARCHITECTURE.md` + `DATAHUB_PHASES.md` design doc.
10. **Internationalized** — `docs/translations/` exists, plus a `translate-readme.yml` workflow that automates README translations.
11. **Clear monetization architecture** — AGPL-3.0 copyleft as the moat, commercial license for businesses/API consumers. This is a time-tested model (MongoDB-pre-SSPL era, GhostScript, MySQL). The `docs/COMMERCIAL_LICENSE.md` is present and visible.
12. **Trendshift-listed, good-first-issue tag, help-wanted tag** — the maintainers are actively courting contributors, not doing drive-by open source.
13. **Docker image published** via GHCR (`ghcr.io/fincept-corporation/fincept-terminal:latest`). Useful for CI and headless integration testing even if desktop-in-Docker is awkward for end users.
14. **Breadth of features is a real moat** — 37 AI agents (Buffett, Graham, Lynch, Munger, Klarman, Marks profiles), 100+ data sources (DBnomics, Polygon, Kraken, FRED, IMF, World Bank, AkShare), 16 Indian + global brokers, 18 QuantLib quant modules, maritime/geopolitics intel, visual node editor. Hard to replicate.

---

## 3. What's Bad ❌ (findings, prioritized)

### 3.1 🔴 HIGH — License is not machine-detectable
GitHub reports the license as **"Other / NOASSERTION"** despite the README clearly stating AGPL-3.0. This almost always means `LICENSE` has a non-standard preamble prepended (likely the Fincept trademark clause, which the README footer trails: *'"Fincept Terminal" and "Fincept" are trademarks of Fincept…'*). `licensee` (GitHub's detector) then can't match the SPDX AGPL-3.0 fingerprint.

**Consequences:**
- GitHub's "License" badge shows nothing / "Other" — harms trust.
- Many enterprise legal scanners (Fossa, ScanCode, BlackDuck) will flag it as unknown license, blocking enterprise adoption.
- Linux distro packagers (Debian, Fedora) reject "NOASSERTION".
- Dual-license discoverability is degraded.

**Fix:** Split into (1) pristine `LICENSE` containing only the AGPL-3.0 SPDX text, and (2) a separate `TRADEMARKS.md` / `NOTICE` for trademark and commercial-license pointers. Add SPDX headers to source files:
```cpp
// SPDX-License-Identifier: AGPL-3.0-or-later
// SPDX-FileCopyrightText: 2024-2026 Fincept Corporation
```

### 3.2 🟠 MEDIUM — Stray `package.json` / `package-lock.json` in root
Root contains `package.json` (literally `{}`, 3 bytes) and `package-lock.json` (94-byte stub). This is a C++/Qt/Python project. The stubs cause:
- GitHub language stats pollution.
- Dependabot / npm-audit security scanners hallucinate a Node.js project and may open empty or spurious alerts.
- Contributor confusion ("is this an Electron app?") which directly contradicts the "no Node.js, no browser runtime, no JavaScript bundler" claim in `## What Sets Us Apart`.

**Fix:** `git rm package.json package-lock.json`. If something in CI depended on them (unlikely given contents), move that bootstrap inside `fincept-qt/` or `scripts/`.

### 3.3 🔴 HIGH — Credential storage is weak on Linux
Open PR [#161](https://github.com/Fincept-Corporation/FinceptTerminal/pull/161) (*"fix: add libsecret integration for Linux credential storage"*) states that the current fallback is **XOR obfuscation**. For an app that stores live credentials for **16 brokers** including IBKR, Alpaca, Zerodha, Angel One, Kotak, Tradier, Saxo, etc., XOR is not encryption — it is trivially reversible. The PR author themselves labels it `Severity: MEDIUM / Type: Security`, which seems understated given the threat surface (a financial terminal whose compromise can move real money).

**Worsening factors:**
- The PR has been open since 2026-04-19 with no visible merge action.
- There is **no `SECURITY.md`** at the repository root or in `.github/` (verified — the file does not exist), so there is no documented responsible-disclosure channel.

**Fix (see §4 plan):**
1. Land libsecret on Linux, macOS Keychain, and Windows Credential Manager (DPAPI).
2. Add `SECURITY.md` with a disclosure email (e.g. `security@fincept.in`) and PGP key.
3. Remove the XOR fallback entirely — refuse to store credentials if no OS secure store is available; log and notify instead.
4. Add a startup audit log that tells the user *which* backend is protecting their creds.

### 3.4 🟠 MEDIUM — Several critical-path fix PRs are open and unmerged
Same contributor (`rajpratham1`) has four stability PRs open simultaneously, all untriaged at audit time:
- #162 — null pointer checks in HTTP timeout handler (Broker HTTP — *Severity: MEDIUM*)
- #163 — DB transaction error handling (fails-silent risk)
- #164 — race condition in `ExchangeService` WebSocket cleanup (Trading — *Severity: HIGH*)
- #165 — memory leak / use-after-free in `PythonRunner` (*Severity: HIGH*)

Each is narrowly scoped and reads like a credible bug fix for a trading app. The fact that four independently-severe fixes are queued without reviewer engagement suggests **maintainer review bandwidth is the current bottleneck** — not a code quality issue. This is the classic failure mode of a 1–3-maintainer / 1.2k-fork project.

### 3.5 🟠 MEDIUM — Bug reports are low-signal because templates don't enforce fields
Issue [#179](https://github.com/Fincept-Corporation/FinceptTerminal/issues/179) is a textbook example: an entirely blank template submitted as-is (empty "What happened?", empty "Steps to Reproduce", etc.). The current bug template appears to be legacy `.md` with placeholders, which GitHub will happily submit empty.

**Fix:** Migrate `.github/ISSUE_TEMPLATE/bug.md` to a GitHub **Issue Form** (`bug.yml`) with `required: true` on:
- Version
- OS + OS version
- Short reproduction
- Crash/error log

This alone will probably reduce issue triage cost by 30–50%.

### 3.6 🟠 MEDIUM — No visible code scanning (CodeQL) workflow
The workflow list contains `build-cpp.yml`, `lint.yml`, `release.yml`, `test-setup.yml`, `translate-readme.yml`, but no `codeql.yml`. For a project that:
- handles real brokerage credentials,
- embeds Python (injection surface),
- opens ~20 outbound WebSocket/REST connectors,
- runs 100+ data-connector parsers (untrusted input),

not having CodeQL is a standards gap. CodeQL supports C++ and Python, both of which are in-scope here.

**Fix:** add `.github/workflows/codeql.yml` with both `cpp` and `python` language matrix. Advanced-config is fine — use default queries to start.

### 3.7 🟡 LOW — Recurring macOS launch failures on shipping installers
Recent open issues (#182, #173) are both *"app crashes on launch / not compatible"* on macOS 14.x Apple Silicon — i.e. on a **shipped installer**. The release pipeline produces a `.dmg`, but there is no evidence of a **post-build smoke test that actually launches the installed binary** on a macOS runner.

**Fix:** add to `release.yml` a final "install the artifact I just built, launch `--version` or similar, assert exit 0" step per platform. This is ~20 lines and catches 80% of "it doesn't even open" regressions.

Related: issue #180 requests Intel-Mac (x86_64) support. `v4.0.0` did ship universal + x86_64 tarballs but `v4.0.1`/`v4.0.2` installer table only lists Apple Silicon. That regression should be reverted or clearly documented.

### 3.8 🟡 LOW — `package.json` + missing top-level `.editorconfig`
Related to §3.2. The project spans C++, Python, CMake, YAML, Markdown. A top-level `.editorconfig` with indent rules per language would unify contributor experience. Currently the C++ side has `.clang-format`, but Python/YAML/CMake do not have declared indent/EOL.

### 3.9 🟡 LOW — No curated `CHANGELOG.md`
Releases are auto-generated by `github-actions[bot]` and the bodies are largely "Downloads" tables. A hand-curated `CHANGELOG.md` (Keep-a-Changelog style) would help enterprise evaluators and the auto-updater's release notes flow (`updates.json` already drives the updater).

### 3.10 🟡 LOW — Docker story is confusing for desktop users
The README offers a Docker option but immediately warns *"Docker is primarily intended for Linux. macOS and Windows require additional XServer configuration."* For a desktop app this is the wrong framing — Docker should be presented as the **headless/CI path for backend analytics and data-connector work**, not as an install option for end users. Move the Docker section out of "Installation" into "Development / CI".

### 3.11 🟡 LOW — Single-author review risk & `setup.sh` Windows gap
`setup.sh` covers Linux/macOS. Windows is documented as "just two commands" but with an implicit prerequisite (`~/Documents/PowerShell/Microsoft.PowerShell_profile.ps1` auto-initializing VS 2022). On a clean box that profile is not present, so the advertised "quick start" is not quick. A tiny `setup.ps1` would close the gap.

---

## 4. Prioritized Improvement List (RICE-ordered)

Scored 1–5 on **Reach** (how many users benefit), **Impact** (how strongly), **Confidence** (in the estimate), and **Effort** (inverse — 5 = small). Higher = better.

| # | Improvement | R | I | C | E | Score | Owner estimate |
|---|-------------|---|---|---|---|------:|----------------|
| 1 | Replace XOR with OS-native secret storage (libsecret / Keychain / DPAPI); remove XOR fallback; land PR #161 & follow-up | 5 | 5 | 4 | 2 | **200** | 2 eng-weeks, security-critical |
| 2 | Add `SECURITY.md` + `security@fincept.in` disclosure channel | 5 | 5 | 5 | 5 | **625** | 1 hour |
| 3 | Fix `LICENSE` detection (split trademark/commercial notes into `NOTICE`/`TRADEMARKS.md`; add SPDX headers) | 5 | 4 | 5 | 4 | **400** | 1 day |
| 4 | Delete `package.json` / `package-lock.json` root stubs | 5 | 2 | 5 | 5 | **250** | 5 minutes |
| 5 | Merge the four rajpratham1 stability PRs (#162–#165) after review | 4 | 4 | 4 | 4 | **256** | 1 eng-day of review |
| 6 | Convert `.github/ISSUE_TEMPLATE/bug.md` → `bug.yml` with required fields | 5 | 3 | 5 | 5 | **375** | 2 hours |
| 7 | Add CodeQL workflow (cpp + python matrix) | 5 | 4 | 4 | 4 | **320** | 2 hours |
| 8 | Add post-build "launch installer + smoke test" step per platform in `release.yml` | 4 | 4 | 3 | 3 | **144** | 1 eng-day |
| 9 | Restore Intel-Mac (x86_64) installer in v4.0.x releases (or document deprecation) | 3 | 3 | 4 | 3 | **108** | 1 eng-day |
| 10 | Curated `CHANGELOG.md`; release-drafter to generate from PRs | 4 | 2 | 5 | 4 | **160** | 1 day setup + per-release overhead |
| 11 | Re-frame Docker section as "Headless / CI", not "Installation Option 3" | 3 | 2 | 5 | 5 | **150** | 30 minutes |
| 12 | Add root `.editorconfig` covering Python/YAML/CMake/Markdown | 3 | 2 | 5 | 5 | **150** | 30 minutes |
| 13 | Add `setup.ps1` for Windows parity with `setup.sh` | 3 | 3 | 3 | 3 | **81** | 1 eng-day |
| 14 | Triage bot / stale bot to close zero-content issues after N days | 4 | 2 | 4 | 4 | **128** | 2 hours |
| 15 | `dependabot.yml` for GitHub Actions, `pip`, `submodule`, and (after #4) the Python side | 5 | 3 | 4 | 4 | **240** | 2 hours |

---

## 5. Implementation Plan (3 waves, ~4 weeks)

### Wave 1 — "Zero-risk cleanups" (same day / week 1)
These are pure hygiene, no product behaviour changes, reviewable in minutes:

1. **Delete** `package.json`, `package-lock.json` from root.
2. **Add** `SECURITY.md` at root (template below, §6.1).
3. **Split** `LICENSE`:
   - `LICENSE` ← pristine AGPL-3.0 text (from <https://www.gnu.org/licenses/agpl-3.0.txt>).
   - `NOTICE` ← current trademark + commercial-license pointers.
   - README's License section links to both.
4. **Add** root `.editorconfig` (template §6.2).
5. **Convert** `.github/ISSUE_TEMPLATE/bug.md` → `bug.yml` (Issue Form, template §6.3).
6. **Add** `.github/dependabot.yml` for `github-actions` + `pip` ecosystems (template §6.4).
7. **Add** CodeQL workflow `.github/workflows/codeql.yml` (template §6.5).
8. **Re-frame** README's Docker section under a new `## Development & CI` heading.

*Deliverable:* one PR, ~8 files, no code-logic changes. Blast radius effectively zero.

### Wave 2 — "Security & stability merge window" (week 2)
1. **Review & merge** PRs #162, #163, #164, #165 (rajpratham1's stability fixes). Add regression tests in `fincept-qt/tests/` for each.
2. **Land** PR #161 (libsecret) **and then go further**: add corresponding macOS Keychain and Windows DPAPI paths; remove the XOR fallback entirely (replace with a hard error + clear user-facing message: *"No OS secret store available — credential storage disabled. Install `libsecret-1-0` or contact support."*).
3. **Add** a startup log line: `[secure-store] backend=keychain|libsecret|dpapi ok`.
4. **Add** unit test coverage for each secure-store backend (mocked).

*Deliverable:* one security-focused release (`v4.0.3` or `v4.1.0`). Coordinate disclosure via the new `SECURITY.md`.

### Wave 3 — "Release quality & contributor UX" (weeks 3–4)
1. **Add** post-build smoke tests in `release.yml`: install the artifact, launch the binary with `--version`, assert exit 0 and non-empty stdout. One job per platform.
2. **Decide & document** Intel-Mac status (#180). Either restore the `universal` build or add an explicit "Intel Macs are end-of-life as of v4.0.x" note, with the last working v4 commit pinned.
3. **Add** `setup.ps1` mirroring `setup.sh`.
4. **Add** release-drafter to build `CHANGELOG.md` from labeled PRs.
5. **Add** `actions/stale` to auto-label empty/no-response issues.
6. **Add** CodeQL results to the PR checks (already from Wave 1 — this is just enforcement).

*Deliverable:* measurable drop in "crashes on launch" and "blank bug report" noise; quantifiable via issue-label counts before/after.

---

## 6. Drop-in Templates (ready to paste upstream)

### 6.1 `SECURITY.md`
```markdown
# Security Policy

## Supported versions
| Version | Supported |
|---------|-----------|
| 4.0.x   | ✅        |
| 3.x     | ❌ (EOL)  |

## Reporting a vulnerability
Please email **security@fincept.in** with:
- A description of the issue and potential impact
- Reproduction steps or PoC
- Your disclosure timeline preference

We commit to:
- Acknowledging your report within **3 business days**
- Providing a remediation timeline within **10 business days**
- Crediting you in release notes (unless you prefer anonymity)

For sensitive reports, use our PGP key: [link to fincept.in/security.asc].

Please do **not** open public issues for security vulnerabilities.
```

### 6.2 Root `.editorconfig`
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 4

[*.{yml,yaml,json,md}]
indent_size = 2

[*.{cpp,hpp,cc,h,cxx}]
indent_size = 4
# defer to .clang-format in fincept-qt/

[CMakeLists.txt]
indent_size = 2

[Makefile]
indent_style = tab
```

### 6.3 `.github/ISSUE_TEMPLATE/bug.yml`
```yaml
name: "🐛 Bug report"
description: Report a bug in Fincept Terminal
title: "[BUG] "
labels: ["bug", "needs-triage"]
body:
  - type: input
    id: version
    attributes:
      label: Fincept Terminal version
      placeholder: "4.0.2"
    validations: { required: true }
  - type: dropdown
    id: os
    attributes:
      label: Operating system
      options: [Windows 10, Windows 11, macOS 13, macOS 14, macOS 15,
                Ubuntu 22.04, Ubuntu 24.04, Debian 12, Fedora 40, Other]
    validations: { required: true }
  - type: input
    id: qt
    attributes:
      label: Qt version (if known)
      placeholder: "6.8.3"
  - type: textarea
    id: what
    attributes:
      label: What happened?
      description: Clear, concise description of the bug.
    validations: { required: true }
  - type: textarea
    id: repro
    attributes:
      label: Steps to reproduce
      value: |
        1.
        2.
        3.
    validations: { required: true }
  - type: textarea
    id: logs
    attributes:
      label: Error logs / crash logs
      render: shell
  - type: checkboxes
    id: terms
    attributes:
      label: Pre-submit checklist
      options:
        - label: I searched existing issues and didn't find a duplicate
          required: true
        - label: This is not a security vulnerability (those go to security@fincept.in)
          required: true
```

### 6.4 `.github/dependabot.yml`
```yaml
version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule: { interval: "weekly" }
  - package-ecosystem: "pip"
    directory: "/"
    schedule: { interval: "weekly" }
    open-pull-requests-limit: 5
  - package-ecosystem: "docker"
    directory: "/"
    schedule: { interval: "weekly" }
```

### 6.5 `.github/workflows/codeql.yml`
```yaml
name: CodeQL
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
  schedule: [{ cron: "0 6 * * 1" }]

jobs:
  analyze:
    name: Analyze (${{ matrix.language }})
    runs-on: ubuntu-latest
    permissions:
      security-events: write
      actions: read
      contents: read
    strategy:
      fail-fast: false
      matrix:
        language: [cpp, python]
    steps:
      - uses: actions/checkout@v4
      - uses: github/codeql-action/init@v3
        with:
          languages: ${{ matrix.language }}
      - if: matrix.language == 'cpp'
        run: |
          sudo apt-get update
          sudo apt-get install -y qt6-base-dev qt6-charts-dev qt6-tools-dev \
            qt6-base-private-dev libqt6websockets6-dev libgl1-mesa-dev ninja-build
          cmake -S fincept-qt -B build -G Ninja -DCMAKE_BUILD_TYPE=Release \
            -DFINCEPT_ALLOW_QT_DRIFT=ON
          cmake --build build
      - uses: github/codeql-action/analyze@v3
        with: { category: "/language:${{ matrix.language }}" }
```

---

## 7. Ready-to-file Upstream Issue (paste into `Fincept-Corporation/FinceptTerminal`)

> **Note:** This audit was produced by an automation environment that is not permitted to open PRs or issues in external repositories. The block below is written so it can be filed as-is by a maintainer or the requester via [New Issue](https://github.com/Fincept-Corporation/FinceptTerminal/issues/new).

---

**Title:** Repo audit: security, licensing, and release-quality improvements (external review)

**Body:**

Hi Fincept maintainers 👋 — this is an external, friendly audit of the repo performed on 2026-04-20 against commit `0c6d17a`. Thank you for building FinceptTerminal; the v4 C++/Qt rewrite is impressive. Below are 15 improvements ordered by impact, grouped into three waves that can land as separate PRs. Full rationale and drop-in templates (SECURITY.md, editorconfig, issue-form, dependabot, CodeQL workflow) are in the linked audit doc.

### High-impact findings
1. 🔴 **Credential storage on Linux is XOR-obfuscated** (per open PR #161). For an app holding live creds for 16 brokers, XOR is not encryption. Recommend landing libsecret + macOS Keychain + Windows DPAPI and **removing** the XOR fallback (hard-fail + user message instead).
2. 🔴 **No `SECURITY.md`** — no documented disclosure channel for a financial app. Drop-in template available.
3. 🔴 **GitHub reports license as "Other / NOASSERTION"** despite AGPL-3.0 in README. The `LICENSE` file likely has non-SPDX preamble (trademark clause). Split into pristine `LICENSE` + `NOTICE` and add SPDX headers so `licensee`, Fossa, ScanCode, and distro packagers can detect it.
4. 🟠 **Four open stability PRs (#162, #163, #164, #165)** from one contributor addressing memory/race/null-ptr issues in Python runner, WebSocket exchange service, DB transactions, and broker HTTP. They look credible and review-ready.
5. 🟠 **Stray Node.js stubs** — root contains `package.json` (`{}`, 3 bytes) and `package-lock.json`. This contradicts the "no Node" positioning and pollutes scanners. Delete.
6. 🟠 **Bug template allows empty submissions** (e.g. #179). Convert `bug.md` → `bug.yml` Issue Form with required fields.
7. 🟠 **No CodeQL workflow** despite C++ + Python surface and network-facing connectors. Drop-in YAML provided.
8. 🟡 **Release pipeline has no post-build installer smoke test** — macOS launch regressions (#173, #182) would be caught by a `install → launch → assert exit 0` step per platform.
9. 🟡 Intel-Mac installer is absent in v4.0.1/4.0.2 but present in v4.0.0 (#180). Clarify policy.
10. 🟡 No curated `CHANGELOG.md`; release bodies are download tables only.

### What's already excellent ✅
- Pinned toolchain (Qt 6.8.3, CMake 3.27.7, Python 3.11.9) with an explicit drift escape hatch
- Clean CMake presets, `.clang-format`, `.clang-tidy`, `.clangd`, cppcheck suppressions
- Dual-track contributor guides (C++ + Python)
- `ARCHITECTURE.md`, `DATAHUB_ARCHITECTURE.md`, `DATAHUB_PHASES.md` design docs committed
- Automated release pipeline (`release.yml` ~58 KB) producing Windows/Linux/macOS installers
- Auto-updater manifest (`updates.json`)
- `CODE_OF_CONDUCT.md`, `COMMERCIAL_LICENSE.md`, `funding.json` (Drips), translated READMEs
- Healthy release cadence (v3.3.0 → v4.0.2 in ~10 weeks)

### Proposed PR breakdown
- **PR A — Zero-risk hygiene:** delete Node stubs, add `SECURITY.md`, split `LICENSE`/`NOTICE`, add `.editorconfig`, convert bug template, add `dependabot.yml`, add CodeQL workflow. ~8 files, no behaviour change.
- **PR B — Security hardening:** secure-store on all 3 OSes, remove XOR, regression tests. Release as v4.1.0 with security advisory.
- **PR C — Release quality:** post-build smoke tests, Intel-Mac decision, `setup.ps1`, release-drafter + `CHANGELOG.md`, `actions/stale`.

Happy to split any of these off into separate issues if that helps triage.

Full audit with templates and rationale: [link to this document].

— External reviewer (friendly; no affiliation)

---

## 8. What this sandbox *cannot* do (transparency)

Per the environment constraints under which this audit was produced:

- I cannot clone the FinceptTerminal repository locally.
- I cannot open a pull request or issue in `Fincept-Corporation/FinceptTerminal` — my write access is scoped to the `midnghtsapphire` organization's repo this audit lives in.
- I therefore cannot "merge the changes with them" as the issue phrasing requested.

What I **did** do is deliver the artifact that unblocks that next step: a ready-to-file issue body (§7) and drop-in file templates (§6) that a maintainer, the requester, or any contributor can paste upstream in ≤5 minutes. That is the actionable equivalent of an upstream PR from outside the org, without a credential-forging workaround.

---

## 9. Changelog for this audit document

| Date | Change |
|------|--------|
| 2026-04-20 | Initial audit at commit `0c6d17a`, v4.0.1 / README v4.0.2 |
