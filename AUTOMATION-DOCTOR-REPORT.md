# Automation Doctor Report

Generated: 2026-05-08T02:46:07.378Z

## Workflow Validation

- Valid workflows: 106
- Invalid workflows: 10
- Jobs missing timeout: 0

### Invalid Workflows

- `agent-monitor.yml`: Implicit map keys need to be followed by map values at line 121, column 1:


**Time:** ${{ github.event.repository.updated_at }}
^^^^^^^^^

- `api-rate-limit-handler.yml`: Implicit map keys need to be followed by map values at line 47, column 1:


**Failed Workflow:** ${{ inputs.failed_workflow }}
^^^^^^^^

- `jules-coding-agent.yml`: Map keys must be unique at line 60, column 5:

        id: jules
    env:
    ^

- `perplexity-research-agent.yml`: Map keys must be unique at line 44, column 5:

        id: research
    env:
    ^

- `priority-router.yml`: Map keys must be unique at line 46, column 5:

        uses: actions/github-script@v8
    env:
    ^

- `self-healing.yml`: Implicit map keys need to be followed by map values at line 155, column 1:


**Time:** $(date)
^^^^^^^^^

- `ship-quality.yml`: Nested mappings are not allowed in compact mappings at line 17, column 14:

    runs-on: ubuntu-latest
             ^

- `ship-to-market.yml`: Nested mappings are not allowed in compact mappings at line 28, column 14:

    runs-on: ubuntu-latest
             ^

- `stuck-check-watchdog.yml`: Nested mappings are not allowed in compact mappings at line 29, column 14:

    runs-on: ubuntu-latest
             ^

- `sync-secrets-to-repos.yml`: All mapping items must start at the same column at line 49, column 1:

          GH_TOKEN: ${{ secrets.GH_PAT }}
        run: |
^


## Labels Check

- Present: 0
- Missing: 0
