# Plan: public / private split of revvel-standards

Status: **PLAN ONLY — nothing has been executed.** Drafted 2026-10-30 by GitHubOrchestrator for Audrey Evans (owner).

> **Any visibility change (making a repo private or public, creating a new public repo from private material) requires Audrey's own explicit approval.** No bot may change visibility on its own. This plan changes nothing.

## 1. Why a split is needed

- GitHub visibility is per repository. **GitHub cannot make individual folders or files private.** If a repo is public, every file and every past commit is public.
- `midnghtsapphire/revvel-standards` is currently **public** (about 688 MB, more than 12,500 commits). It mixes public standards and docs with private source, data, ledgers, case files and paid material.
- `.gitignore` or deleting a file doesn't help: the history stays public. Deletion is also against house rules.

## 2. Proposed structure

| Repo | Visibility | Contents |
|---|---|---|
| `revvel-standards` (public) | public | Standards, docs meant for others, storefront/site, templates, skill docs that are free to share |
| `revvel-standards-private` (new) | private | Source code, data, ledgers and memory, case files, resumes, paid/licensed products, internal ops |

Option: link them with a **git submodule** (`private/` in the public repo → private repo). Public viewers see only a pointer, and authorized clones get both. Alternatively, keep them unlinked and cross-reference by URL.

## 3. Top-level classification (main @ 4904769; file counts in parentheses)

**PUBLIC: standards, docs, storefront**
- `Library/` (1), `standards/` (93), `templates/` (195), `skills/` (187; doc skills; see note on paid packs), `site/` (1), `index.html`, `404.html`, `.nojekyll`, `llms.txt`, `README.md`, `LICENSE`, `CHANGELOG.md`, `MASTER.md`, `AGENTS.md`, `CLAUDE.md`, `CODE_REVIEW_STANDARD.md`, `QUICKSTART.md`, `VISITING_AGENTS.md`, `WR_TEMPLATE*.md`, `START_HERE_CALL_CHAIN.md`, `schemas/` (4), `avatars/` (1), and the architecture images/PDFs at the root (`Self-*.jpg`, `Anatomy_*.jpg`, `The_*.pdf`) **if** they are meant for marketing.
- Repo tooling that is safe to show: `.editorconfig`, `.markdownlint*`, `.lintmdrc`, `.flake8*`, `dprint.json`, `.gitattributes`, `.gitignore`, `.pre-commit-config.yaml`, `.pre-commit-hooks/`, `.coderabbit.yaml`, `.circleci/`, `.github/` (260; review workflows for internal URLs first), `.env.example`.

**PRIVATE: source, data, ledgers, paid or licensed**
- Ledgers, memory, state: `wr/` (539, including `wr/memory/decisions.jsonl`), `logs/` (3, failure-ledger), `DECISIONS.md`, `DECISIONS-TODAY.md`, `HANDOFF.md`, `MEMORIES.md`, `REMINDERS.md`, `THINKING_SCRATCHPAD.md`, `SYSTEM_STATE.md`, `SHIP_STATUS.md`, `REVENUE_GATE.md`, `REPO_AUDIT.md`, `state.json`, `dashboard-data.json`, `.session.db`, `.agents_tmp/`, `.sandbox/`, `.veins/`, `.gitbutler/`, `.openhands/`, `.claude/`, `.mcp.json`, `.cursorrules`.
- People and case data: `docs/case-files/` (public-records PDFs), `resumes/` (1), `fieldwork/` (8), `osint-hub/` (4), `coldtrace/` (24), `fraud-signal-verification-fleet/` (38), `data/` (5), `inventory/` (4).
- Revenue and paid: `products/` (708, including the skills-vault PDF builder and dist), `revenue/` (5), `penny-sovereign-yield-scout/` (31), `reesereviews/` (29), `trust-community/` (4), `hvac-bom-generator*.html`.
- Source and infrastructure: `mcp-servers/` (279), `packages/` (27), `src/` (2), `scripts/` (172), `tools/` (6), `engines/` (3), `gatekeeper-cli/` (13), `growlingeyes/` (26), `agent-factory/` (7), `agent-pack/` (4), `revvel-rosette-automation/` (35), `oaudrey/` (11), `ops/` (8), `config/` (21), `disaster-recovery/` (6), `install/` (10), `compliance/` (11), `sql/` (7), `poc/` (4), `postman/` (1), `workflows/` (22), `ui/` (8), `projects/` (76), `artifacts/` (31), `fork-audit/` (1), `test-wr/` (1), `testing/` (1), `tests/` (209), `revvel-standards/` (1, nested), `voices/` (1), `process/` (2).
- Root apps and data files: `dashboard.html`, `connections-dashboard.html`, `agent-creator*.{html,js,json}`, `hub-registry.{js,json}`, `tokens.json`, `Dockerfile`, `vercel.json`, `package*.json`, `tsconfig.json`, `requirements-spike.txt`, and the remaining root `*.md` (GOAL, GOAP*, AGENT-DEPLOY-*, IMPLEMENTATION_SUMMARY*, MODEL_CONFIG, ASSUMPTIONS, TRUSTFORGE_SETUP, DASHBOARD_QUICKREF, README_SOCIAL_MEDIA_AUTOMATION, learnings.md, promptforproject.md, recurse-rules.md, seed.md, llms.txt.incoming.bak), plus `fix-semgrep.js` and `fix-zizmor.js`.
- **`docs/` (1450) is mixed** and needs a sub-folder pass. Keep public standards and guides public; move `docs/case-files/`, `docs/archive/`, `docs/Master_Inventory/`, and any client, legal or tax material to private.
- **Needs Audrey's call:** `skills/` (free docs vs. paid packs), the root PDFs and images, `projects/`, `reesereviews/`.

## 4. Migration steps (full history kept, nothing deleted)

1. **Freeze:** pause bot writes to `revvel-standards`. Record a ledger entry with the current `main` SHA.
2. **Create the private copy with all history:** `git clone --mirror` the repo, then push the mirror to the new **private** `revvel-standards-private`. Every branch, tag and commit is preserved. *(Creating the repo is not a visibility change to an existing repo, but Audrey approves it anyway.)*
3. **Verify:** compare commit counts and the `main` SHA between the two; record both in the ledger.
4. **Decide what to do with the public repo.** Audrey chooses one:
   - **4a. Safest:** make the existing repo private. Its history then stops being public. Then create a *new* public repo whose first commit contains only the PUBLIC folders (fresh history; the full history lives in the private repo). Linking the new public commit to the private SHA in its README and ledger gives provenance.
   - **4b.** Keep the existing repo public, and in a PR move PRIVATE folders out by renaming them to `*.moved-to-private` pointer files. **Warning:** the history stays public, so 4b does not protect anything already pushed.
   - Rewriting history (filter-repo) is excluded, because it violates no-delete and no-force-push.
5. Optionally add a submodule `private/` → `revvel-standards-private` in the public repo.
6. Update `MASTER.md` and the README to explain the split. Add a CHANGELOG and ledger entry for every step.
7. Rotate any credential from §6 that is real, **before** any public step and regardless of which option is chosen.

## 5. GitLab and Gitee mirrors

- GitLab and Gitee (both `midnghtsapphire`) are approved alternative primaries or mirrors (ledger `github-not-hard-dependency`, `gitlab-approved-alternative`).
- Mirror the **private** repo as private on both, and the public repo as public. Never mirror private content into a public project.
- Use `git push --mirror` to each remote. Nothing depends on GitHub Actions (they're locked by billing).
- Status: `glab` isn't installed and neither remote is set up. Local copies of `Library/standards/bot-role-symbols.md` are in `/workspace/gitlab-mirror` and `/workspace/gitee-mirror` on the agent box.
- Gitee may review public content; keep sensitive material private there too.

## 6. Read-only history scan (2026-10-30)

**Tool:** gitleaks v8.30.1 with `--redact`, all refs. It scanned 11,556 commits (about 754 MB). Blobs over 5 MB were not fetched, so large binaries weren't scanned. **No secret values are reproduced here.**

**Result:** 167 findings, all rule `generic-api-key`, across 14 files.

| File (on main unless noted) | Hits | Assessment | Example commits |
|---|---|---|---|
| `.secrets.baseline` | 141 | detect-secrets baseline (hashes); false positive | 12673ed03, 32f40f05d, d3bee1e46 |
| `docs/PR_REVIEW_REQUEST_AUTOMATION.md` (+ old root copy `PR_REVIEW_REQUEST_AUTOMATION.md`) | 3+1 | **Review:** `apiKey = "…"` with a mixed-case value that looks real | 9918a102d, 12673ed03, dab14bbca |
| `docs/archive/RESPONSE_TO_MIDNGHTSAPPHIRE.md` (+ old copies at root and `archive/`) | 2+2 | **Review:** `secret_value` with a mixed-case value that looks real | b1ad86cad, dab14bbca, 12673ed03 |
| `tests/evaluate-claude-fleets.test.js`, `tests/pre-review-gate.test.js` | 3, 1 | deliberate "bad.js" test fixtures; likely fake | c2c77bca4, e76d655d4 |
| `growlingeyes/doppemcp/tests/test_server.py`, `mcp-servers/doppler-mcp/tests/test_server.py` | 3, 3 | Doppler-token-shaped test fixture; verify it's fake | 76e96c3ae, abd2da65e |
| `mcp-servers/ensemble-ahp-engine/ensemble_ahp/config.py` | 2 | `*_KEYLESS_HINT` text; false positive | 383906d98, df9adaae4 |
| `SYSTEM_STATE.md`, `learnings.md`, `docs/blue-ocean-sar/opendata/fetch.py` | 3, 2, 1 | prose or function args; false positive | c85517f59, f1f3e3678, cec16d1d7 |

**Other private data found in history:**
- **Commit author emails:** most use GitHub noreply addresses. About 118 commits carry a personal gmail address. Other domains seen: freedomangel.org, midnghtsapphire.com, revvel.ai, revvel.dev, yahoo.com, and tool vendors. These are public in history now; moving to a private repo (4a) hides them.
- **Data files in history:** 425 `.jsonl`, 54 `.pdf`, 40 `.csv`, and a `.session.db` (a database at the root, first added in c2c77bca4).
- **On main:** 117 PDF/CSV/ledger-type files under `docs/`, including `docs/case-files/…` public-records PDFs, plus `resumes/`, `wr/memory/*.jsonl`, `logs/failure-ledger/`, and `config/error-ledger.json`.
- No `.env`, `.pem`, `id_rsa` or `.key` files were found in history (only `.env.example`).

**Recommended (needs Audrey):**
- Treat the two "Review" values as possibly real and rotate them at the provider.
- Confirm the Doppler fixtures are fake.
- Choose option 4a or 4b.

## 7. Approvals needed from Audrey

1. Creating `revvel-standards-private` (private).
2. Option 4a (make the existing repo private) or 4b. **Visibility changes require Audrey's own approval.**
3. Final folder classification, especially `docs/`, `skills/`, `projects/` and the root PDFs.
4. Credential rotation for the §6 review items.
5. Setting up the GitLab and Gitee remotes.
