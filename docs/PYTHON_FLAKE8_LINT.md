# Python flake8 Lint (CI)

**WR:** #15858  
**Workflow:** [`.github/workflows/python-flake8.yml`](../.github/workflows/python-flake8.yml)  
**Action:** `py-actions/flake8@v2.3.0` (SHA-pinned)  
**Config:** [`.flake8`](../.flake8)  
**Gate:** [`scripts/flake8-baseline-gate.js`](../scripts/flake8-baseline-gate.js)  
**Baseline:** [`config/flake8-baseline.txt`](../config/flake8-baseline.txt)

## What this does

On every pull request and push to `main` that touches Python (or the lint
config), GitHub Actions:

1. Checks out the tree.
2. Runs **Python flake8 Lint** via `py-actions/flake8@v2.3.0` with
   `select=E,W,F`, max line length 120, max complexity 15, across the whole
   repo (tests, scripts, tools, and products included — only cache/vendor
   dirs are excluded).
3. Runs the **baseline ratchet gate**. The job **fails** when any
   `path::CODE` count is higher than the committed baseline.
4. Runs the workflow regression tests.

## Why a baseline (and not "fix everything" or "always red")

- The WR definition of done requires flake8 to **fail CI when violations are
  detected**.
- The same WR **explicitly excludes** fixing pre-existing flake8 debt in this
  change.
- [`standards/GREEN_MAIN_STANDARD.md`](../standards/GREEN_MAIN_STANDARD.md)
  forbids leaving `main` permanently red.

So we record today's debt in `config/flake8-baseline.txt` and only fail on
**new** debt. Cleaning up existing findings is always welcome and is done by
lowering the baseline counts in the same PR that fixes the code.

## Developer workflow

### Local check (same gate as CI)

```bash
# Optional: install flake8 once
python3 -m pip install --user flake8==7.1.1

# Full flake8 report (may list known baseline debt)
python3 -m flake8

# The real CI gate — exit 0 means "no new debt"
node scripts/flake8-baseline-gate.js
```

### If CI fails on your PR

1. Open the **Python flake8 Lint** job log.
2. Read the `path::CODE` lines under `flake8 baseline gate FAILED`.
3. Fix those **new** findings in your changed Python files.
4. Re-run locally: `node scripts/flake8-baseline-gate.js`.
5. Do **not** raise counts in `config/flake8-baseline.txt` to silence the gate.

### If you intentionally clean old debt

1. Fix the Python files.
2. Regenerate the baseline (counts must only go down):

   ```bash
   node scripts/flake8-baseline-gate.js --print-baseline > config/flake8-baseline.txt
   ```

3. Include both the code fixes and the lower baseline in the same PR.
4. Confirm `node scripts/flake8-baseline-gate.js` exits 0.

## Configuration knobs

| Knob | Location | Current value |
| --- | --- | --- |
| Error families | `.flake8` `select` | `E,W,F` |
| Line length | `.flake8` / action `max-line-length` | `120` |
| Complexity | `.flake8` / action `args` | `15` |
| Path excludes | `.flake8` + action `exclude` | cache/vendor only |
| Action pin | workflow `uses:` | `py-actions/flake8@84ec672…` (`v2.3.0`) |

## Deploy / integration path

This is a CI quality gate, not a Vercel app:

- **Trigger path:** PR/push path filters on `**/*.py` and lint config files, plus
  `workflow_dispatch`.
- **Merge path:** job `flake8` must be green for Python-touching PRs once the
  check is required (or when present on the PR).
- **Manual run:** Actions → **Python flake8 Lint** → Run workflow.

## Tests

```bash
node --test tests/python-flake8-workflow.test.js
```
