# CircleCI Pipeline

This directory contains the CircleCI gate for this repository.

## Current workflow

- **Workflow(s):** `pr-workflow`, `main-workflow`
- **Jobs:** `lint-and-test`, `policy-check`
- **Purpose:**
  - `lint-and-test`: run the real quality gate (`markdownlint` on changed Markdown + `npm test`)
  - `policy-check`: enforce RVS-AGENT-001 archival policy (no silent deletions; REVVEL-DISABLED blocks must have all required metadata fields)

## Directory structure

```text
.circleci/
├── config.yml
└── scripts/
    ├── check-archival-policy.sh
    ├── lint-changed-markdown.sh
    └── run-tests.sh
```

## Local validation

From repository root:

```bash
bash .circleci/scripts/lint-changed-markdown.sh
bash .circleci/scripts/run-tests.sh
```

Or validate the full CircleCI config with CircleCI CLI:

```bash
circleci config validate -c .circleci/config.yml
```

## Notes

- Markdown linting is intentionally scoped to files changed from `origin/main`.
- If merge-base cannot be determined, lint exits non-zero to avoid false green runs.
- Tests are not swallowed; failures fail the job.

## Billing jobs (WR #18333)

Added 2026-11-11 by DBArchitect. Both run in `pr-workflow` and `main-workflow`.

- `billing-selfhost-lint`: checks `products/revenue-billing/self-host` (exact image pins, blank secrets, loopback-only ports, valid YAML), validates `plans.json`, checks the generated plan seed SQL is current, and runs the offline catalog seeder tests. No Docker daemon needed.
- `billing-sql-validate`: applies `products/revenue-billing/db` twice to a throwaway Postgres 15 container and runs the assertions in `db/tests/`.

Neither job needs a secret, deploys anything, or uses `setup_remote_docker`.

## Advisory Semgrep CE + Qlty jobs (WR #18490)

Added 2026-11-19 by TriageChief with Audrey's approval. Both run only in `pr-workflow`, in parallel with the other jobs, and **never fail the build**. Audrey decides if and when either becomes a gate.

- `semgrep-advisory`: Semgrep Community Edition with the public `p/default` ruleset, metrics off, no account or token. It runs with `--baseline-commit`, so only findings introduced by the PR are reported. Artifacts: `semgrep.txt`, `semgrep.sarif`, `semgrep.json`.
- `qlty-advisory`: Qlty CLI (free local mode, no Qlty Cloud) running `qlty check --upstream <base>` on changed files only. Config: `.qlty/qlty.toml` (shellcheck, ruff, actionlint, hadolint). Artifacts: `qlty.txt`, `qlty.sarif`.
- The PR base is the newest `daily/*` branch or `main`, whichever is closest to the PR head (`.circleci/scripts/advisory-base-ref.sh`). If no base is found, the jobs skip with a log line instead of scanning the whole repo.
- Semgrep is pinned to `1.186.0` and Qlty to `0.671.0`; bump them on purpose.
- Run by hand from the repo root: `bash .circleci/scripts/semgrep-advisory.sh` (needs `semgrep` on PATH) or `bash .circleci/scripts/qlty-advisory.sh`.
