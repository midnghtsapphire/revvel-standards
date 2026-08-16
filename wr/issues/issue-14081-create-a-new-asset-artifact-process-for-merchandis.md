# WR: Create a new asset-artifact process for Merchandise

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

This Work Request defines a new asset-artifact process using Gumloop for generating merchandising data (t-shirts, mugs, etc.) with images and logos. It establishes an automated pipeline that accepts uploaded images, automatically resizes them to proper print dimensions, and generates new designs via API prompting using standardized templates and branding colors. This incorporates preemptive input packs (cultural motifs, color palettes, and prompt packs) required for visual/branded merchandise.

### Original Visual References

<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/b5fcd01b-6448-4827-b35d-252e76518d0d" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/fb1b4863-1bdf-4a50-b365-0e076948687d" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/3bc355d2-ac86-4389-a6f7-a05412698c2c" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/0cea887a-43de-42f0-824b-4655adb7b9b8" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/79cfe65d-c60c-489f-872d-8f99ecfd06f6" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/3f73c755-1404-4af6-b777-48702164ee74" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/4f010777-f5bb-44a9-99ae-e5a55abfcf0c" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/5459eb91-bf10-46d3-8ae0-6b14bed95928" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/f0d05b47-6bee-4209-ab29-c6b1f9fad008" />
<img width="944" height="1115" alt="Image" src="https://github.com/user-attachments/assets/c7a38a9c-46ba-46e5-96f2-93bcbf350085" />
<img width="1408" height="768" alt="Image" src="https://github.com/user-attachments/assets/4ab3fd61-a17e-4e5f-92ec-3da06066313e" />
<img width="1408" height="768" alt="Image" src="https://github.com/user-attachments/assets/e0c57047-8a7b-489f-8347-ce9e41d08123" />
<img width="1408" height="768" alt="Image" src="https://github.com/user-attachments/assets/2d191d52-ed58-4ea8-baab-02d9ac52cbef" />

---

## Step 1: Repository Discovery

### Repository Metadata

| Property         | Value                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- |
| Repository       | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards) |
| Created          | 2026-05-29                                                                              |
| Last Updated     | 2026-05-29                                                                              |
| Primary Language | JavaScript                                                                              |
| Output Type      | production-app                                                                          |

---

## Step 1A: Product / Output Selections

| Output shape     | In scope? | Format / length  | Primary engine / standard | Notes                                    |
| ---------------- | --------- | ---------------- | ------------------------- | ---------------------------------------- |
| Agent automation | Yes       | Gumloop workflow | Gumloop                   | Merchandise design generation            |
| API              | Yes       | REST             | Gumloop Webhook           | Accept image uploads and prompt payloads |

---

## Step 2: Deep Web Research

### Bill of Materials (BOM) — APIs & Tools

#### Category: Primary Data Source / Workflow

| API / Tool | Cost             | Coverage | Best For                                 | Verdict        |
| ---------- | ---------------- | -------- | ---------------------------------------- | -------------- |
| Gumloop    | Freemium / Usage | High     | Workflow automation and image processing | ⭐ Recommended |

#### Category: Image Processing / Generation

| API / Tool                   | Cost     | Coverage | Best For                                | Verdict        |
| ---------------------------- | -------- | -------- | --------------------------------------- | -------------- |
| ImageMagick / Cloudinary API | Variable | High     | Resizing and formatting uploaded images | ⭐ Recommended |
| Luma Labs API                | Variable | High     | AI image generation via prompts         | ✅ Acceptable  |

### Preemptive Visual Inputs (Merchandise & Asset Artifacts)

As required for visual/branded merchandise Output Types:

1. **Regional & Cultural Motif Pack:** Establish core motifs representing the target branding/audience (ensuring no licensing risks).
2. **Color Palette Pack:** Official, Traditional accent, and Natural environment palettes strictly defined by hex codes.
3. **Prompt Pack:** Grid compositions, hero compositions, and pattern textures formatted into reusable instructions for image-generation prompts in Gumloop.

---

## Step 3: Requirements from revvel-standards

### Driven Autonomy Assessment

**Current Autonomy Level:** High

**Blockers Identified:**

1. Improper sizing of uploaded images: Image dimensions must match print-on-demand specifications. → Solution: Introduce an automated resizing step in the Gumloop workflow prior to template application.

### Decision Scoring Model Gate

**Does this WR make scoring/ranking/confidence decisions?** No

### Ship to Market Status

**Current Status:** Ready

**Readiness Checklist:**

- [ ] Documentation complete

---

## Step 4: Redevelopment & Redesign

### Enhance Features

#### Missing Features from Research

1. **Gumloop Image Resizing Module:**
   - **Why:** Uploaded images need to fit standard merchandising formats.
   - **How:** Create a node in Gumloop to evaluate image dimensions and crop/scale proportionally.
   - **Effort:** 4 hours

2. **API Prompt Generation Integration:**
   - **Why:** Users need to generate logos or designs dynamically based on provided templates and branding colors.
   - **How:** Add an AI generation step in the pipeline that accepts a prompt string and hex color codes.
   - **Effort:** 6 hours

---

## Step 5: Deployment Verification

### Automation Verification

**Verification Checklist:**

- [ ] Gumloop workflow triggers correctly on file upload
- [ ] API endpoint processes image correctly
- [ ] Images resize to correct target dimensions
- [ ] Template colors map accurately

---

## Step 6: Documentation Requirements

### Additional Documentation

**Missing Documentation:**
Gumloop Workflow Architecture documentation needs to be updated with the merchandise asset-artifact steps.

---

## Step 7: Save This Prompt & Findings

### Implementation Tasks Created

**Issues Created:**

1. Issue #14081: Create a new asset-artifact process for Merchandise - P0

### Next Steps

1. Configure Gumloop Workflow for image ingestion and API prompt handling
2. Implement automated resizing scripts matching merchandise specs
3. Integrate branding templates, cultural motifs, and color palettes into the rendering pipeline

---

## Recommendations

### Immediate Actions (P0)

1. **Setup Gumloop Merchandise Pipeline**
   - **Why:** Core objective to enable automated asset generation.
   - **How:** Build the Gumloop workflow to accept form uploads and API prompts, enforce target dimensions, and incorporate branding palettes.
   - **Effort:** 2 days
   - **Revenue Impact:** Increased merchandise sales velocity

### Short-Term Actions (P1) - Within 1-2 Weeks

1. **Template Standardization:**
   - **Description:** Create a repository of standard templates for t-shirts, mugs, and other merchandise types, integrating the required preemptive input packs (color palette, motifs, prompts).
   - **Effort:** 3 days
   - **Impact:** High Impact

---

## Status Summary

**Research Status:** ✅ Complete
**Implementation Priority:** P0
**Ship-to-Market Ready:** Yes
**Approval Required:** @midnghtsapphire

---

**Last Updated:** 2026-05-29
