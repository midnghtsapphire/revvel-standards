# Music Projects — Overview

## Purpose

Private hub for music-domain work under Freedom Angel Corp / MIDNGHTSAPPHIRE:

1. **Production** — session notes, DAW checklists, loudness targets.
2. **Songwriting** — lyric/structure templates and AI-assisted drafting rules.
3. **Stem separation** — research and runbooks around Demucs / Spleeter-class tools.
4. **Distribution** — release checklists (metadata, ISRC, stores, Content ID).
5. **Adjacent product links** — e.g. Music Video Creator in revvel-standards.

## Architecture (current)

| Layer | State | Notes |
| --- | --- | --- |
| Docs hub | Active | README, OVERVIEW, CONTRIBUTING |
| Review jury | Active (this package) | OpenRouter, Jules, Semgrep, CodeQL |
| Application `src/` | Empty / optional | Add only when a concrete tool ships |
| npm baseline | Active | `npm test` validates structure |

## Monetization path

| Path | Mechanism | Priority |
| --- | --- | --- |
| Music Video Creator upsell | Paid generations / subscriptions via Polar.sh | P0 — existing product |
| Stem-separation SaaS | Upload → separate → download; freemium API | P1 |
| Distribution checklist pack | Gumroad / Polar digital download | P2 |
| Session musician marketplace | Separate product (do not confuse with this hub) | Out of scope here |

Prime directive alignment: strengthens the automated product pipeline and
Polar.sh funding surface for creative tools.

## Competitor / tool landscape (cited)

| Tool | Role | Stars (approx.) | Pricing signal | Source |
| --- | --- | --- | --- | --- |
| [deezer/spleeter](https://github.com/deezer/spleeter) | Stem separation | ~28.4k | OSS (Apache-2.0) | GitHub, retrieved 2026-08-08 |
| [facebookresearch/demucs](https://github.com/facebookresearch/demucs) | Hybrid demucs separation | ~10.4k | OSS (MIT) | GitHub, retrieved 2026-08-08 |
| [nomadkaraoke/python-audio-separator](https://github.com/nomadkaraoke/python-audio-separator) | CLI separator wrappers | ~1.3k | OSS | GitHub, retrieved 2026-08-08 |
| DistroKid / TuneCore / CD Baby | Distribution | N/A (closed) | Subscription / per-release | Vendor sites — pricing data pending competitive benchmark research required for exact tiers |
| Suno / Udio | Generative music | N/A (closed) | Freemium SaaS | Vendor sites — estimate: crowded consumer AI-music market |

## Marketing / SEO keywords

Primary: stem separation, AI songwriting, music distribution checklist,
music production tools, demucs alternative, vocal remover, ISRC workflow.

Long-tail: private music production hub, batch stem separation API,
Content ID prep checklist, loudness LUFS target guide.

## Security baseline

- No secrets in-repo; `.env` gitignored.
- Semgrep secrets + security-audit ERROR gate on PRs.
- CodeQL for `actions`, `javascript-typescript`, `python`.
- Jury workflows skip gracefully when optional API keys are missing
  (except CodeQL/Semgrep structural scans).

## Non-goals

- Replacing DistroKid or full DAWs.
- Shipping the Sessiono musician marketplace inside this repo
  (that content was incorrectly pasted into AGENTS.md and is removed).
- Public open-source licensing — All Rights Reserved remains.
