# Automation Doctor Report

Generated: 2026-05-07T20:05:27.344Z

## Workflow Validation

- Valid workflows: 103
- Invalid workflows: 13
- Jobs missing timeout: 0

### Invalid Workflows

- `agent-dispatcher.yml`: Nested mappings are not allowed in compact mappings at line 35, column 14:

    runs-on: ubuntu-latest
             ^

- `agent-monitor.yml`: Implicit map keys need to be followed by map values at line 121, column 1:


**Time:** ${{ github.event.repository.updated_at }}
^^^^^^^^^

- `api-rate-limit-handler.yml`: Implicit map keys need to be followed by map values at line 47, column 1:


**Failed Workflow:** ${{ inputs.failed_workflow }}
^^^^^^^^

- `commit-queue-monitor.yml`: Nested mappings are not allowed in compact mappings at line 17, column 14:

    runs-on: ubuntu-latest
             ^

- `issue-state-machine.yml`: Nested mappings are not allowed in compact mappings at line 34, column 14:

    runs-on: ubuntu-latest
             ^

- `jules-coding-agent.yml`: Nested mappings are not allowed in compact mappings at line 32, column 14:

    runs-on: ubuntu-latest
             ^

- `perplexity-research-agent.yml`: Nested mappings are not allowed in compact mappings at line 30, column 14:

    runs-on: ubuntu-latest
             ^

- `pr-lifecycle.yml`: Nested mappings are not allowed in compact mappings at line 34, column 14:

    runs-on: ubuntu-latest
             ^

- `priority-router.yml`: Nested mappings are not allowed in compact mappings at line 40, column 14:

    runs-on: ubuntu-latest
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


## Labels Check

- Present: 0
- Missing: 0
