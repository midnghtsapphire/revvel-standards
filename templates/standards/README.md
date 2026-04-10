# Standards Templates

Copy this entire `standards/` folder into the root of every new app repo. Fill in all `[PLACEHOLDER]` values before the first coding session.

---

## Files in This Directory

| File | Purpose | Copy To |
|---|---|---|
| `01_SYSTEM_STATE.md` | Current system status — what is actually working in production | `SYSTEM_STATE.md` (repo root) |
| `02_MVI_CONTRACT_TEMPLATE.md` | Blank MVI Contract — fill in at the start of every coding session | Use as session notes, not committed to repo |
| `03_CONTEXT_PRIMER.md` | Tech stack and architecture reference for new agents | `CONTEXT_PRIMER.md` (repo root) |

---

## Usage

```bash
# From your new app repo root:
cp -r path/to/revvel-standards/templates/standards/* .

# Then fill in all [PLACEHOLDER] values in SYSTEM_STATE.md and CONTEXT_PRIMER.md
# before your first coding session.
```

---

## Workflow

1. **On repo creation:** Copy all three files and fill in placeholders
2. **Before each session:** Read `SYSTEM_STATE.md` fully; copy and fill `02_MVI_CONTRACT_TEMPLATE.md`
3. **After each session:** Update `SYSTEM_STATE.md` with session results
4. **When onboarding a new agent:** Hand off `SYSTEM_STATE.md` + `CONTEXT_PRIMER.md` as the first two reads

See `standards/SYSTEM_STATE_STANDARD.md` and `standards/MVI_CONTRACT_STANDARD.md` in `revvel-standards` for the full rules.
