# Research Preemptive Input Packs

These templates are the **one-iteration enablers** for design / merchandise /
asset-artifact WRs. The research engine MUST consult each pack when scoping
a WR whose Output Type involves visual or branded artifacts so that the
human owner does not have to add region/palette/prompt guidance mid-PR.

> Cross-refs:
> `docs/RESEARCH_ENGINE_STANDARD.md` (Master Checklist now requires these) ·
> `docs/REVVEL_MASTER_STANDARDS.md` (EXRUP one-iteration delivery) ·
> Originating case: PR [#14085](https://github.com/midnghtsapphire/revvel-standards/pull/14085) — owner had to drop in Knoxville motifs, UT color palettes, and image-prompt packs as PR comments because the research lane omitted them.

## When to use these packs

| WR Output Type | Apply packs? | Which ones |
| --- | --- | --- |
| `merchandise`, `logo`, `branded-asset`, `apparel`, `sticker-pack`, `print-collateral` | **Required** | All three |
| `web`, `mobile`, `api` with a brand-identity scope | **Required if regional/local audience** | Regional + Palette |
| `pdf`, `sellable-pdf` with cover design | **Required** | Palette + Prompt-pack |
| `research`, `cli`, anything non-visual | Skip | — |

The research orchestrator decides via the WR's Output Type field. When in
doubt — include them; redundant context is cheaper than a second iteration.

## The three packs

| File | What it forces the research lane to produce |
| --- | --- |
| [`regional-cultural-motif-template.md`](./regional-cultural-motif-template.md) | A ranked motif shortlist for the WR's target region, with a licensing-risk + cultural-fit gate, derived from the actual local landmarks / traditions / colors. |
| [`color-palette-template.md`](./color-palette-template.md) | At least three candidate palettes (official, traditional accent, natural-environment), each with hex codes + the story that justifies them. |
| [`prompt-pack-template.md`](./prompt-pack-template.md) | Reusable image-generation prompts (multi-palette concept grids, hero composition, alt compositions) parameterized for the WR's subject so the artifact step doesn't start from scratch. |

## Master output contract (what every pack delivers)

For each pack the research lane MUST return:

1. **Inputs section** — what local research surfaced (landmarks, traditions, traditions, palette anchors, prompt skeletons).
2. **Gate section** — a small table with Visual Value / Licensing Risk / Cultural Fit / Keep-or-Drop per candidate.
3. **Safe-use outputs** — the licensed/cleared subset, ready to hand to the asset-artifact step.
4. **Citations** — at least one source per claim (Wikipedia, official org pages, licensing portals).

A pack that returns inputs without the gate or without safe-use outputs is
incomplete — escalate as `research:blocked` per
`docs/RESEARCH_ENGINE_STANDARD.md` §"Missing Secret Behavior" pattern.

## How packs feed the EXRUP one-iteration loop

```text
WR opens
   │
   ▼
Research orchestrator inspects Output Type
   │
   ├── visual / branded? → load all three packs
   │       │
   │       ▼
   │   For each pack: research lane fills template,
   │                  applies gate, outputs safe-use subset
   │       │
   │       ▼
   │   Pack outputs glued into the WR doc and into
   │   the asset-artifact step's input bundle
   │
   ▼
Implementer ships in one pass — no comment-driven retro-research.
```

That's what "one iteration" means for design-touching WRs.
