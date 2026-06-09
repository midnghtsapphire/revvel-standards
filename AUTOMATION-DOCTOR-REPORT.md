# Automation Doctor Report

Generated: 2026-06-09T13:59:08.741Z

## Workflow Validation

- Valid workflows: 146
- Invalid workflows: 5
- Jobs missing timeout: 7

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


### Jobs Missing timeout-minutes

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
