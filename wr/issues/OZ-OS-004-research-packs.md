# WR: Research Packs Structure + 3 Seed Packs

**WR ID:** OZ-OS-004
**Parent:** OZ-OS-001
**Type:** feature
**Status:** 🟢 Ready
**Tracks:** OZ-OS-001

## Deliverable
Create `oz-os/research-packs/` with three seed packs:

```
research-packs/
├── github-actions/
│   ├── README.md
│   └── methods/
│       └── workflow-debugging.md
├── riverine-search/
│   ├── README.md
│   └── methods/
│       └── hydrology-baseline.md
└── mcp/
    ├── README.md
    └── methods/
        └── protocol-integration.md
```

Each pack README must contain:
- Topic summary
- At least 1 method reference (linked to `method-packs/`)
- Search terms used during research
- Derived search terms discovered
- Sources consulted

## Key Constraint
Each pack has a README + at least 1 method reference. No empty packs.

## Acceptance
- 3 directories under `research-packs/`
- Each directory has a `README.md` and at least one method file
- No raw tokens or bracket-placeholders
- Each README cites at least one real source
