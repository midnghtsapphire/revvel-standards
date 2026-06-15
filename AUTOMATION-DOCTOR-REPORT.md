# Automation Doctor Report

Generated: 2026-06-14T18:42:39.065Z

## Workflow Validation

- Valid workflows: 150
- Invalid workflows: 3
- Jobs missing timeout: 8

### Invalid Workflows

- `api-rate-limit-handler.yml`: Map keys must be unique at line 7, column 1:

  contents: read
on:
^

- `flow-chart-sync.yml`: Map keys must be unique at line 3, column 13:

permissions:
            ^

- `noimosai.yml`: Map keys must be unique at line 3, column 13:

permissions:
            ^


### Jobs Missing timeout-minutes

- `ci-error-prevention.yml`: error-prevention-tests, lint-workflows, token-security-check, wr-lint-check, automation-health, summary
- `daily-news-briefing.yml`: news
- `fix-wr-gate.yml`: gate
- `news-with-cache.yml`: fetch
- `no-root-junk.yml`: no-root-junk
- `octopus-route.yml`: route-single, backfill
- `verify-security-fix.yml`: verify
- `wr-lint.yml`: lint

## Labels Check

- Present: 12
- Missing: 0
