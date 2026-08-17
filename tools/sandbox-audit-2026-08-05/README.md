# Sandbox audit tools — 2026-08-05

Saved per the owner's explicit instruction to preserve all sandbox work
inside the repo itself so nothing is lost. These are the actual analysis
scripts used to produce the findings in
[`wr/pending/audit-2026-08-05/`](../../wr/pending/audit-2026-08-05/), turned
from one-off shell commands into small reusable Node scripts, plus their raw
output captured at audit time.

None of these are wired into CI by this PR — they're audit tooling, meant
to be run on demand by a human or agent doing the next repo sweep (or wired
in later as a follow-up, per the "vaccine" notes in each WR file).

| Script | What it finds | Used for |
|---|---|---|
| [`find-orphaned-scripts.js`](./find-orphaned-scripts.js) | Files under `scripts/` referenced nowhere else in the repo (no workflow, doc, or other script mentions them) | WR-06, WR-07 |
| [`find-unwired-promises.js`](./find-unwired-promises.js) | `scripts/**` docstrings and `skills/**/SKILL.md` files that name a `.github/workflows/*.yml` or `tests/*.test.js` file that doesn't actually exist on disk | WR-01, WR-06 |
| [`find-duplicate-json-keys.js`](./find-duplicate-json-keys.js) | Duplicate top-level-object keys in any JSON file (invisible to `JSON.parse`, invisible to a quick read, but silently drops the earlier value) — proposed in WR-04 as a permanent CI vaccine | WR-04 |

## Raw output from this audit run

Captured in [`output-2026-08-05.json`](./output-2026-08-05.json) — the exact
findings each script produced when run against the commit this audit branch
is based on, so the evidence in the WR files can be independently
re-verified against a frozen snapshot rather than only against a
constantly-changing `main`.

## Usage

```bash
node tools/sandbox-audit-2026-08-05/find-orphaned-scripts.js
node tools/sandbox-audit-2026-08-05/find-unwired-promises.js
node tools/sandbox-audit-2026-08-05/find-duplicate-json-keys.js package.json
```

All three exit `0` always (report-only) — they print findings to stdout as
JSON. None of them make network calls or modify any files.
