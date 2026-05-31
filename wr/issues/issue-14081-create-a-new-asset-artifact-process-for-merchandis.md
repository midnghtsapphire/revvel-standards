# WR: [WR] Create a new asset-artifact process for Merchandise

**Issue:** #14081  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-05-29  
**Last Updated:** 2026-05-29  
**Language:** JavaScript  
**Research Date:** 2026-05-29
**Researcher:** Jules (Google) + OpenRouter
**WR Status:** ✅ Complete

---

## Executive Summary

This Work Request defines the requirements and process for creating an automated merchandise asset generation pipeline using Gumloop. The pipeline will process uploaded images or API-requested prompts, apply standardized branding templates and colors (specifically targeting a Knoxville/Tennessee Vol Navy aesthetic), and generate properly sized assets for print-on-demand platforms (t-shirts, mugs, etc.). The research preemptively outlines the necessary regional motifs, color palettes, and prompt templates to ensure the output requires only one iteration.

---

## Step 1: Repository Discovery

### Repository Metadata

| Property    | Value                                                                                                                                                                                                                     |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository  | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)                                                                                                                                   |
| Output Type | `production-app`                                                                                                                                                                                                          |
| Objective   | Create merchandising data on gumloop like t-shirts, mugs, et al with images or logos. Images can be uploaded or generated via API requests, converting them to proper sizes using provided branding templates and colors. |

---

## Step 1A: Product / Output Selections

| Output shape | In scope? | Format / length      | Primary engine / standard              | Notes                                      |
| ------------ | --------- | -------------------- | -------------------------------------- | ------------------------------------------ |
| Merchandise  | Yes       | T-shirts, mugs, etc  | `templates/research-preemptive-inputs` | Use provided motifs, palettes, and prompts |
| API          | Yes       | Image Generation API | Gumloop / MCP                          | Generate or resize uploaded images         |

---

## Step 2: Deep Web Research

### Market Opportunity Analysis

#### Regional/Cultural Design Input Set (Knoxville / Tennessee)

When the merch concept targets a specific city, school, or fan base, require a local motif pass in research before prompt finalization.

**Motif candidates for Knoxville / Tennessee football-adjacent themes:**

- **Landmarks:** Sunsphere silhouette, Tennessee River context, Vol Navy dock/boats
- **Team-adjacent visual language:** checkerboard pattern accents, historic "V-O-L-S" stadium letter styling
- **Mascot and icon references:** subtle Smokey-inspired side element, background "Power T"-style geometry (only if licensing permits)
- **Volunteer-era texture ideas:** decorative muskets/tricorn accents in scroll/banner treatments

**Research gate for this section:**

| Candidate Motif | Visual Value | Licensing Risk | Cultural Fit | Keep/Drop                  |
| --------------- | ------------ | -------------- | ------------ | -------------------------- |
| Sunsphere/River | High         | Low            | High         | Keep                       |
| Checkerboard    | High         | Low            | High         | Keep                       |
| Smokey Mascot   | High         | High           | High         | Keep (as stylized variant) |

#### Project-Scoped Palette Template Pack (Issue #14081)

Store this palette pack in revvel-standards as a reusable reference for similar location-themed requests, but treat it as project-scoped defaults for this merchandise pipeline.

| Palette Theme               | Core Colors                                                                                 | Recommended Use                                            |
| --------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Tennessee Signature         | Tennessee Orange + White + Checkerboard pattern                                             | Primary identity, hero treatments, sports-forward variants |
| Traditional Athletic Accent | Tennessee Orange + White + Smokey Grey (charcoal)                                           | Outlines, depth, retail-ready apparel variants             |
| Natural Knoxville Context   | Smoky Mountain Blue/Purple + Deep Forest Greens + River Blues (+ restrained Orange accents) | Scenic/background variants, river/landmark compositions    |
| Premium Dark Variant        | Dark Smokey Grey base + golden-orange highlights + white contrast                           | Premium/night editions and high-contrast merch previews    |

**Palette combo prompts to test:**

1. Tradition-Rich: Tennessee Orange + White + Smokey Grey
2. Checkerboard Power: Orange/White checkerboard borders + solid dark fields
3. UT Natural: Tennessee Orange + Smoky Mountain Blue + River Blue
4. Elegant Accents: Smokey Grey primary + sparse orange callouts

#### Concept Grid Prompt Templates (Project-Scoped)

Use these as baseline templates for preemptive research-engine prompt libraries and variant generation.

##### Template A — Vol Navy / Sailgating 2x2 Grid

> A vector graphic design showcase sheet featuring four logo variations in a clean 2x2 grid. Main character: cartoon banana mascot in cap and striped jersey steering a vintage wooden boat labeled "VOL NAVY" with checkerboard hull accents. Set on the Tennessee River with stylized Neyland Stadium, Sunsphere, and bridge in the background. Include a "Bananas" banner in bold cursive and a small Bluetick Coonhound side element near a baseball.
> Palette variants: (1) classic Tennessee orange/white with deep navy field, (2) Smokey charcoal grey with muted orange accents, (3) river blues + smoky mountain purples + soft sunset golds, (4) premium dark grey with vibrant golden-orange highlights.
> Style constraints: clean vector lines, screen-print aesthetic, no overlapping frames, single-sheet portfolio layout.

##### Template B — Batting Emblem 2x2 Grid

> A professional 2x2 design presentation sheet showing four variations of a circular sports emblem. Main emblem: cartoon banana mascot in batting stance with baseball bat, stadium scene with lights and scoreboard text "NEYLAND STADIUM HOME OF THE VOLS," and central ribbon scroll reading "Bananas" in thick script. Add a smaller lower emblem with a Bluetick Coonhound and baseball.
> Palette variants: (1) white background + navy lines + bright golden-yellow, (2) cream background + deep navy + muted mustard-gold, (3) orange/white checkerboard outer-ring accents + deep blue fills, (4) warm sunset gradient + charcoal outlines + rich orange jersey accents.
> Style constraints: flat vector color system, sharp typography, textured off-white presentation background, zero overlap.

---

## Step 3: Architecture & Engineering Strategy

### Pipeline Steps

1. **Input Ingestion:** Receive an uploaded image or an API request containing a prompt.
2. **Asset Generation/Processing:**
    - If a prompt is provided, generate the image using the Concept Grid Prompt Templates and Project-Scoped Palettes.
    - If an image is uploaded, process it (resize, format, apply templates).
3. **Formatting:** Convert and resize images to the specific dimensions required for various merchandise (t-shirts, mugs, etc.).
4. **Delivery:** Output the final, print-ready assets.

---

## Step 4: Redevelopment & Redesign

### Enhance Features

#### Missing Features from Research

1. **Setup Gumloop Workflow:**
   - **Why:** Central requirement for the automated merchandising pipeline.
   - **How:** Create a workflow in Gumloop that handles image upload/generation and processing.
   - **Effort:** 1-2 days

2. **Implement Image Processing API:**
   - **Why:** Need to automatically resize and format assets for different merchandise types.
   - **How:** Integrate an image processing service or build a custom API endpoint within the Gumloop workflow.
   - **Effort:** 1-2 days

3. **Integrate Branding Templates and Prompts:**
   - **Why:** Ensures consistent, brand-aligned outputs without manual intervention.
   - **How:** Add the Knoxville motifs, color palettes, and prompt templates to the workflow's generation logic.
   - **Effort:** 1 day

---

## Step 5: Deployment Verification

### Delivery Verification

**Verification Checklist:**

- [ ] Gumloop workflow operates correctly
- [ ] Image resizing works for all target aspect ratios
- [ ] Brand colors applied correctly from template pack
- [ ] No generation errors on prompt inputs
- [ ] Images load correctly
- [ ] Outputs are print-ready

---

## Step 6: Documentation Requirements

### Additional Documentation

**Missing Documentation:**

- Need to create a user guide for submitting API requests to the merchandise pipeline.
- Need to document the supported prompt variables and palette options.

---

## Step 7: Save This Prompt & Findings

### Implementation Tasks Created

**Issues Created:**

1. Issue: Setup Core Gumloop Image Pipeline - P0
2. Issue: Integrate Knoxville / UT Motif Prompt Templates - P0
3. Issue: Add Image Resizing and Print-Ready Formatting - P1

### Next Steps

1. [ ] Setup Gumloop Workflow - @midnghtsapphire - TBD
2. [ ] Integrate Prompt Templates - @midnghtsapphire - TBD
3. [ ] Implement Formatting/Resizing - @midnghtsapphire - TBD

---

## Recommendations

### Immediate Actions (P0)

1. **Setup Core Gumloop Image Pipeline**
   - **Why:** The foundational piece of the work request.
   - **How:** Follow pipeline steps 1 and 2.
   - **Effort:** 1-2 days

2. **Integrate Motif Prompt Templates**
   - **Why:** Crucial for delivering the specified brand outputs in one iteration.
   - **How:** Feed the project-scoped prompt grids into the generation step.
   - **Effort:** 1 day

### Short-Term Actions (P1) - Within 1-2 Weeks

1. Implement Formatting/Resizing: Ensure the images are properly sized for various print formats. - 1-2 days

---

## Risks & Considerations

| Risk                           | Severity | Probability | Mitigation                                                                    |
| ------------------------------ | -------- | ----------- | ----------------------------------------------------------------------------- |
| API Generation Timeouts        | Medium   | Medium      | Implement retry logic in Gumloop                                              |
| Copyright/Licensing on Prompts | High     | Low         | Use the pre-cleared motif subsets and avoid exact copies of trademarked icons |

---

## Status Summary

**Research Status:** ✅ Complete
**Implementation Priority:** P0
**Effort Required:** 3-5 days
**Ship-to-Market Ready:** Yes
**Approval Required:** @midnghtsapphire

---

**Last Updated:** 2026-05-29
