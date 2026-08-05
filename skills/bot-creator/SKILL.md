# Skill: Bot Creator

**Skill Name:** `bot-creator`
**Version:** 1.0.0
**Date:** April 20, 2026
**Status:** Stable
**Category:** Bot Creation
**LLM:** Claude Sonnet 4.5 (primary) / Claude Haiku 4.5 (fast scaffolds)
**Type:** Ephemeral — activates on request, terminates when bot spec is shipped
**Lifecycle:** Session-scoped

---

## Purpose

The **Bot Creator** turns a plain-language idea ("I want a bot that helps me adult, in a BT21 × glassmorphic look") into a complete, ready-to-ship bot specification. It covers what the bot *does* (functional **category**) and what it *looks/sounds like* (one or more **visual styles**, optionally combined), then emits a scaffold the user can drop into any Revvel repo.

This solves the blank-page problem for bot builders: you pick a lane, pick a vibe (or two), and walk away with a named bot, system prompt, persona card, visual theme tokens, and capability checklist — consistent with the rest of the Revvel skills vault.

---

## What This Skill Does

| Action | Description |
|---|---|
| **Interview** | Asks at most 5 short questions: who it's for, what it does, primary category, 1–2 styles, tone |
| **Category lock** | Snaps the bot's purpose to one functional category from the table below |
| **Style compose** | Picks one style or combines up to **two** styles (e.g., `glassmorphic × bt21`) |
| **Spec emit** | Outputs a Bot Spec: name, one-line pitch, system prompt, persona card, visual tokens, capability list |
| **Scaffold** | Writes a `bots/<bot-slug>/` folder with `BOT.md`, `bot.yml`, `persona.yml`, `theme.json` |
| **Register** | Adds the bot to a local `bots/REGISTRY.md` index so later bots inherit the same shape |

---

## Trigger Keywords

```text
bot creator, create a bot, build a bot, new bot, design a bot,
bot builder, scaffold bot, make a bot, bot spec, bot factory,
glassmorphic bot, 3d bot, pacman bot, bt21 bot, pretty pony bot,
memelord bot, genz bot, adulting bot, weaponized bot
```

---

## Functional Categories

Pick exactly **one** category. The category decides the bot's job, tools, and guardrails.

| Category | What the bot does |
|---|---|
| `adulting` | Life-admin nudges: bills, appointments, chores, meds, taxes-lite |
| `creative` | Writes, illustrates, memes, remixes, brainstorms |
| `study` | Explains, quizzes, flashcards, tracks a learning plan |
| `coding` | Writes, reviews, and debugs code; opens PRs |
| `productivity` | Inbox, calendar, tasks, focus timers, standups |
| `social` | Reply drafts, tone-shift, DMs, comment crafting |
| `finance` | Budget, subscriptions audit, expense categorization |
| `wellness` | Mood, journal, sleep, hydration, gentle check-ins |
| `gaming` | Game companions, lore bots, build optimizers |
| `shopping` | Deal hunters, wishlist, price drop watchers |
| `weaponized` | Aggressive debate / roast / cease-and-desist drafting (opt-in, safety rails on) |
| `guardian` | Safety, red-team, fact-checking, scam detection |

> **Weaponized guardrails:** never targets real individuals, never produces threats, slurs, doxxing, or illegal content. Refusals are firm and short.

---

## Visual Style Library

Pick **one or two** styles. Two styles compose via `×` (e.g., `glassmorphic × bt21`).

### Dimensional / rendering styles

| Style | Feel | Signature tokens |
|---|---|---|
| `1d` | Pure line art, single-stroke, monoline | `stroke:#111; fill:none; thickness:2px` |
| `2d` | Flat illustration, bold shapes, no gradients | `flat-color; hard-edge; 2-tone shadow` |
| `3d` | Rendered, soft shadows, dimensional depth | `ambient-occlusion; rim-light; matte-finish` |
| `glassmorphic` | Frosted translucent panels, blurred backdrops | `backdrop-blur:20px; bg:rgba(255,255,255,0.12); border:1px/white/20%` |
| `pacman` | 8-bit / arcade, chunky pixels, CRT scanlines | `pixel-grid:8px; palette:arcade; crt-scanlines` |

### Persona / culture styles

| Style | Feel | Signature tokens |
|---|---|---|
| `weaponized` | Tactical, matte black, hazard accents | `palette:noir+hazard-orange; stencil-type` |
| `adulting` | Soft neutrals, calm, reassuring | `palette:sand+sage; serif-headings; rounded-2xl` |
| `bt21` | Cute mascot, pastel, plush, big eyes | `palette:bt21-pastels; mascot-hero; plush-shadow` |
| `pretty-pony` | Sparkle, rainbow gradients, cutie-marks | `palette:rainbow-pastel; sparkle-particles; script-display` |
| `memelord` | Impact-font, deep-fried accents, reaction energy | `font:impact; emoji-abuse; drop-shadow:heavy` |
| `genz` | Y2K × gradient blur × emoji-first | `palette:gradient-chrome; lowercase; sticker-chaos` |
| `genx` | MTV grunge, cassette, halftone | `palette:grunge; halftone-dots; ransom-type` |
| `millennial` | Soft sans, pastel, hand-lettered, avocado vibes | `palette:millennial-pink+sage; rounded-sans` |
| `boomer` | Clear, high-contrast, large type, classic | `palette:navy+warm-white; serif; ≥18px base` |

### Combo rules

- Max **two** styles, joined with `×`. Three or more muddies the brand — the skill will refuse.
- **Dimensional × Persona** always works (e.g., `3d × bt21`, `glassmorphic × genz`, `pacman × weaponized`).
- **Persona × Persona** is allowed if tones don't fight (e.g., `millennial × adulting` ✅, `boomer × memelord` ❌).
- **Dimensional × Dimensional** collapses to the higher dimension (`1d × 3d` → `3d`).
- Backgrounds/dioramas are **dialed down** by default. Hero subject first, scene second. Only enable busy dioramas when the user explicitly asks.

---

## Workflow

1. **Greet & interview.** At most five questions:
   1. Who is this bot for? (you / friends / public)
   2. What should it do in one sentence?
   3. Pick a category from the list.
   4. Pick 1–2 styles from the library.
   5. Tone slider: `chill · neutral · spicy`.
2. **Lock spec.** Confirm category + styles + tone back to the user in one line.
3. **Generate.** Produce the Bot Spec (see output schema).
4. **Scaffold.** Write files to `bots/<bot-slug>/`.
5. **Register.** Append to `bots/REGISTRY.md`.
6. **Farewell.** Summarize what was created + how to run/iterate.

---

## Output Schema — Bot Spec

```yaml
bot:
  slug: "<kebab-case-name>"
  name: "<display name>"
  pitch: "<one sentence>"
  owner: "<user>"
  category: "<one of the 12 categories>"
  style: "<style>"          # or "<style-a × style-b>"
  tone: "chill"             # chill | neutral | spicy
  persona:
    voice: "<3–5 adjectives>"
    greeting: "<≤2 sentences>"
    farewell: "<≤1 sentence>"
  system_prompt: |
    You are <name>. You help <audience> with <job>.
    Tone: <tone>. Style: <style>.
    Always: <3 rules>. Never: <3 rules>.
  capabilities:
    - "<verb-led capability 1>"
    - "<verb-led capability 2>"
    - "<verb-led capability 3>"
  theme:
    palette: ["#...", "#...", "#..."]
    font_display: "<family>"
    font_body: "<family>"
    radius: "2xl"           # sm | md | lg | xl | 2xl
    surface: "glass"        # flat | glass | 3d | pixel
    motion: "calm"          # calm | playful | aggressive
    background: "minimal"   # minimal | scene | diorama (default: minimal)
```

---

## Scaffold Output

```text
bots/
  <bot-slug>/
    BOT.md          # human doc, mirrors the spec
    bot.yml         # machine config (above schema)
    persona.yml     # persona card reusable by persona-engine
    theme.json      # design tokens the UI layer consumes
```

The scaffold is framework-agnostic. If the host repo is Expo/React, `theme.json` maps to NativeWind / Tailwind tokens. If the host is plain markdown, the theme is reference only.

---

## Defaults & Guardrails

- **Default category:** `productivity`.
- **Default style:** `glassmorphic × millennial`.
- **Default tone:** `neutral`.
- **Default background:** `minimal`. Dioramas/busy scenes are **off by default** per owner feedback ("too many background a litl much").
- **Accessibility:** all themes must pass WCAG AA contrast. Body copy ≥ 14px; ≥ 18px for `boomer`.
- **Safety:** `weaponized` category never targets real people, never produces threats or illegal content, and always refuses doxxing.
- **Ownership:** generated bots belong to the repo owner per Revvel AGENTS.md.

---

## Related Skills

- [`persona-engine`](../persona-engine/SKILL.md) — consumes `persona.yml` at runtime.
- [`skill-forge`](../skill-forge/SKILL.md) — use this when you want a *skill*, not a *bot*.
- [`brainstorming`](../brainstorming/SKILL.md) — run before bot-creator if the idea is still fuzzy.
- [`accessibility`](../accessibility/SKILL.md) — contrast + font-size checks for all themes.

---

## Termination

The skill ends when:
- The bot spec is emitted **and** the scaffold is written, **or**
- The user cancels with `cancel bot`, `stop`, or `never mind`.
