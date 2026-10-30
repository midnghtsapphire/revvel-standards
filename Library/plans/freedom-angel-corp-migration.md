# Plan: sealing sensitive folders in public repos, with optional freedom-angel-corp backups

Status: **PLAN ONLY. Nothing has been executed.** Drafted 2026-10-30 by GitHubOrchestrator for Audrey Evans (owner). This supersedes PR #18216 (public/private split).

**Final scope from Audrey:**
- Every `midnghtsapphire` repo **stays PUBLIC**.
- No visibility changes, no fresh or orphan histories, no history rewrites, no transfers, no deletes.
- Each active repo gets `halo-seal` encryption at the point it is next worked on.

Reference: `/workspace/research/2026-10-30_private-folders-and-actionless-ci.md` (halo-seal, halo-guard, wingit-runner).

## 1. Sensitive items already in history (revvel-standards)

Git history is public and permanent; sealing protects only what is committed from now on. Option codes:
- **R**: rotate
- **S**: seal going forward
- **L**: leave as is
- **W**: rewrite history, only with Audrey's explicit yes

| Item | Where (file / commit refs, no values) | Risk | Options | Recommended |
|---|---|---|---|---|
| Likely-real key #1 | `docs/PR_REVIEW_REQUEST_AUTOMATION.md:171` (9918a102d, 12673ed03, 32f40f05d) and the old root copy (dab14bbca) | High | R, S, W | **R** (Audrey is rotating), then L |
| Likely-real key #2 | `docs/archive/RESPONSE_TO_MIDNGHTSAPPHIRE.md:220` (12673ed03, 32f40f05d), with older copies in b1ad86cad and dab14bbca | High | R, S, W | **R** (Audrey is rotating), then L |
| Personal commit emails | about 118 commits with a personal gmail address, plus freedomangel.org, midnghtsapphire.com, revvel.ai, revvel.dev and yahoo.com | Medium (spam, doxxing) | L; use the noreply address from now on (git `user.email`, GitHub "block pushes that expose my email") | **L**, and switch to noreply going forward |
| `.session.db` (root; first added in c2c77bca4) | still on main | Medium (unknown contents) | S (move into `private/` and seal), L, W | **S**, after Audrey inspects it |
| `resumes/` | on main | Medium (PII) | S, L, W | **S** |
| `docs/case-files/` (public-records PDFs) | on main | High (legal/PII) | S, L, W | **S**; W only if Audrey says yes |
| PDFs (54 in history) and ledgers (425 `.jsonl` / 40 `.csv`; `wr/memory/`, `logs/failure-ledger/`, `config/error-ledger.json`) | on main and in history | Low to medium | S, L | **S** for client, financial and personal ledgers; **L** for the public standards ledger |
| `tokens.json`, `state.json`, `products/` (paid vault PDF) | on main | Medium (paid IP) | S, L | **S** for `products/` paid artifacts |
| Doppler-style test tokens (`*/doppler-mcp/tests/test_server.py`; 76e96c3ae, abd2da65e) | tests | Low | confirm they are fake, then L | **L** after confirming |
| `.secrets.baseline` (141 hits) | hashes only | None | L | **L** |

**Unpublished books stay off the public repos entirely.** Keep them in private repos (`tartaria-tablets`, `Soul-Files`, `Epstein` are already private) or in `private/` sealed with halo-seal. Never commit plaintext manuscripts to a public repo; halo-guard enforces this.

## 2. Sealing rollout (halo-seal + halo-guard + wingit-runner)

**Layout per repo:**
- `private/<name>/` is gitignored.
- The committed form is `sealed/<name>.tar.age`, built as a reproducible tar and encrypted with `age -R .halo/recipients.txt`.
- The `halo-guard` pre-commit/pre-push hook (`core.hooksPath=.halo/hooks`) blocks any `private/**` path, any non-age `sealed/*` file, and any gitleaks hit.
- `wingit-runner` (cron, Commit Status API, context `wingit/ci`) re-runs the guard so that skipping the hook with `--no-verify` is still caught. No GitHub Actions are needed.

**Key setup:**
- Audrey generates the age key herself and keeps 2 offline backups. **A lost key means lost data.**
- Seal from a copy. The plaintext originals already in history stay where they are; nothing is deleted.

**Suggested order** (most sensitive and most active first; do each repo the next time it is touched):
1. `revvel-standards`: `docs/case-files/`, `resumes/`, `.session.db`, `wr/memory/` (client/financial parts), `products/` paid artifacts, `tokens.json`.
2. `revvel-email-organizer`: `.env.production` and `.env.test` (a **live Stripe secret key** was found; rotate first).
3. `mindmappr-setup`: `configs/openclaw.env` and the secrets section of `MASTER_DOCUMENT.md` (**2 GitHub fine-grained PATs** were found; revoke first).
4. `reese-reviews`: `.env`, `src/components/business/TaxFormViewer.tsx` (25 hits; check for tax/PII data), `scripts/configure-dns.py`.
5. `forensicfinders`, `revvel-forensic-studio`, `guardaio`, `mindmappr`.
6. The Lovable/Supabase app repos with committed `.env` files (see §4). Their keys are anon keys, which are public by design, so these are low priority: add a `.gitignore` entry and the guard.
7. All other repos as they become active.

**What can break:**
- Builds that read files now under `private/` need `halo-unseal` locally or in the deploy step.
- Pages sites that serve sealed folders stop serving them.
- Bot configs that read those paths need updating.
- Merge conflicts on `.tar.age` blobs.
- Repo size grows with each re-seal.

**Rollback:** run `halo-unseal`, restore the plaintext into a *private* location, and revert the sealing PR. All of this is append-only, with no history rewrite.

## 3. Optional: private masters in freedom-angel-corp as backup

- Optionally, `git clone --mirror` each repo and push it to a **private** repo in `Freedom-Angel-Corp` (free plan; private repos are allowed). This keeps full history, unencrypted, so Audrey can always open everything.
- Name clashes already exist in the org: `revvel-standards` (PUBLIC there), `playlist-doggaze`, `playlist-atlas`. Use a suffix such as `-master`.
- Do this only with Audrey's approval. **No transfers and no visibility changes.**
- Refresh with a periodic `git push --mirror` (cron on the box; no Actions).
- Mirror the masters to GitLab/Gitee only as **private** projects. Public mirrors carry only what is public on GitHub, with sealed folders included as ciphertext. `glab` is not installed yet.

## 4. Per-repo audit findings (read-only gitleaks, 2026-10-30)

**Scope:**
- `revvel-standards` plus all **157 other public non-fork** repos (158 of 199 public; the 41 forks were skipped).
- Blobs over 2 MB were not scanned (over 5 MB for revvel-standards).
- **Pending:** the 123 private repos and the 41 forks.
- **No values printed.** JWTs were classified by their `role` claim only.

**Needs action (high):**
- `revvel-email-organizer`: Stripe **sk_live** and sk_test keys in `.env.production` and `.env.test` (c8fef76b3). Rotate in Stripe.
- `mindmappr-setup`: 2 GitHub fine-grained PATs plus generic keys in `configs/openclaw.env`, `MASTER_DOCUMENT.md`, and `job-queue/mindmappr-queue.sh` (3ab1b4b2b). Revoke them.
- `revvel-standards`: the 2 likely-real keys in §1 (Audrey is rotating them).
- `reese-reviews`: 31 hits.
  - `src/components/business/TaxFormViewer.tsx` x25 (68ff8ae1e, 7dccb4428)
  - `.env` (21fbdf411, 9984af9ef)
  - `scripts/configure-dns.py` (00e6c8eca)
  - `.do/app.yaml` (e140343ee)
  - `docs/BRANCH_PROTECTION.md` (7609f4265)
  - Needs manual review.
- `mindmappr`: a JWT in `server.mjs` / `server.mjs.bak` (847817e14, b9dbf1679) with an unknown role. Review it; if it is a service key, rotate it.

**Review (medium):**
- `forensicfinders` (2: `fetch.py`, `src/lib/auth/preview.ts`)
- `guardaio` (curl auth headers in docs; anon JWT)
- `revvel-forensic-studio` (3, `api/README.md`)
- `oath-gate-connect` (`DEPLOYMENT_SUMMARY.md`)
- `revvel-music-studio`, `the-alt-text`, `thealttext`, `thealttext-frontend` (curl auth headers in docs, probably examples)
- `project-face` (`API.md`)

**Low (Supabase anon keys, public by design; .env committed):**
- carbon-champions, ceremony-spark-toolkit, cozy-haven-hub, drive-easy-insure, exact-match-display, food-freedom-ai, instant-ordain-certificate-pro, lifeos-hub, longevity-insights, neighborly-services, neurooz (14), nomad-navigator, radiant-recommends-app, rentiverse-finds-it-all, rentiverse-finds-it-all-30, secret-sip-feed, skill-builder-mobile, skin-ai-advisor, soil-soul-map, talent-ladder, trusty-agents, wedlock-wizard-mobile.
- `.env.example` placeholders: ai-benchmarking-standalone, data-router-standalone, project-face-standalone, thealttext-standalone.

**Clean (0 findings):** the other 118 public repos, including all `MCP-*` repos, Meetaudreyevans, sessiono, premolt, in-the-wild-auto-website, and survivor-soul-songs.

## 5. Approvals needed from Audrey

1. Rotate or revoke: the revvel-standards keys (in progress), the Stripe live key, the 2 GitHub PATs, and anything confirmed in reese-reviews or mindmappr.
2. Generate the age key and confirm the sealing order.
3. Optional: create freedom-angel-corp private masters.
4. Any history rewrite (W): **not planned**, only on her explicit yes.
