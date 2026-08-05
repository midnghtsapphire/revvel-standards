# WR: Bootstrap `oz-os` Repository Skeleton

**WR ID:** OZ-OS-002
**Parent:** OZ-OS-001
**Type:** scaffold
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001

## Deliverable (single PR)
Create new repo `midnghtsapphire/oz-os` with this exact tree:

```
oz-os/
├── MISSION.md                  (stub — filled by OZ-OS-010)
├── README.md
├── AUTONOMY_TIERS.md           (stub — filled by OZ-OS-008)
├── NULL_RESULT_SCHEMA.md       (stub — filled by OZ-OS-009)
├── agents/
│   └── .gitkeep
├── research-packs/
│   └── .gitkeep
├── method-packs/
│   └── .gitkeep
├── intel/
│   ├── SCHEMA.md               (stub — filled by OZ-OS-003)
│   └── .gitkeep
├── tool-intelligence/
│   ├── tools.md                (stub)
│   └── reference-systems.md    (stub)
└── .github/
    ├── ISSUE_TEMPLATE/work_request.yml   (copy from revvel-standards)
    └── workflows/
        ├── wr-lint.yml                   (copy from revvel-standards)
        └── fix-wr-gate.yml               (copy from revvel-standards)
```

## Anti-Goal
Do NOT copy `WR_TEMPLATE_FULL.md`. Use `WR_TEMPLATE_BASIC.md` only.

## Acceptance
- Repo exists at `midnghtsapphire/oz-os`
- All directories present with `.gitkeep`
- wr-lint runs green on README.md
- No file contains raw tokens or bracket-placeholders
