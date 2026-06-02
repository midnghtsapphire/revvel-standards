# Automation Doctor Report

Generated: 2026-06-02T06:19:42.394Z

## Workflow Validation

- Valid workflows: 147
- Invalid workflows: 2
- Jobs missing timeout: 5

### Invalid Workflows

- `jules-pr-reviewer.yml`: Unexpected scalar at node end at line 75, column 17:

state: 'failure',
                ^

- `octopus-cli.yml`: Map keys must be unique at line 66, column 3:

            echo "skip=false" >> "$GITHUB_OUTPUT"
  invoke:
  ^


### Jobs Missing timeout-minutes

- `fix-wr-gate.yml`: gate
- `no-root-junk.yml`: no-root-junk
- `octopus-route.yml`: route-single, backfill
- `verify-security-fix.yml`: verify
- `wr-lint.yml`: lint

## Labels Check

- Present: 12
- Missing: 0
