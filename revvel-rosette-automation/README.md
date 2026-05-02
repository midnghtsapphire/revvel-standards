# revvel-rosette-automation (test harness)

This folder is a **test harness scaffold** for a future standalone repository
named `revvel-rosette-automation`.

In the short term, it lives inside `revvel-standards` so we can iterate on the
conventions, directory layout, and validation checks without needing to spin up
a separate repository.

## What this harness is for

- A place to collect and validate **automation project definitions** (YAML)
  before they become workflows/scripts.
- A stable place to drop **reference configs** and queue formats.
- A predictable directory structure that CI can validate.

## Directory layout

- `projects/` — project manifests (YAML)
- `configs/` — supporting config YAML
- `scripts/` — operational scripts (shell/python)
- `docs/` — operational notes / runbooks

## Validation

CI validation is intentionally lightweight: the repo test suite includes a
structure check to ensure the harness remains present and correctly shaped.
