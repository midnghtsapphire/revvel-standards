# Automation Doctor Report

Generated: 2026-06-10T10:32:26.331Z

## Workflow Validation

- Valid workflows: 142
- Invalid workflows: 9
- Jobs missing timeout: 6

### Invalid Workflows

- `api-rate-limit-handler.yml`: Map keys must be unique at line 7, column 1:

  contents: read
on:
^

- `bito-ai.yml`: Implicit keys need to be on a single line at line 134, column 1:

          if [ -z "${GIT_ACCESS_TOKEN}" ]; then
echo "MISSING_SECRETS=${MISSING[*]}" >> "$GITHUB_ENV"
^

- `budget-aware-agent.yml`: Map keys must be unique at line 103, column 3:

    runs-on: ubuntu-latest
  execute-task:
  ^

- `flow-chart-sync.yml`: Map keys must be unique at line 3, column 13:

permissions:
            ^

- `noimosai.yml`: Map keys must be unique at line 3, column 13:

permissions:
            ^

- `self-healing.yml`: Map keys must be unique at line 14, column 21:

  workflow_dispatch:
                    ^

- `ship-status-audit.yml`: All mapping items must start at the same column at line 9, column 1:

    - cron: 0 0 * * 1
  workflow_dispatch:
^

- `verify-security-fix.yml`: Map keys must be unique at line 8, column 3:


  pull_request:
  ^

- `vine-to-marketplace.yml`: Map keys must be unique at line 27, column 7:

          - post-dry-run
      date_since:
      ^


### Jobs Missing timeout-minutes

- `daily-news-briefing.yml`: news
- `fix-wr-gate.yml`: gate
- `news-with-cache.yml`: fetch
- `no-root-junk.yml`: no-root-junk
- `octopus-route.yml`: route-single, backfill
- `wr-lint.yml`: lint

## Labels Check

- Present: 12
- Missing: 0
