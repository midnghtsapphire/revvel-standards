# Local secret scan (brain-dump #6)

Own Python + bash hooks. **No marketplace GitHub Actions.**

## What it does

- `scripts/secret_scan.py` — scans files for common API key / token shapes; **prints masked findings only**; exits `1` on hit (blocks commit).
- `scripts/mask_secrets.py` — redact credential-like strings for safe local logs.
- `.pre-commit-hooks/secret-scan.sh` — pre-commit entrypoint over staged files.

## Install

```bash
pre-commit install
# or run once:
bash .pre-commit-hooks/secret-scan.sh path/to/file
```

## Rules (high level)

AWS `AKIA…`, GitHub `gh*` / `github_pat_`, Slack `xox*`, Stripe `sk_`/`rk_`, Google `AIza…`, PEM private key headers, and `password|secret|api_key=…` assignments.

Allowlists: `*.env.example` / template / sample, `.secrets.baseline`, lockfiles, and values containing clear fixture markers (`EXAMPLE`, `CHANGEME`, `placeholder`, …).

## Not in scope

- No GitHub-hosted Actions workflows added here (Audrey: personal workflows only).
- Does not write `.env` files into this repo.
- Does not flip repo visibility.

Blocks brain-dump #5 (API router). Related #3 governance playbook.
