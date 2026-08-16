# WR: [WR] reviews generation add and update in revvel-standards

**Issue:** #13798  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-24  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

## WR: midnghtsapphire/revvel-standards

**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-05-24  
**Last Updated:** 2026-05-24  
**Language:** JavaScript  
**Research Date:** 2026-05-24 <!-- Use YYYY-MM-DD format -->  
**Researcher:** Copilot Coding Agent  
**WR Status:** 🟡 In Progress

---

## ⚡ Pre-flight: Autonomous Research Defaults

> **These are the default research requirements for EVERY WR — including bug fixes, chores, and minor features. Do not skip any checked item. If a section is genuinely N/A, document why.**

### Research Checklist (pre-checked = required by default)

- [ ] **Deep market research** — keywords, search volumes, CPCs, industry mechanics, pricing
- [ ] **BOM (Bill of Materials)** — ranked API/tool list per category: which API is best, what it costs, why one beats another
- [ ] **Community chatter** — Reddit, TrustPilot, forums: what buyers/users hate about current solutions
- [ ] **Competitor analysis** — existing products, pricing, gaps, our competitive advantage
- [ ] **Domain name strategy** — high-value patterns, TLD recommendations, SEO rationale
- [ ] **Marketing best practices** — what's working now in this niche + how our product improves it
- [ ] **Revenue / monetization model** — specific pricing, channels, subscription vs. one-time, reseller tier
- [ ] **Compliance & legal surface** — TCPA, FCRA, CAN-SPAM, ToS of every data source, licensing
- [ ] **Product / output selections** — explicitly choose artifact shapes (API, CLI, MCP, skill, PDF, deck, video, UI, docs, agent automation)
- [ ] **Platform defaults** — Website in Test on Vercel, DigitalOcean integration default, website auth/admin requirements when UI is in scope
- [ ] **Artifact engine map** — map every selected shape to the repo engine/standard or document the gap
- [ ] **Agent self-healing journal** — institutionalize durable findings back into revvel-standards
- [ ] **A/B test hypothesis** — only if a UI/UX component is being shipped
- [ ] **Affiliate / reseller program** — only if a distribution network is in scope

### GitHub Actions Workflow Dispatch Inputs (for automated WR runs)

When this WR is executed via `workflow_dispatch`, the following inputs are pre-set to ensure autonomous research depth:

```yaml
# Paste into any workflow_dispatch trigger to enforce research standards
on:
  workflow_dispatch:
    inputs:
      deep_research:
        description: 'Run full deep market research (keywords, BOM, chatter, domain)'
        type: boolean
        default: true          # ← ALWAYS true
      include_bom:
        description: 'Generate Bill of Materials (API/tool comparison table)'
        type: boolean
        default: true          # ← ALWAYS true
      include_community_chatter:
        description: 'Research Reddit/forums/TrustPilot for buyer complaints'
        type: boolean
        default: true          # ← ALWAYS true
      include_competitor_teardown:
        description: 'Full competitor pricing + gap analysis'
        type: boolean
        default: true          # ← ALWAYS true
      research_depth:
        description: 'Research depth level'
        type: choice
        options: [standard, deep, exhaustive]
        default: deep           # ← default to deep, not standard
```

> **Fleet Instruction:** An agent receiving this WR must perform research at `deep` or `exhaustive` depth. User instructions are a *starting point* — agents must self-correct, cross-validate against live data, and never follow user WR content verbatim without checking it against current market reality.

---

## Executive Summary

[2-3 sentence summary of repository purpose, current state, and key recommendations]

---

## Step 1: Repository Discovery

### Repository Metadata

| Property | Value |
|----------|-------|
| Repository | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards) |
| Created | 2026-05-24 |
| Last Updated | 2026-05-24 |
| Primary Language | JavaScript |
| Stars | {STARS} |
| Open Issues | {OPEN_ISSUES} |
| Description | Issue #13798 intake captured below: TikTok/Amazon review generation prompts, scripts, and ad-format direction. |
| Private | {IS_PRIVATE} |
| Archived | {IS_ARCHIVED} |

### Issue Intake Details

The following intake was copied from issue #13798 to preserve source requirements context:

### Output Type (required)

production-app

### PDF pipeline batch

None

### Research Mode

None

### Delivery Mode

None

### Lifecycle Mode

None

### Commercial Mode

None

### Summary

_No response_

### Objective

Here are two master prompts designed specifically to generate a viral, TikTok-style Amazon Product Review video.
Since these are meant for an avatar platform like HeyGen (or for an AI video generator), the prompts are structured to create a highly realistic, relatable "UGC" (User Generated Content) aesthetic. They focus on hands-on product interaction and a casual, scroll-stopping setting.
Prompt 1: The "Unboxing & First Impression" Hook (High Trust / High CTR)
Prompt: A vertical 9:16 cinematic shot mimicking a high-end smartphone camera style for a TikTok product review. A charismatic reviewer is sitting at a clean, modern wooden desk illuminated by soft, natural window light. In the center, a sleek, premium Amazon tech gadget or lifestyle product is being unboxed. The camera glides closer in a smooth, handheld tracking motion, capturing crisp, close-up details of the product's texture and glossy surfaces. As the reviewer interacts with the product, subtle atmospheric haze catches faint light leaks in the background, creating depth. The vibe is casual, authentic, and highly engaging, perfectly tailored for a viral UGC review. Photorealistic, 4k resolution, natural lighting, lifelike skin textures, seamless handheld movement.
Prompt 2: The "Problem-Solving Demo" Hook (The "TikTok Made Me Buy It" Vibe)
Prompt: A close-up, dynamic vertical 9:16 tracking shot of an Amazon viral product being used in a real-world scenario, like a moody, modern kitchen or a sleek home office. The camera follows a person's hands demonstrating a clever, satisfying product feature (e.g., a glassmorphic organizer snapping into place or a gadget glowing upon activation). Brilliant rim lighting catches the crisp edges of the product, while a soft-focus background keeps total emphasis on the demonstration. The lighting shifts dynamically to emphasize the "before and after" effect of using the item. Hyper-realistic, 8k resolution, ray-traced reflections, high-energy pacing, premium commercial aesthetic.
🚀 How to Format Your Script for HeyGen:
When you paste your script into HeyGen to go with these visuals, structure it using the Viral TikTok Review Formula:
The 2-Second Anti-Ad Hook: Start with a negative or shocking statement to stop the scroll.
Script: "I almost threw this Amazon find in the trash until I realized I was using it completely wrong..."
The Agitation: Explain the annoying problem everyone has.
Script: "If you’re tired of messy cables destroying your desk setup, you need to see this."
The Payoff (The Product): Show the solution using the visual prompt descriptions above.
Script: "This viral magnetic hub completely hides everything. It literally took me 5 seconds to set up."
The Call to Action (CTA): * Script: "I dropped the exact link in my bio if you want to grab it before it sells out again."

### Required Bundle

_No response_

### Definition of Done

_No response_

### Do Not Under-Scope

_No response_

### Explicit Exclusions

_No response_

### Delivery Shape

None

### Expected Scope

_No response_

### Validation Expectations

_No response_

### Blocker Rule

_No response_

### Acknowledgements

- [ ] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [ ] Explicitly requested secondary items should not be silently deferred.
- [ ] If the PR is partial, the blocker must be documented.
- [ ] The PR should reflect the WR's required bundle and definition of done.
- [ ] 1. If you use a Screenshot
You can take a screenshot of the Amazon product page (or the specific 5-star reviews) and use it in a couple of powerful ways:
The Green Screen Effect: In TikTok or HeyGen, you can upload the screenshot as a background layer. Your AI avatar can stand right in front of it, pointing to the price or the viral reviews while talking.
Split-Screen Editing: You can generate a beautiful, cinematic product shot using the prompts we designed, and place your screenshot side-by-side or as a "pop-up" graphic in the corner of the video to prove it's a real trending item.
2. If you share the Product Link
You can drop the link right here in our chat! While I can't directly open a clickable live window inside an AI video file, you can give me the link or tell me what the product is, and I will:
Extract the exact technical features, materials, and selling points.
Weave those specific details directly into a highly tailored, custom image or video prompt so the AI-generated visuals look identical to the real product.
Write a custom, high-converting script for your HeyGen avatar tailored perfectly to that item.
Go ahead and drop the link or describe the product, and let's build the perfect viral setup for it!Perfect—having the exact product image and link makes a massive difference!
These are **Tigeridea Retro Hook-and-Loop Fashion Sneakers**. They perfectly hit that casual, vintage Samba/Gola look but with a modern, effortless twist (velcro straps instead of laces). This style is a massive trend right now for casual comfort, daily walking, and travel wardrobe aesthetics.
Here are custom image/video prompts tailored specifically to match this exact shoe, followed by a high-converting script built for your HeyGen avatar.
### 🎨 The Custom Visual Prompts
#### Option 1: The Premium Close-Up Look (For B-Roll / Product Showcase)
> **Prompt:** A vertical 9:16 cinematic close-up shot focusing on a pair of vintage-style retro fashion sneakers sitting on a minimalist, textured stone surface. The sneakers feature a premium cream-colored faux leather upper, light grey suede panels on the toe box, and a distinct black serrated wave stripe across the side. Two clean hook-and-loop velcro straps cross the tongue securely. The sole is a classic, crisp tan gum rubber material. Soft, natural morning window light sweeps across the frame, highlighting the fine stitching and material textures. The background is softly blurred with a hint of botanical greenery. Photorealistic, 8k resolution, elegant depth of field, steady tracking shot.
> 
#### Option 2: The Green Screen Background (Sleek, High-Tech Review Canvas)
> **Prompt:** A vertical 9:16 cinematic studio background optimized for a fashion review overlay. The interface is highly modern and glassmorphic, featuring a floating translucent frosted glass panel in the center over a dark, moody charcoal gradient. Floating subtly beside the glass module are crisp, glowing 3D vector icons of a shopping cart, a 5-star rating badge, and a minimalist text block reading "Trending Wardrobe Find". Elegant caustics and light leaks ripple across the reflective surfaces, casting realistic physical shadows. The lower third features a glossy, semi-transparent button area designed for text overlays. Hyper-realistic, 8k, ray-traced reflections, premium UX/UI visualization, 3D glossy realism.
> 
### 🎙️ The HeyGen / TikTok Script
*Set your HeyGen avatar to a casual, conversational, and energetic tone. Use the Option 2 prompt or your Amazon screenshot as the background.*
**[0:00 - 0:02] The Hook (Stop the Scroll)**
"Gatekeeping is over. If you love the retro Samba look but absolutely hate constantly tying your shoes, you need to see these."
**[0:02 - 0:07] The Problem / Agitation**
"We all want that classic, vintage sneaker aesthetic for traveling or daily walking, but finding a pair that doesn’t give you blisters or take ten minutes to lace up is impossible."
**[0:07 - 0:12] The Solution (Show the Product Details)**
"These Tigeridea retro sneakers just dropped on Amazon and they are perfect. Look at the detailing—you get the premium cream leather, the grey suede accents, and a classic tan gum sole."
**[0:12 - 0:17] The Killer Feature (Why they need to buy *now*)**
"But the best part? The double hook-and-loop straps. You just slip them on, strap them down, and you have instant, secure comfort. It gives off major effortless, high-fashion street-style vibes."
**[0:17 - 0:22] Call to Action**
"They are super lightweight, breathable, and shockingly affordable. I linked the exact pair right in my bio so you can grab your size before they go viral on the fashion feeds!"
### 💡 TikTok Pro-Tip for this Video:
When you upload the generated avatar video to TikTok, use the on-screen text tool to place a bold title right at the top for the first 3 seconds: **"The Lazy Girl's Viral Amazon Shoe Hack 🤫"**. It pairs perfectly with the hook and instantly drives clicks to your affiliate link!
Here is the master image generation prompt to create that exact 8-shot grid layout. It includes specific instructions to ensure the correct shoes and the mixture of "feet-in" and "feet-out" angles are rendered separately and clearly.
### The 8-Shot UGC Grid Master Prompt
> **Prompt:** A series of eight individual, vertical (9:16) cinematic still photographs, presented as a 2x4 grid, showcasing the specific Retro Hook-and-Loop Fashion Sneakers [as seen in image_2.png and image_3.png]. The overall visual style is that of high-end User Generated Content (UGC) shot on a modern smartphone, capturing rich, tactile textures of cream leather, grey suede, and gum rubber, with a natural, diffused morning light consistency across all frames.
> **The Grid Composition:**
> **Row 1:**
>  * **Image 1 (Feet In):** A medium close-up shot from a front three-quarter angle, showing a woman's feet wearing the sneakers, standing naturally on textured, light grey stone pavement. Focus is sharp on the shoes, right foot slightly forward.
>  * **Image 2 (Feet In):** A sharp, top-down (flat lay) perspective of the sneakers worn by a woman with clean-pedicured feet, standing on vintage-patterned floor tiles. View is directly down onto the hook-and-loop straps.
> **Row 2:**
>  * **Image 3 (No Feet):** A macro, detailed shot from the side profile (right shoe) without feet. The sneaker is placed on a clean white studio surface, highlighting the black serrated wave stripe, stitching, and the unique hook-and-loop straps.
>  * **Image 4 (Feet In):** A dynamic, low-angle tracking shot from behind a woman walking away, her feet wearing the sneakers on a rain-slicked pavement reflecting city lights. Focus is on the heel and gum sole pattern.
> **Row 3:**
>  * **Image 5 (Feet In):** A three-quarter back view of the woman's feet inside the shoes, walking up wooden stairs. Focus is on the gum sole pattern and heel counter detail.
>  * **Image 6 (No Feet):** A close-up shot of the sneakers from the left side, slightly angled, sitting on a worn, dark wooden floor next to a vintage suitcase. The perspective emphasizes the materials and physical depth.
> **Row 4:**
>  * **Image 7 (Feet In):** A direct front-on shot worn by feet, looking up from ankle height, focusing symmetrically on both sneakers on a paved pathway with fallen leaves.
>  * **Image 8 (Feet In + Action):** A detailed macro shot of a single sneaker (left shoe) on a textured linen fabric. A woman's hand is visible in the frame, adjusting one of the hook-and-loop straps, creating an authentic UGC touch.
> Photorealistic, realistic smartphone camera quality, 9:16 aspect ratio for each panel, natural colors, authentic and relatable fashion vibe.
> 
### 💡 Why this works for your agents/TikTok:
By defining each of the eight panels separately inside the grid description, you guarantee that the final generation contains the exact variety of angles you need for creating B-roll, review overlays, or interactive "this or that" content. It ensures the AI doesn't just loop the same three angles repeatedly.
To launch a successful Meta (Facebook/Instagram) ad campaign that drives traffic to your website or app store upload, you need visuals that instantly signal **high-end engineering, slick UI/UX, and professional credibility**.
Because your software projects focus on highly technical tools (like automation engines, custom dashboards, or master platforms), the ads should lean hard into a **glassmorphic, premium developer aesthetic** to capture the attention of technical founders, creators, and agency owners.
Here are the master prompts tailored specifically for Meta's core ad formats, along with the strategy to maximize your ad spend.
### Format 1: The Meta Carousel Ad (Best for Feature Breakdown)
*Carousels are incredibly effective for apps because each card can showcase a different aspect of your platform (e.g., Card 1: Main Dashboard, Card 2: Code/Integration, Card 3: Download/Call-to-Action).*
#### Card 1: The Core Dashboard View (The Hook)
> **Prompt:** A premium 1:1 square cinematic shot of an ultra-modern website homepage displaying a powerful custom software application dashboard. The UI features layered, thick-cut glassmorphic panels floating gracefully over a dark, sleek minimalist studio background. Crisp, glowing data visualization graphs in electric cyan and emerald green trace upward across the translucent frosted glass. Sharp rim lighting and realistic shadows between layers give the software an immense 3D physical presence. Photorealistic, 8k resolution, ray-traced reflections, premium software UX/UI visualization, professional Meta ad style.
> 
#### Card 2: The Integration / Backend View (The Authority Proof)
> **Prompt:** A premium 1:1 square cinematic shot of a developer-focused app feature. The interface showcases a floating glassmorphic terminal running automated scripts and crisp, glowing lines of monospaced code. Intricate, glowing neon data pathways weave across the frosted glass surface, connecting the code block to various integrated API modules and server nodes. Subtle atmospheric haze drifts behind the floating layers, catching sharp light leaks on the glossy, refractive edges. Hyper-realistic, 8k, ultra-detailed glass textures, tech-heavy premium engineering aesthetic.
> 
#### Card 3: The Download & Deploy View (The Conversion)
> **Prompt:** A premium 1:1 square cinematic shot focusing on the final call-to-action screen of a software landing page. A central, layered frosted glass module floats over a deep charcoal gradient background, displaying a sleek laptop mockup next to a beautifully rendered download badge. A prominent, high-gloss glassmorphic button in the center glows with a soft accent light, showcasing the sharp text "Instant Access". Elegant depth of field, tactile glass textures, pristine UX/UI layout designed for high conversion.
> 
### Format 2: The Meta Single Image / Story Ad (9:16 Vertical)
*Perfect for Instagram/Facebook Stories and Reels placements where you want to capture full-screen attention.*
> **Prompt:** A vertical 9:16 cinematic hero shot of an advanced multi-agent software platform interface optimized for a premium tech ad campaign. The design features a stunning master dashboard built with stacked, semi-transparent glassmorphic panels hovering over a dark, moody luxury office background. Radiant, glowing data pipelines stream between the UI layers, symbolizing seamless workflow automation. A prominent, glossy call-to-action button reads "Get the App". Thick atmospheric fog rolls across the lower half of the frame, catching sharp beams of cool blue and warm gold rim lighting on the crisp, refractive glass edges. Photorealistic, 8k resolution, elegant 3D realism, scroll-stopping digital art.
> 
### 📈 Meta Ad Campaign Framework (How to Target & Sell)
When setting up this campaign in Meta Ads Manager, use this high-converting structure to match your premium visuals:
 * **The Campaign Objective:** Select **"Leads"** (if capturing emails on a landing page before handing over the download) or **"Sales"** (if selling a premium snapshot, template, or app directly).
 * **Targeting Strategy:** * *Interests:* "GoHighLevel", "Software as a Service (SaaS)", "Web Development", "Marketing Automation", "GitHub".
   * *Job Titles:* "Founder", "Agency Owner", "Software Engineer", "Operations Director".
 * **The Ad Copy Formula (Short & Punchy):**
   > **Hook:** "Stop building your workflows from scratch. I spent years perfecting this architecture so you don’t have to."
   > **Value:** "Import my exact master engine into your account in one click. Fully automated multi-agent pipelines, smart integrations, and flawless reporting."
   > **CTA:** "Tap 'Learn More' to deploy the snapshot instantly. 🚀"
   >

### Current Status

- **Active Development:** [Yes/No - based on recent commits]
- **Last Commit:** [Date and summary]
- **Open PRs:** [Count and notable ones]
- **Open Issues:** [Count and critical ones]
- **Deployment Status:** [Deployed/Not Deployed - Vercel URL if exists]
- **CI/CD Status:** [Passing/Failing/Not configured]

### Repository Structure

```
[Tree structure of key directories and files]
```

### Key Technologies

- **Frontend:** [Framework/libraries]
- **Backend:** [Framework/libraries]
- **Database:** [Type and provider]
- **Deployment:** [Platform]
- **CI/CD:** [Tooling]

---

## Step 1A: Product / Output Selections

| Output shape | In scope? | Format / length | Primary engine / standard | Notes |
|--------------|-----------|-----------------|---------------------------|-------|
| Website / app UI | [Yes/No] | [site/app] | [engine] | [notes] |
| API | [Yes/No] | [REST/GraphQL/etc.] | [engine] | [notes] |
| CLI | [Yes/No] | [binary/package] | [engine] | [notes] |
| MCP | [Yes/No] | [server/router/tool manifest] | [engine] | [notes] |
| Skill | [Yes/No] | [skill type] | [engine] | [notes] |
| PDF | [Yes/No] | [report/guide/etc.] | [engine] | [notes] |
| PowerPoint / deck | [Yes/No] | [sales/training/review deck] | [engine] | [notes] |
| Video | [Yes/No] | [demo/training/review/YouTube + target length] | [engine] | [notes] |
| Docs | [Yes/No] | [site/spec/readme] | [engine] | [notes] |
| Agent automation | [Yes/No] | [workflow/agent/service] | [engine] | [notes] |

### Platform Defaults & Website Requirements

- **Website in Test:** [Vercel URL or documented gap]
- **Integration runtime:** [DigitalOcean by default / documented exception]
- **Admin surface:** [required / not required / gap]
- **User auth:** [Apple / Google / GitHub / other / not required]

---

## Step 2: Deep Web Research

> **Research Mandate:** Every WR MUST include ALL of the following subsections before implementation begins. Shallow research is insufficient. Discovery requires:
>
> - **(1) What is being used now** — existing solutions, pricing, mechanics
> - **(2) What problem are we solving** — specific pain points from community research
> - **(3) How much do people pay** — keyword CPCs, lead prices, subscription rates
> - **(4) What do buyers hate about current solutions** — sourced from forums, reviews, Reddit
> - **(5) High-value positioning data** — keywords, domain strategy, marketing ROI
> - **(6) API/Data BOM** — provider, best-for use case, data capability, cost model, strengths/risks, and compliance notes
>
> An LLM agent must be able to answer every question in this template from live web research before implementation begins.

### Market Opportunity Analysis

#### Current Market Trends

[Research findings about market trends in this domain — include data points, stats, and growth signals]

**Sources:**

#### Target Audience & Trigger Events

[Who buys this product/uses this service? What specific life events or triggers drive purchase intent? Include audience segments with size estimates.]

| Audience Segment | Trigger Event | Intent Level | Est. Market Size |
|-----------------|---------------|--------------|-----------------|
| [Segment 1] | [Trigger] | High/Med/Low | [Size] |
| [Segment 2] | [Trigger] | High/Med/Low | [Size] |

#### SEO & Keyword Research

**This section is REQUIRED for any product with a web/content component.**

| Keyword | Monthly Volume (US) | Avg CPC | Competition | Intent |
|---------|---------------------|---------|-------------|--------|
| [primary keyword 1] | [volume] | [$CPC] | High/Med/Low | Transactional/Informational |
| [primary keyword 2] | [volume] | [$CPC] | High/Med/Low | Transactional/Informational |

**Long-tail / trigger-specific keywords:**

- [keyword]: [volume] — [why it matters]
- [keyword]: [volume] — [why it matters]

**Implication for this WR:** [What the keyword data tells us about the market opportunity and landing page strategy]

#### Bill of Materials (BOM) — APIs & Tools

> **This section is REQUIRED for EVERY WR, including bug fixes and chores.** List every API, CLI, MCP, GitHub App, or third-party service needed to build and operate this product. Rank by fit. Explain why one beats another.

**Category: [Primary Data Source]**

| API / Tool | Cost | Coverage | Best For | Verdict |
|------------|------|----------|----------|---------|
| [Option 1] | [$] | [Coverage] | [Use case] | ⭐ Recommended / ✅ Acceptable / ❌ Avoid |
| [Option 2] | [$] | [Coverage] | [Use case] | |

**Category: [Compliance / Validation]**

| API / Tool | Cost | Features | Best For | Verdict |
|------------|------|----------|----------|---------|
| [Option 1] | [$] | [Features] | [Use case] | |

**Category: [Delivery / Storefront]**

| Platform | Rev Share | Best For | Verdict |
|----------|-----------|----------|---------|
| [Option 1] | [%] | [Use case] | |

**BOM Cost Summary:**

| Category | Recommended Tool | Est. Monthly Cost |
|----------|-----------------|-------------------|
| [Category 1] | [Tool] | $[X] |
| [Category 2] | [Tool] | $[X] |
| **Total Infrastructure** | | **$[Total]/mo** |

> **ROI Check:** [How many units/sales cover infrastructure cost?]

#### How the Industry Works — Mechanics

[Explain exactly how the current market solves this problem. Include: how buyers find/purchase, how pricing works, what the conversion funnel looks like, and what makes a high-quality solution vs. a low-quality one.]

**Shared vs. Exclusive / Tiered pricing:**

| Solution Type | How It Works | Cost | Conversion Rate | Why Some Are Worth More |
|--------------|-------------|------|----------------|------------------------|
| [Type 1] | [Mechanics] | [$] | [Rate] | [Value drivers] |
| [Type 2] | [Mechanics] | [$] | [Rate] | [Value drivers] |

**Why some [units] are worth more than others:**
[Enumerate the specific factors that increase value — recency, exclusivity, intent signal, geography, verification, compliance documentation, etc. with % premium estimates where available]

#### Competitors & Alternatives

| Competitor | Type | Cost | Conversion/Quality | Gap / What They Don't Do |
|------------|------|------|-------------------|--------------------------|
| [Name 1] | [Type] | [Pricing] | [Quality/rate] | [Gap] |
| [Name 2] | [Type] | [Pricing] | [Quality/rate] | [Gap] |
| **This Engine** | [Type] | [Pricing] | [Expected] | [Our advantage] |

#### API / Data Source BOM (REQUIRED)

**Every WR must include a BOM-style source comparison for the core product dependencies (APIs, datasets, CLI/MCP integrations, GitHub Apps where relevant).**

If the WR involves outreach, messaging, or lead/contact data, the BOM must also define a **lookup-backed contactability model** (do not rely on a single yes/no compliance flag). Show which source types can start as contact-eligible, which require manual review, and which require pre-contact suppression/DNC checks.

| Provider/API | Best For | Data/Capability | Cost Model | Strengths | Weaknesses/Risks | Compliance Notes |
|--------------|----------|-----------------|------------|-----------|------------------|------------------|
| [Provider 1] | [Job-to-be-done] | [Output] | [Pricing] | [Strength] | [Risk] | [ToS/legal notes] |
| [Provider 2] | [Job-to-be-done] | [Output] | [Pricing] | [Strength] | [Risk] | [ToS/legal notes] |

**BOM Decision:**

- Primary provider stack: [choice + reason]
- Secondary/fallback stack: [choice + reason]
- Why this BOM is superior for this WR: [evidence]

#### Community Chatter — What Users Dislike About Current Solutions

**This section is REQUIRED. Research Reddit, forums, TrustPilot, Yelp, App Store reviews, ComplaintsBoard, or any relevant community to surface real pain points.**

**Top complaints (cite sources where possible):**

1. **[Complaint 1]:** [Quote or paraphrase from community research]
2. **[Complaint 2]:** [Quote or paraphrase from community research]
3. **[Complaint 3]:** [Quote or paraphrase from community research]

**What users/buyers actually want (opportunity signals):**

- [Want 1]: [Why this is an opening]
- [Want 2]: [Why this is an opening]

> **How this WR's solution addresses the top complaints:** [Explicit mapping of complaints to features]

#### Domain Name Strategy

**This section is REQUIRED for any product with a web presence.**

**High-value domain patterns for this niche:**

| Pattern | Examples | Rationale |
|---------|---------|-----------|
| [Pattern 1] | [Examples] | [Why it works] |
| [Pattern 2] | [Examples] | [Why it works] |

**Recommendation:** [Specific domain guidance — TLD preference, availability check strategy, priority]

#### Monetization Opportunities

1. **Direct Revenue:**
   - [Strategy 1]: [Description and potential]
   - [Strategy 2]: [Description and potential]

2. **Affiliate / Reseller Partnerships:**
   - [Partner 1]: [Commission structure]
   - [Partner 2]: [Commission structure]

3. **Subscription / Recurring:**
   - [Feature 1]: [Pricing potential]
   - [Feature 2]: [Pricing potential]

**Revenue Potential:** [Conservative/Moderate/Aggressive estimates with assumptions]

#### Marketing Best Practices — What's Working Now & How This Improves It

**This section is REQUIRED. Research current marketing strategies in this niche.**

| Strategy | What Works Now | How This WR Improves It |
|----------|---------------|------------------------|
| [Strategy 1] | [Current best practice + data] | [How our product is better] |
| [Strategy 2] | [Current best practice + data] | [How our product is better] |

**Inbound vs. Outbound ROI comparison:**

- Inbound ROI: [Data + timeframe]
- Outbound ROI: [Data + timeframe]
- Recommended approach for this WR: [Recommendation with rationale]

#### Research Fleet Plan & Review Fleet Plan (REQUIRED)

Define a layered research engine using two AI fleets:

1. **Research Fleet (Discovery):** [agents/roles that gather market data, BOM options, citations]
2. **Review Fleet (Verification):** [agents/roles that audit research quality, detect missing sections, and reject unsupported claims]

**Gate Rule:** WR research cannot be marked complete until the Review Fleet passes the Discovery output.

**Minimum pass criteria (required):**

- All REQUIRED sections in Step 2 are present and non-empty
- Zero unsupported factual claims in sampled checks
- Citation coverage for factual claims ≥ 90% (factual claim = any specific statistic, price, market-size number, conversion-rate figure, or legal/compliance assertion)
- Compliance section includes explicit legal/ToS constraints for every paid or scraped-prone source

**Threshold rationale:** 90% is the default to prevent low-evidence WRs while allowing a small margin for clearly marked exploratory assumptions. Any threshold change must be approved by repository maintainers/standards owners per `docs/WEEKLY_RESEARCH_PROCESS.md` and documented in the PR.

**How to measure citation coverage:** use a simple review scorecard (`factual_claim_count`, `claims_with_source`, `coverage_percent`) in the WR or PR comment. Until automation exists, this remains a permanent manual checkpoint owned by the WR author and verified by the PR reviewer.

**Counting example:**

- Claim requiring citation: "LinkedIn paid API costs ~$100/mo" → must include source
- Claim requiring citation: "Exclusive leads convert at 10–20%+" → must include source
- Opinion/strategy statement: "This approach is better for SMB agencies" → citation optional (label as opinion)

**If the WR is operationally complex, define support fleets explicitly (for example: Database Architecture, DBA/Reliability, Compliance Operations, Revenue Delivery) instead of collapsing everything into a single generic implementation team.**

**If the WR includes ranking, gating, confidence, or probability decisions, define a scoring model explicitly:** scoring dimensions, evidence inputs, weights or prioritization logic, threshold bands, blocking conditions, and explanation/audit outputs. Prefer reusable score-engine patterns over one-off magic numbers.

#### Instruction Normalization (REQUIRED)

User prompts and brainstorms are inputs, not immutable specs. Record:

- What was accepted as-is
- What was corrected/pivoted based on standards or evidence
- What was rejected and why

This prevents copy/paste execution of low-quality or conflicting ideas and keeps WRs aligned to repository standards.

---

## Step 3: Requirements from revvel-standards

### Prime Directive Alignment

**10M by 2030 Goal:**

- Current contribution: [$amount/month or $0]
- Potential contribution: [$amount/month]
- Path to contribution: [Strategy]

**$2000+/month Target (Start: May 1, 2026):**

- Revenue streams identified: [Count]
- Estimated monthly revenue: [$amount]
- Time to first revenue: [Weeks/months]

### Driven Autonomy Assessment

**Current Autonomy Level:** [Low/Medium/High]

**Blockers Identified:**

1. [Blocker 1]: [Impact] → [Solution]
2. [Blocker 2]: [Impact] → [Solution]

**Autonomous Capabilities:**

### Self-Healing Capabilities

**Current Self-Healing:** [None/Partial/Full]

**Implemented:**

- [Feature 1]: [Description]
- [Feature 2]: [Description]

**Missing:**

- [Feature 1]: [Description and priority]
- [Feature 2]: [Description and priority]

### Decision Scoring Model Gate

> Required when the WR ranks, filters, qualifies, prices, routes, or assigns confidence/probability to records.
> Follow [`standards/DECISION_SCORING_ENGINE_STANDARD.md`](../standards/DECISION_SCORING_ENGINE_STANDARD.md).

**Does this WR make scoring/ranking/confidence decisions?** [Yes/No]

**Model Name:** [e.g., contactability_v1, seo_opportunity_v1, product_viability_v1]

**Status Values:**

- [ ] `eligible`
- [ ] `manual_review`
- [ ] `blocked`
- [ ] `suppressed`
- [ ] Other: [define]

**Score Range:** 0-100

**Weighted Factors:**

| Factor | Weight | Source | Why it matters |
|---|---:|---|---|
| [factor] | [0.00] | [input/source] | [reason] |

**Threshold Bands:**

| Score Range | Status | Action |
|---|---|---|
| 80-100 | eligible | [export/route/approve] |
| 50-79 | manual_review | [review queue] |
| 0-49 | blocked | [suppress/reject] |

**Audit Trail Required:**

- [ ] Model version recorded
- [ ] Factor values recorded
- [ ] Explanation trail recorded
- [ ] Actor and timestamp recorded
- [ ] Manual-review route recorded when status is `manual_review`

**Async Safety Rule:** If the decision writes audit logs, calls APIs, or routes manual review, evaluate with `Promise.all` or `for...of` before filtering. Do not call async eligibility functions directly inside `Array.prototype.filter`.

**Tenant / Client Separation:**

- **Organization boundary:** [Audrey-owned / client / partner]
- **Project boundary:** [project/workstream ID]
- **Data domain:** [enterprise / client / product / research]
- **Rate-card or confidence lookup table required:** [Yes/No]

### Ship to Market Status

**Current Status:** [Not Ready / Needs Work / Ready / Deployed]

**Readiness Checklist:**

- [ ] All tests passing
- [ ] No linting errors
- [ ] No security vulnerabilities
- [ ] Deployment configured
- [ ] UI verified
- [ ] Documentation complete
- [ ] TEST section in README
- [ ] Vercel URL available

---

## Step 4: Redevelopment & Redesign

### Fix All Errors

#### Test Failures

**Current Status:** [Pass/Fail/No tests]

**Failures Identified:**

1. [Test 1]: [Issue] → [Fix]
2. [Test 2]: [Issue] → [Fix]

#### Linting Errors

**Current Status:** [Pass/Fail/No linter]

**Errors Identified:**

1. [Error 1]: [Location] → [Fix]
2. [Error 2]: [Location] → [Fix]

#### Security Vulnerabilities

**Critical:** [Count]

1. [Vulnerability]: [Impact] → [Fix]

**High:** [Count]
**Medium:** [Count]
**Low:** [Count]

#### Deployment Issues

**Current Status:** [Working/Broken/Not configured]

**Issues Identified:**

1. [Issue 1]: [Impact] → [Fix]
2. [Issue 2]: [Impact] → [Fix]

### Enhance Features

#### Missing Features from Research

1. **[Feature 1]:**
   - **Why:** [Market need]
   - **How:** [Implementation approach]
   - **Effort:** [Hours/days]

2. **[Feature 2]:**
   - **Why:** [Market need]
   - **How:** [Implementation approach]
   - **Effort:** [Hours/days]

#### UX/UI Improvements

**Current UX Score:** [Rating/10]

**Improvements:**

1. [Improvement 1]: [Issue] → [Solution] → [Impact]
2. [Improvement 2]: [Issue] → [Solution] → [Impact]

#### Accessibility Features

**Current Accessibility:** [WCAG level]

**Required:**

- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Color contrast (WCAG AA)
- [ ] Alt text for images
- [ ] ARIA labels
- [ ] Focus indicators

#### Performance Optimization

**Current Performance:**

- Lighthouse Score: [Rating/100]
- Load Time: [Seconds]
- Bundle Size: [KB]

**Optimizations:**

1. [Optimization 1]: [Improvement] → [Expected gain]
2. [Optimization 2]: [Improvement] → [Expected gain]

### Add Monetization

#### Affiliate Links Integration

**revvel-affiliate-links MCP:**

- [ ] MCP server configured
- [ ] Affiliate links identified
- [ ] Links integrated in content
- [ ] Tracking configured

**Links to Add:**

| Product/Service | Affiliate Program | Commission | Location |
|----------------|-------------------|------------|----------|
| [Name] | [Program] | [Rate] | [Where to add] |

#### Payment Integration

**Gumroad:**

- [ ] Account setup
- [ ] Products created
- [ ] Integration implemented
- [ ] Checkout tested

**LemonSqueezy:**

- [ ] Account setup
- [ ] Products created
- [ ] Integration implemented
- [ ] Checkout tested

**Recommended Platform:** [Gumroad/LemonSqueezy/Both] - [Reason]

#### Tracking & Analytics

**Current Analytics:** [None/Partial/Full]

**To Implement:**

- [ ] Google Analytics 4
- [ ] Plausible Analytics (privacy-friendly alternative)
- [ ] Revenue tracking
- [ ] Conversion tracking
- [ ] User behavior tracking
- [ ] A/B testing setup

---

## Step 5: Deployment Verification

### Vercel Deployment

**Current Status:** [Deployed/Not deployed/Needs fix]

**Configuration:**

- [ ] `vercel.json` configured
- [ ] Environment variables set
- [ ] Build command correct
- [ ] Output directory correct
- [ ] Deployment protection configured

**URLs:**

- **Production:** [URL or "Not deployed"]
- **Preview:** [URL or "Not configured"]

**Deployment Issues:**
[List any issues and fixes]

### UI Verification

**Verification Checklist:**

- [ ] Homepage renders correctly
- [ ] All pages render correctly
- [ ] All forms work
- [ ] Authentication works (if applicable)
- [ ] API endpoints respond correctly
- [ ] Mobile responsive (tested on [devices])
- [ ] Tablet responsive
- [ ] Desktop responsive
- [ ] No console errors
- [ ] No 404 errors
- [ ] Images load correctly
- [ ] Links work correctly

**Issues Found:**

1. [Issue 1]: [Description] → [Fix]
2. [Issue 2]: [Description] → [Fix]

**Screenshots:**
[Link to screenshots or indicate if captured]

---

## Step 6: Documentation Requirements

### TEST Section

**Current README Status:** [Has TEST section / Missing / Needs update]

**Required Format:**

```markdown
## Test

| Feature | Status | URL |
|--------|--------|-----|
| Homepage | ✅ Working | https://{repo-name}.vercel.app |
| Dashboard | ✅ Working | https://{repo-name}.vercel.app/dashboard |
| API | ✅ Working | https://{repo-name}.vercel.app/api/health |
```

**Action Required:** [None / Add section / Update URLs]

### Deployment Section

**Current README Status:** [Has deployment section / Missing / Needs update]

**Required Format:**

```markdown
## Deployment

**Production:** https://{repo-name}.vercel.app
**Preview:** https://{repo-name}-preview.vercel.app
**Status:** ![Deployment Status](https://img.shields.io/badge/deploy-success-green)
```

**Action Required:** [None / Add section / Update URLs]

### Additional Documentation

**Existing Documentation:**

- [ ] README.md
- [ ] CONTRIBUTING.md
- [ ] LICENSE
- [ ] CODE_OF_CONDUCT.md
- [ ] SECURITY.md
- [ ] API documentation
- [ ] User guide

**Missing Documentation:**
[List what needs to be created]

---

## Step 7: Save This Prompt & Findings

### Saved Locations

- [ ] `/home/runner/work/revvel-standards/revvel-standards/wr/repos/midnghtsapphire/revvel-standards.md` (this file)
- [ ] Pushed to revvel-standards repository
- [ ] WR_TRACKER.md updated
- [ ] Issue created in revvel-standards: #[number]

### Implementation Tasks Created

**Issues Created:**

1. [Issue #X]: [Title] - [Priority]
2. [Issue #Y]: [Title] - [Priority]

### Next Steps

1. [ ] [Action 1] - [Owner] - [Deadline]
2. [ ] [Action 2] - [Owner] - [Deadline]
3. [ ] [Action 3] - [Owner] - [Deadline]

---

## Recommendations

### Immediate Actions (P0)

1. **[Action 1]**
   - **Why:** [Critical impact on Prime Directive]
   - **How:** [Implementation steps]
   - **Effort:** [Hours/days]
   - **Revenue Impact:** [$amount/month]

2. **[Action 2]**
   - **Why:** [Critical impact]
   - **How:** [Implementation steps]
   - **Effort:** [Hours/days]
   - **Revenue Impact:** [$amount/month]

### Short-Term Actions (P1) - Within 1-2 Weeks

1. [Action 1]: [Description] - [Effort] - [Impact]
2. [Action 2]: [Description] - [Effort] - [Impact]

### Long-Term Actions (P2) - Within 1-2 Months

1. [Action 1]: [Description] - [Effort] - [Impact]
2. [Action 2]: [Description] - [Effort] - [Impact]

---

## Risks & Considerations

| Risk | Severity | Probability | Mitigation |
|------|----------|-------------|------------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How to mitigate] |
| [Risk 2] | High/Med/Low | High/Med/Low | [How to mitigate] |

---

## Alternatives Considered

### Alternative 1: [Name]

**Pros:**

- [Pro 1]
- [Pro 2]

**Cons:**

- [Con 1]
- [Con 2]

**Decision:** [Accepted/Rejected] - [Reason]

### Alternative 2: [Name]

**Pros:**

- [Pro 1]
- [Pro 2]

**Cons:**

- [Con 1]
- [Con 2]

**Decision:** [Accepted/Rejected] - [Reason]

---

## References

### Documentation

- [AGENTS.md](/docs/AGENTS.md)
- [WEEKLY_RESEARCH_PROCESS.md](/docs/WEEKLY_RESEARCH_PROCESS.md)
- [promptforproject.md](/promptforproject.md)

### External Resources

### Research Sources

---

## Status Summary

**Research Status:** ✅ Complete / 🟡 In Progress / ⭕ Not Started  
**Implementation Priority:** P0 / P1 / P2  
**Revenue Potential:** $[amount]/month  
**Effort Required:** [Hours/days/weeks]  
**Ship-to-Market Ready:** [Yes/No]  
**Approval Required:** @midnghtsapphire

---

**Last Updated:** 2026-05-24  
**Next Review:** [Date in YYYY-MM-DD format or "After implementation"]

# ─────────────────────────────────────────────────────────────────────────────

# END ADVANCED TEMPLATE

#

# For advanced users who want full control

# Use WR_TEMPLATE_BASIC.md for simple WRs (recommended)

# ─────────────────────────────────────────────────────────────────────────────
