# WR: Music Video Generation Website

**Created:** 2026-05-23
**Status:** 🟡 In Progress

---

## What I Want

Music Video Generation Website

These are example templates. compare competitors and how their apps work, what they offer, how they determine the music video content. We need to develop a repository of templates and/or prompts. I should be able to upload a long song and get either a high seo brand content idea or use my own avatar to be in the video singing song
Here are a few high-concept music video prompts designed to trend, specifically tailored to capture either the Gen Z aesthetic or Gen X nostalgia, optimized for visual hook potential (SEO/viral engagement).
​For Gen Z (The Y2K Cyber-Grunge / Phonk Vibe)
​Prompt: A fast-paced, kinetic cinematic music video shot with an edgy fish-eye lens. A group of stylish Gen Z individuals in oversized tactical streetwear, metallic chains, and tinted futuristic sunglasses are dancing rhythmically in an underground concrete bunker. The space is illuminated by flashing, strobing neon purple and toxic green laser lights. The camera moves with chaotic, high-energy handheld whip-pans and sudden zooms, synchronized perfectly to a heavy, distorted bass beat. Thick, atmospheric smoke and digital glitch overlays distort the frame occasionally. Hyper-realistic, 4k resolution, industrial rave aesthetic, dramatic neon lighting, chaotic camera movement, viral music video style.
​For Gen X (The 80s Synthwave / Cyberpunk Nostalgia Vibe)
​Prompt: A cinematic, moody music video shot with the warm texture and faint scanlines of 35mm retro film. A sleek, retro-futuristic sports car drives down a lonely, rain-slicked highway at midnight, reflecting a massive, glowing pink neon sun on the horizon. The camera slowly glides alongside the car in a smooth, sweeping tracking shot, capturing the driver silhouetted against a futuristic, sprawling cyberpunk cityscape in the background. Hues of deep magenta, electric blue, and warm amber bleed across the lens. Atmospheric low fog rolls across the asphalt. Photorealistic, 8k resolution, retro-wave aesthetic, cinematic lighting, nostalgic synthwave atmosphere, slow and smooth motion.
​The "Glassmorphic Tech-Core" Cross-Over (Sleek, Viral & Modern)
​Prompt: A medium cinematic shot of a solo artist performing inside an abstract, floating glassmorphic cube structure suspended in a dark, infinite void. The walls of the cube are made of thick, semi-transparent frosted glass that subtly blurs and refracts giant, glowing holographic equalizer bars pulsing in the background. The artist’s slow-vibe, fluid movements are tracked by a smooth, orbiting camera that glides seamlessly around the structure. Sharp caustics and light leaks ripple across the glossy surfaces, catching faint beams of cool cyan and warm violet ambient light. Cinematic lighting, photorealistic, 8k resolution, ultra-detailed 3D realism, smooth and hypnotic rhythm.
​💡 SEO & Viral Fine-Tuning Tips for Videos:
​The "3-Second Hook": For Gen Z content, ensure the prompt includes words like kinetic camera movement, sudden zooms, or strobing lights within the first line to guarantee immediate visual stimulation that stops the scroll.
​Color Palette Dominance: Trending videos usually rely on two contrasting neon colors (e.g., magenta and cyan or purple and green). Keep the lighting description restricted to these pairs for a cleaner, high-end look.

---

## Executive Summary

This WR document aims to research, compile, and implement a repository of high-concept music video prompt templates for AI generation. Specifically, it requests the setup of themes for "Gen Z", "Gen X", and "Glassmorphic Tech-Core" aesthetics. The objective is to build a foundation that compares existing apps and defines what they offer to maximize viral and SEO potential on platforms like TikTok using specific visual hook strategies.

---

## Step 1: Repository Discovery

### Repository Metadata

| Property         | Value                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------- |
| Repository       | `products/music-video-creator/`                                                        |
| Primary Language | TypeScript                                                                             |
| Description      | Next.js application that generates AI music videos using various providers and themes. |

---

## Step 2: Deep Web Research

### Market Opportunity Analysis

#### Current Market Trends

- AI video generation is a rapidly growing market for independent musicians, record labels, and agencies who need quick, engaging visual content for social media promotion.
- Tools like Luma, Runway Gen-2, and HeyGen are standardizing the capabilities to generate videos from audio files + imagery.
- A significant trend on platforms like TikTok and Instagram Reels is the reliance on 3-second visual hooks, kinetic typography, and highly stylistic lighting (e.g., Cyberpunk, Phonk, Glassmorphic).
- Consumers actively look for prompt templates and libraries that remove the guesswork from generating high-quality music visuals.

#### Competitor Analysis

**Existing Products & Competitors:**

1. **Luma Dream Machine:** Provides strong text-to-video capabilities and handles music-video-like generation effectively. Pricing is tiered based on generation minutes.
2. **Runway Gen-3 Alpha:** Excellent at abstract, cinematic, and highly stylized looping visuals. Pricing starts around $15/month.
3. **Kaiber:** Specifically designed for music videos and audio-reactive visuals. Extremely popular among Gen Z and indie artists. Costs around $10-15/month.
4. **Sora (OpenAI) / Kling:** High-fidelity generation but often lacks the specific, audio-reactive editing capabilities out of the box without complex prompting.

**Gaps & Our Advantage:**
Current solutions require users to have advanced prompting skills to achieve viral-ready aesthetics like "Y2K Cyber-Grunge" or "80s Synthwave". Our advantage is abstracting the complexity by providing these engineered, proven prompts as simple dropdowns or 1-click templates inside the `music-video-creator` app.

#### Bill of Materials (BOM) — APIs & Tools

#### Category: AI Video Generation APIs

| API / Tool | Cost     | Coverage                    | Best For                       | Verdict        |
| ---------- | -------- | --------------------------- | ------------------------------ | -------------- |
| Luma API   | Variable | High-fidelity text-to-video | Complex cinematic prompts      | ⭐ Recommended |
| HeyGen API | Variable | Avatar-driven video         | Lip-syncing to uploaded tracks | ✅ Acceptable  |
| Runway API | Variable | Abstract / Looping video    | High-concept visualizers       | ✅ Acceptable  |

#### Category: Application Hosting

| Platform | Rev Share | Best For                    | Verdict        |
| -------- | --------- | --------------------------- | -------------- |
| Vercel   | N/A       | Next.js application hosting | ⭐ Recommended |

---

## Specific Requirements (Optional)

_Only fill this out if you want something specific. Otherwise leave blank - the research will decide._

### UI Look & Feel

The application should include a dropdown selection for the three proposed themes: Gen Z, Gen X, and Glassmorphic Tech-Core.

### Must Have

Implementation of the precise prompts requested in the objective.

### Must NOT Have

N/A

### Deadline

N/A

### Budget

N/A

### Other Notes

N/A

---

## Research Auto-Fills This

The following sections are auto-generated by deep market research:

- **Deep market research** — keywords, search volumes, CPCs, industry mechanics
- **BOM (Bill of Materials)** — ranked API/tool list with costs
- **Community chatter** — what buyers/users hate about current solutions
- **Competitor analysis** — existing products, pricing, gaps, our advantage
- **Domain name strategy** — high-value patterns and recommendations
- **Revenue/monetization model** — pricing, channels
- **Compliance & legal** — TCPA, FCRA, CAN-SPAM, data source ToS
- **Repository discovery** — current state, tech stack, deployment
- **Implementation plan** — step-by-step build instructions
- **Ship to market checklist** — tests, deployment, documentation
- **Product / output selections** — API, CLI, MCP, skill, PDF, deck, video, UI, docs, agent automation
- **Platform defaults** — Vercel Website in Test, DigitalOcean integration standard, website auth/admin requirements
- **Artifact engine map** — existing engine/standard for each selected artifact shape
- **Agent self-healing journal** — durable findings that must be institutionalized for future WRs

---

## Research Fleet Plan & Review Fleet Plan

**Research Fleet:** Agents perform deep market research and compile findings.
**Review Fleet:** Agents audit research quality and verify citations.
**Gate Rule:** WR research cannot be marked complete until Review Fleet passes.

---

**Last Updated:** 2026-05-23
