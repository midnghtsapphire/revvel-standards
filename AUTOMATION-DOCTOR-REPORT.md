# Automation Doctor Report

Generated: 2026-08-08T04:07:20.507Z

## Workflow Validation

- Valid workflows: 204
- Invalid workflows: 1
- Jobs missing timeout: 7

### Invalid Workflows

- `apisec-scan.yml`: Map keys must be unique at line 48, column 5:

          sarif_file: ./apisec-results.sarif
    steps:
    ^


### Jobs Missing timeout-minutes

- `gumroad-covers.yml`: generate-and-attach
- `neon-branch.yml`: setup, create_neon_branch, delete_neon_branch
- `neuralegion.yml`: archived
- `ossar.yml`: OSSAR-Scan
- `prioritize-stars.yml`: prioritize
- `synopsys-action.yml`: build
- `ui-audit-logger.yml`: ui-audit-and-health

## Labels Check

- Present: 0
- Missing: 0
