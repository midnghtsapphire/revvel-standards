# WR: Update MASTER.md Pipeline Steps 5.5–5.8

**WR ID:** OZ-OS-011
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001

## Deliverable
Modify `revvel-standards/MASTER.md` to add the intelligence layer pipeline between
existing steps (5) CLEAN OUTPUT and (6) Jules normalize.

## New Pipeline Steps

```
(5)   CLEAN OUTPUT
        ↓
(5.5) METHOD HUNTER → method-pack.md
        ↓
(5.6) CONTRARIAN → contrarian-pack.md
        ↓
(5.7) ADJACENT DOMAIN → adjacent-pack.md
        ↓
(5.8) SYNTHESIS (rejects methods with contrarian_confidence > 0.7 unless justified)
        ↓
(6)   Jules normalize
```

## Integration Rules
- Steps 5.5–5.8 are OPTIONAL per WR — not every WR needs research divergence
- When triggered, all four steps must complete before step 6
- Each step produces a file in `research-packs/<topic>/`
- The synthesis step consumes all three packs and produces `synthesis.md`
- If any step returns NULL_RESULT, it is documented but does not block the pipeline

## Scope
This WR modifies ONLY `MASTER.md`. The agent specs (method-hunter, contrarian,
adjacent-domain, synthesizer) are delivered by OZ-OS-005a through OZ-OS-005d.

## Acceptance
- MASTER.md contains steps 5.5, 5.6, 5.7, 5.8 in the correct position
- Existing steps are not renumbered (only insert between 5 and 6)
- No raw tokens or bracket-placeholders
- Pipeline diagram is clear and renders in GitHub markdown
