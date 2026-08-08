# No-Kill Shelter Business — Overview

## Purpose

Private hub for no-kill animal shelter business work under Freedom Angel Corp /
MIDNGHTSAPPHIRE:

1. **Operations** — intake, foster placement, adoption funnel, outcome tracking.
2. **People** — volunteer scheduling, staff roles, training checklists.
3. **Funding** — donor stewardship, grants, Polar.sh / GitHub sponsorship hooks.
4. **Compliance** — local licensing notes, record retention, medical log hygiene.
5. **Tooling links** — adoption boards, CRM-lite, messaging automations.

## Architecture (current)

| Layer | State | Notes |
| --- | --- | --- |
| Docs hub | Active | README, OVERVIEW, CONTRIBUTING |
| Review jury | Active (this package) | OpenRouter, Jules, Semgrep, CodeQL |
| Application `src/` | Empty / optional | Add only when a concrete tool ships |
| npm baseline | Active | `npm test` validates structure |
| Legacy docx | Present | `docs/Untitled document.docx` — migrate to Markdown over time |

## Monetization path

| Path | Mechanism | Priority |
| --- | --- | --- |
| Donor / sponsor portal | Recurring gifts via Polar.sh or Stripe | P0 — funding surface |
| Grant-ready ops pack | Digital download (Gumroad / Polar) of checklists | P1 |
| Managed adoption board SaaS | Hosted board for partner shelters (freemium) | P1 |
| Consulting / white-label playbooks | Paid implementation for other rescues | P2 |

Prime directive alignment: improves Polar.sh funding surface and productizes
OSINT-adjacent nonprofit research into shippable packs.

## Competitor / tool landscape (cited)

| Tool | Role | Stars (approx.) | Pricing signal | Source |
| --- | --- | --- | --- | --- |
| [animavita/animavita](https://github.com/animavita/animavita) | Mobile adoption + alerts | ~733 | OSS (GPL-2.0) | GitHub API, retrieved 2026-08-08 |
| [jllorencetti/pets](https://github.com/jllorencetti/pets) | Django missing/adoption board | ~102 | OSS (MIT) | GitHub API, retrieved 2026-08-08 |
| [aoda-zhang/PawHaven-FullStack-React-NodeJS](https://github.com/aoda-zhang/PawHaven-FullStack-React-NodeJS) | Stray rescue case tracker | ~91 | OSS (MIT) | GitHub API, retrieved 2026-08-08 |
| [ShelterTechSF/askdarcel-web](https://github.com/ShelterTechSF/askdarcel-web) | Human shelter resource finder (adjacent UX) | ~29 | OSS (GPL-3.0) | GitHub API, retrieved 2026-08-08 |
| Shelterluv / PetPoint / Shelter Buddy | Commercial shelter CMS | N/A (closed) | Pricing data pending — competitive benchmark research required for exact tiers | Vendor sites |
| Petfinder / Adopt-a-Pet | Adoption marketplaces | N/A (closed) | Listing / partnership fees (estimate: dominant consumer discovery channels) | Vendor sites |

## Marketing / SEO keywords

Primary: no-kill shelter, animal shelter business plan, foster network playbook,
pet adoption funnel, shelter volunteer scheduling, animal rescue CRM,
donor stewardship nonprofit.

Long-tail: no-kill intake policy template, shelter capacity math,
spay-neuter funding checklist, adopter screening workflow, grant-ready
animal welfare ops pack.

## Security baseline

- No secrets in-repo; `.env` gitignored.
- Semgrep secrets + security-audit ERROR gate on PRs.
- CodeQL for `actions`, `javascript-typescript`, `python`.
- Jury workflows skip gracefully when optional API keys are missing
  (except CodeQL/Semgrep structural scans).
- Never commit adopter/foster PII, veterinary records, or unredacted case notes.

## Non-goals

- Replacing Shelterluv/PetPoint as a full CMS in this maintenance pass.
- Public open-source licensing — All Rights Reserved remains.
- Live animal medical advice or clinical protocols in this repo.
