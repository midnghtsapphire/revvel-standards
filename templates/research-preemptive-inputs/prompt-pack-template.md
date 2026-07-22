# Prompt Pack Template

When a visual artifact is the WR deliverable, the research lane must hand
the asset-artifact step a **ready-to-use prompt pack** — not a description
of what to generate. The Knoxville case in #14085 had the owner paste the
actual prompts they'd already iterated on (multi-palette concept grids,
batting-pose emblem variants); future WRs derive these unprompted from
the motif + palette templates and ship them as part of the research packet.

> Cross-ref: [`README.md`](./README.md), [`regional-cultural-motif-template.md`](./regional-cultural-motif-template.md), [`color-palette-template.md`](./color-palette-template.md).

## 1. Subject capture

| Field | Value |
| --- | --- |
| Artifact format | _e.g., 2x2 concept grid, hero composition, vector logo, sticker pack_ |
| Subject character / element | _e.g., banana mascot in baseball uniform_ |
| Composition setting | _e.g., Neyland Stadium with Tennessee River + Vol Navy boats_ |
| Output medium | _e.g., screen-printable apparel, RGB-first web logo, CMYK print collateral_ |

## 2. The prompt slots

A complete pack ships at least these four prompts. Each one references the
motif shortlist and a specific palette combo from the palette template.

### Slot 1 — Multi-palette concept grid

Use case: side-by-side palette comparison so the human picks fast.

```text
A vector graphic design showcase sheet featuring four variations of {SUBJECT},
organized in a clean 2x2 grid. The main composition is {COMPOSITION_DESCRIPTION},
referencing {MOTIF_1, MOTIF_2, MOTIF_3} (all KEEP-flagged in the motif gate).

Each of the four quadrants showcases a distinct color palette variation:
- Top-Left:    {PALETTE_A_DESCRIPTION}, hexes {PALETTE_A_HEXES}
- Top-Right:   {PALETTE_B_DESCRIPTION}, hexes {PALETTE_B_HEXES}
- Bottom-Left: {PALETTE_C_DESCRIPTION}, hexes {PALETTE_C_HEXES}
- Bottom-Right: {PALETTE_D_DESCRIPTION}, hexes {PALETTE_D_HEXES}

The entire layout is presented on a clean, single sheet of parchment paper
background for a professional design portfolio style. Clean lines, screen-printed
aesthetic, no overlapping frames. {ANY LICENSING-AWARE INSTRUCTIONS:
e.g., use stylized silhouettes, avoid trademarked marks}.
```

### Slot 2 — Hero composition (single, finished)

Use case: the "this is the answer" version once a palette has been picked.

```text
A vector graphic of {SUBJECT} in {COMPOSITION_DESCRIPTION}.

Color palette: {PICKED_PALETTE_NAME}, hexes {PICKED_PALETTE_HEXES}.

References (safe-use): {MOTIF_1 (silhouette only), MOTIF_2, MOTIF_3}.

Style: {clean vector / flat color / screen-print aesthetic}.
Composition: {centered emblem / banner across the middle / circular frame}.
Output: {transparent PNG at 4000x4000 + SVG}.

Do not include: {any trademarked marks, brand wordmarks, mascot likenesses
of licensed properties}.
```

### Slot 3 — Alternate composition (variant pose / framing)

Use case: gives the asset step a B-side for the same palette.

```text
{Same SUBJECT and PALETTE as slot 2, but the pose / framing is shifted to
ALT_COMPOSITION_DESCRIPTION}. Otherwise identical instructions.
```

### Slot 4 — Pattern / texture asset

Use case: backgrounds, packaging, web hero strips.

```text
A seamless tileable pattern derived from {KEEP-flagged PATTERN_MOTIF, e.g.,
orange-and-white checkerboard from §2 of the motif template}.

Colors: hexes {PALETTE_HEXES_FOR_PATTERN}.

Constraints: tileable, vector, no trademarked elements, contrast suitable
for both light and dark backgrounds.
```

## 3. Worked example (filled from #14085 inputs)

This is the kind of output the owner pasted manually — every future WR
should produce this from the templates automatically.

> **Slot 1 — Multi-palette grid for "Bananas / Vol Navy sailgating":**
>
> ```text
> A vector graphic design showcase sheet featuring four variations of a sports
> team logo, organized in a clean 2x2 grid. The main character is a cartoon
> banana mascot wearing a baseball cap and a striped jersey, happily steering
> a small vintage wooden boat labeled "VOL NAVY" with a checkerboard hull
> pattern. The boat is on the Tennessee River with a stylized Neyland
> Stadium, the Sunsphere, and a bridge in the background. A banner reads
> "Bananas" in bold cursive text, with a small Bluetick Coonhound (generic
> silhouette — no UT mascot likeness) wearing an orange bandana next to a
> baseball.
>
> Each of the four quadrants showcases a distinct color palette variation:
> - Top-Left:    High-contrast Tennessee orange (#FF8200) and white with a deep navy field.
> - Top-Right:   Cool Smokey charcoal grey (#58595B) and muted orange accents.
> - Bottom-Left: Deep river blues (#3D6B8C), smoky mountain purples (#6E5C7B), and soft sunset golds (#E5A23F).
> - Bottom-Right: Premium dark grey base with vibrant golden-orange text and highlights.
>
> The entire layout is presented on a clean, single sheet of parchment paper
> background for a professional design portfolio style. Clean lines,
> screen-printed aesthetic, no overlapping frames. Stylized silhouettes
> only — no UT trademarked marks (Power-T, Smokey likeness, etc.).
> ```text

The same template ships variants for batting-pose emblem, sticker-pack grid,
and so on — derived purely from the WR's motif + palette inputs.

## 4. Hand-off contract

Each slot's prompt MUST be:

1. **Self-contained** — runnable as-is in any image-gen model (no "see WR" references).
2. **Licensing-aware** — every trademarked motif from the gate is either filtered out or has a "stylized silhouette only" instruction.
3. **Hex-explicit** — palette references use hex codes, not color names.
4. **Output-formatted** — names the format (PNG/SVG), dimensions, background (transparent / parchment / etc.).

A prompt pack that's missing any of these is incomplete — return for
revision before handing to the asset-artifact step.

## 5. Storage

Generated prompt packs ship into the WR's `assets/prompts/` directory
alongside the WR doc, so re-runs and audits can replay them exactly.

```text
wr/issues/issue-NNNNN-...md          ← the WR doc
wr/issues/issue-NNNNN-...assets/
  prompts/
    grid-multi-palette.md            ← slot 1
    hero-composition.md              ← slot 2
    alt-composition.md               ← slot 3
    pattern-texture.md               ← slot 4
```

Committing the prompts gives the asset-artifact step a stable input and
the audit trail later answers "what exactly did we ask the model to make?"
without rummaging through PR comments.
