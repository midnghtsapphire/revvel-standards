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
