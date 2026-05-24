# UI Creation Engine Standard

**Version:** 1.0.0  
**Date:** May 15, 2026  
**Status:** Mandatory Policy  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Introduction

This standard defines the **UI Creation Engine** — a comprehensive, autonomous system for creating cutting-edge website and mobile app interfaces that compete with top vendors in the USA. Every digital product created must meet or exceed the quality, features, and SEO performance of industry leaders.

**Core Principle**: *"Every digital product should compete with the top vendors in the USA."*

This engine integrates:

- **Competitive Research**: OpenRouter swarms analyze top 10+ competitors
- **Image Optimization**: Automated SEO filename generation, alt text, WebP conversion
- **SEO Metadata**: Comprehensive metadata achieving Lighthouse scores 95+
- **UI/UX Excellence**: Design patterns matching industry leaders
- **Differentiation Strategy**: Identifying unique angles and competitive advantages

---

## 2. When to Use the UI Creation Engine

Invoke the UI Creation Engine whenever:

- Creating a new website or mobile app for any business/service
- Redesigning an existing product to be more competitive
- Conducting competitive analysis for strategic planning
- Optimizing existing UIs for SEO and conversion
- Generating comprehensive design systems and component libraries

**Universal Website Requirement:** From now on, *every product will need a website*. This includes CLI, MCP, API, and skills. When a product is approved, the engine must generate the website for it.

**Do NOT** skip the UI Creation Engine for:

- Client projects (they must be competitive)
- Internal tools that face customers
- Any product that generates revenue
- Any product that represents the Revvel/MIDNGHTSAPPHIRE brand
- Any API, MCP, CLI, or skill (a website is required to see how they work or if they are working)

You MAY skip the full UI Creation Engine workflow for:

- Internal developer tools (non-customer-facing), but they are **not exempt** from the universal website requirement and must still ship at least a minimal website or demo UI
- Proof-of-concept prototypes (but run it before production)
- Documentation sites (use simpler templates)

---

## 3. Engine Architecture

### Three-Layer Orchestration Model

```text
┌─────────────────────────────────────────────────────┐
│             Layer 1: Research Swarm                 │
│  Scout-1: Industry Trends | Scout-2: Top Competitors│
│  Scout-3: SEO Leaders     | Scout-4: UX Patterns   │
│  Scout-5: Technology Stack                          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Layer 2: Analysis & Synthesis             │
│  Sage: Competitive Analysis | Lumen: Insights      │
│  Pixel: UI/UX Recommendations                       │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│           Layer 3: Implementation                   │
│  Forge: Scaffolding | Axle: Backend | Pixel: UI    │
│  + Image Optimization + SEO Metadata Generation     │
│  Implementation Agent: Web & Mobile (Capacitor)     │
│  QA Agent: UI/UX Testing & Functionality            │
└─────────────────────────────────────────────────────┘
```

### Implementation Agent

An **Implementation Agent** must handle the execution for the website and mobile apps (Apple iOS and Android).

- It uses **Capacitor** so every product gets the website first.
- When approved, it generates the mobile equivalent that gets auto-posted to the stores.
- It ensures cutting-edge graphics out the gate (using Leonardo, Picasso, 11 Labs, Nana Banana), including a product or app video describing it.

### QA Agent (Look and Feel Testing)

An agent must be deployed to test the generated interfaces. It guarantees:

- No overlapping fonts or text running together.
- No dead images.
- The shopping cart and core functional elements work correctly.

### Skill Test Harness

For skills (which are highly layered and intricate), a dedicated **Test Harness** must be generated and deployed to ensure they are fully validated.

---

## 4. Glassmorphic Design Prompts

When generating websites and mobile apps, use these master image generation prompts tailored specifically for glassmorphic, hyper-realistic designs. They provide a premium, 3D glossy tech aesthetic.

### Prompt 1: The Dark Mode Analytics Dashboard (Moody & Premium)
>
> A medium-long cinematic shot of an ultra-modern, hyper-realistic website interface featuring a glassmorphic analytics dashboard. Floating 3D translucent glass modules with softly blurred backgrounds display glowing neon blue and vibrant magenta data visualization charts. Thick, realistic atmospheric fog and low haze drift subtly behind the UI layers, catching faint beams of cool ambient light. The entire interface has a glossy, frosted finish with crisp, refracting light edges and realistic depth of field. Photorealistic, 8k resolution, elegant 3D realism, studio lighting, smooth glass textures, octane render style.

### Prompt 2: The Agent Command Center (Sleek, Clean & High-Tech)
>
> A close-up cinematic tracking shot of a stunning, futuristic homepage for an advanced AI agent platform. The UI features layers of semi-transparent, thick-cut frosted glass panels hovering over a dark, minimalist background. A central glassmorphic profile card showcases sharp, metallic typography and glowing amber accent borders. Delicate light leaks and sharp caustics ripple across the glossy, reflective surfaces. Micro-textures on the glass catch the studio rim lighting, creating a perfect balance of transparency and depth. Hyper-realistic, 8k, ultra-detailed, photorealistic glass textures, 3D glossy realism, elegant and premium layout.

### Prompt 3: The Interactive Agent Canvas (Light & Atmospheric)
>
> A cinematic, angled hero shot of a fluid, interactive web application featuring glassmorphic design elements. Multiple layered, translucent glass cards with high-blur backdrops float dynamically over a soft, shifting gradient background of deep violet and warm coral. The edges of the glass panels are brilliantly crisp, catching a glossy rim light that gives them a tangible, 3D physical presence. Soft shadows fall realistically between the floating UI layers, creating an immersive sense of space and high-end digital craftsmanship. Photorealistic, 8k resolution, ray-traced reflections, premium UX/UI visualization.

*💡 Tips for Fine-Tuning the Vibe:*

- **Color Palette:** Replace terms like "cool blue and warm amber" or "neon blue and vibrant magenta" with specific brand colors.
- **Transparency:** If the background bleeds through too much, change "semi-transparent" to "heavy frosted glass" or "thick, low-transparency translucent panels".
- **Realism:** Use terms like "refracting light edges", "sharp caustics", and "micro-textures" to ensure the AI generator treats the glass like a physical, 3D object rather than a flat vector shape.

There must also be templates available for a front-to-back design look and feel (including logo, every logo size, domain check, buy domain, that vibes with the website).

---

## 5. Usage

```bash
npm run ui-engine -- \
  --business="Business Name" \
  --industry="industry type" \
  --location="City, State" \
  --services="list of services"
```

See [`skills/ui-creation-engine/SKILL.md`](../../skills/ui-creation-engine/SKILL.md) for complete documentation.

---

## 6. Quality Gates

- [ ] Competitive research complete (10+ competitors analyzed)
- [ ] All images optimized (WebP, SEO filenames, alt text)
- [ ] SEO metadata complete (all pages)
- [ ] Lighthouse scores: SEO ≥95, Performance ≥90, Accessibility ≥90
- [ ] 3+ differentiation strategies implemented
- [ ] QA Agent confirms no overlapping fonts or dead images, and functional carts.
- [ ] Mobile app equivalent generated via Capacitor and auto-posted.
- [ ] Test harness for skills deployed and passing.

---

*See [`skills/ui-creation-engine/SKILL.md`](../../skills/ui-creation-engine/SKILL.md) for full standard.*
