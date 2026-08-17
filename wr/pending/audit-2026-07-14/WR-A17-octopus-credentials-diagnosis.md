# [WR] Octopus + Fleet Credentials/Installs Diagnosis — Instructional
**For issues #16099 (diagnosis + fix-all, one WR / multiple PRs) and #16100 (security observations → healing solutions)**
**Method:** static sweep of all 200+ workflows on live main, 2026-07-14. Reproduce via §6.

## Root problem in one line
Agents look "broken" because **32 workflows silently skip when their secret is missing**, several **install their CLI fresh at runtime**, and **quota/credential/install failures all look identical** in triage.

## §1 Octopus chain (#16099)
**OWNER FACT: Octopus is PAID (4 tokens) — quota-death is NOT the expected failure.** Suspect order:
1. `OCTOPUS_TOKEN` repo secret unset → octopus-cli.yml bails SILENTLY ("skipping Octopus CLI invocation", exits green). Verify: Settings → Secrets → Actions.
2. Token stale after plan change → 401 on `octopus login`.
3. `@octp/cli` runtime `npm install -g` failure misread as Octopus-down.

| Layer | Finding | Healing PR |
|---|---|---|
| octopus-cli.yml | silent bail on missing token | **PR-1**: bail → `credentials-missing` label + one deduped [SELF-HEAL] issue naming the secret |
| octopus-cli.yml | unpinned runtime CLI install | **PR-2**: pin + cache; `install-failure` label distinct from credential failure |
| octopus-review-fallback.yml | built for monthly quota-death; owner is paid | **PR-3**: health check validates PAID token liveness (login probe), posts token status — not just quota forecasting |
| octopus-route.yml | healthy translator — keep | — |

## §2 Fleet-wide (#16100)
1. **32 silent-bail workflows** (jules-*, devin-code-review, bito-ai, dragnet-team-assignment, amplitude, doppler-sync, deploy-oaudrey, mabl, recurse-ml, vine-to-marketplace, secret-lifecycle, secret-persistence-guard, proof-of-life, research-module, pr-auto-review, project-board-sync, …). **PR-4**: shared `check-secret` reusable workflow — missing credential = routable labeled event, never a no-op; roll out one workflow per commit.
2. **Doppler deprecated (WR-4460) yet wired in 11 workflows, 5 secret names, ~70 refs** — latent invalid-credential failures. **PR-5**: migrate per credential-gatekeeper backup order (learnings 2026-05-18).
3. **GitHub App auth (APP_ID/APP_PRIVATE_KEY) in 6 workflows** — the literal invalid-install class. **PR-6a**: monthly proof-of-life token mint; failure → `credentials-missing` naming the App.
4. **ADMIN_GITHUB_TOKEN referenced 247×** — one PAT is the fleet's oxygen (today's rate-limit event was the preview). **PR-6b**: expiry tracking in wr/memory/secret-rotations.md + 14-day warning issue via secret-lifecycle.yml.
5. **Unpinned runtime installs in 8+ workflows** (eas-cli@latest, bubblewrap, lighthouse, linkchecker…). **PR-7**: pin + cache + `install-failure` labeling.
6. **scripts/secrets-map.js + docs/SECRETS_MAP.md exist but unscheduled.** **PR-8**: weekly `secrets:map:check` cron; drift → auto-issue.

## §3 Acceptance
Missing any secret → exactly one labeled deduped issue naming it; zero silent skips; Octopus health check proves paid-token liveness; secrets-map drift auto-files; no unpinned @latest installs.

## §4 Agent learning note
Silent bail converts a 30-second fix (paste a secret) into days of "why is X broken" archaeology. **A missing credential is a routable event with the secret's exact name.** Quota, credential, and install failures are three diseases — label them differently or triage treats them as one. A PAID service that looks quota-dead has a credential problem, not a quota problem.

## §5 Cursor protection (owner directive)
Cursor connections are in ACTIVE USE — do not re-retire during these PRs (see WR-A16).

## §6 Reproduce (3 commands)
```bash
grep -rhoE "secrets\.[A-Z_]+" .github/workflows/*.yml | sort | uniq -c | sort -rn
grep -rlE "if \[ -z .\$\{?[A-Z_]*(TOKEN|KEY|SECRET)" .github/workflows/*.yml
grep -rnE "npm install -g|pip install" .github/workflows/*.yml | grep -v "npm ci"
```

Assignee: Dragnet + Octopus | Labels: P1, credentials, security, instructional, issue-16099, issue-16100
