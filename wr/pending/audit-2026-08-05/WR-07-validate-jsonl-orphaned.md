# [WR] P2 — scripts/validate_jsonl.py has zero references anywhere in the repo outside itself

**Priority:** P2
**Gate:** 3 (Workflow Reference Integrity), 7 (Deletion Archaeology)
**Status:** located — not fixed, needs a wire-in-or-archive decision

## Evidence

- `scripts/validate_jsonl.py` (139 lines) — a self-contained CLI: "Validate
  JSONL files: one valid JSON object per line. Usage: `python
  scripts/validate_jsonl.py <file.jsonl> [...]`. Exit codes: 0 all valid, 1
  one or more invalid."
- `grep -rn "validate_jsonl" --include="*.yml" --include="*.md"
  --include="*.py" --include="*.json" .` returns **zero** hits outside the
  file itself — no workflow, no doc, no other script mentions it.
- Exit-code-aware CLI design (0/1) is itself a signal this was built to be
  called from CI, same pattern as WR-03's `populate-state.js --check`.

## Root Cause

Unknown — this audit found no `.jsonl` files anywhere in the current repo
tree to validate (`find . -name "*.jsonl"` returns nothing), which suggests
either (a) the JSONL-producing feature this validator was meant to guard
was removed/never shipped and this is a leftover, or (b) JSONL files are
generated only transiently inside a CI run (and thus wouldn't show up in a
repo tree scan) and this validator genuinely needs wiring into whichever
workflow produces them. This audit could not distinguish (a) from (b) from
static analysis alone.

## Fix

Not applied — needs an owner decision:

- **Option A (wire in):** identify which workflow (if any) produces
  `.jsonl` output and add a `python scripts/validate_jsonl.py <file>` step
  right after it's generated.
- **Option B (archive):** if the JSONL-producing feature was already
  dropped, comment out `validate_jsonl.py` with a header noting who/when/why
  per the owner's standing archive-don't-delete preference.

No action taken in this PR pending that decision.

## Agent Learning Note

**Pattern:** an exit-code-aware validator CLI with no `.jsonl` files
anywhere in the tree it could validate is a strong signal the feature it
was built to guard doesn't currently exist in this repo — worth checking
"does the input this tool expects even get produced anywhere" as a cheap
first triage step before deciding wire-in vs. archive.
**Vaccine:** none proposed — this is a one-off investigation item for a
human/agent who knows the JSONL feature's history, not a systemic pattern
worth a CI gate.
