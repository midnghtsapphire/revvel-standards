# Project Naming Standard

> How projects in the Revvel ecosystem are named. This codifies the convention
> already in use across `growlingeyes/`, `neurooz/`, `coldtrace/`, `oaudrey/`,
> `products/*`, and the brand system in `templates/brand/`.

---

## 1. Two naming tiers

Every project picks **one** of two tiers up front. The tier determines the name
shape, whether it gets a brand identity, and where it lives.

| Tier | When to use | Name shape | Brand identity | Lives in |
|---|---|---|---|---|
| **Codename** | Standalone, market-facing products with their own identity/domain | Evocative, metaphor-driven coined word or compound | **Required** — `docs/<name>/BRAND.md` | Top-level dir `/<name>/` |
| **Descriptive slug** | Internal tools, engines, and utilities | Functional kebab-case describing what it does | Not required | `products/<slug>/` |

If in doubt: anything that gets a domain and a launch is a **Codename**.
Anything that is plumbing is a **Descriptive slug**.

---

## 2. Codename tier

Codenames are short, evocative, and tied to a brand metaphor — **not** a literal
description of the feature. The name should hint at the feeling or adversarial
tension of the product, then the brand fills in the rest.

**Observed codenames and their logic:**

| Codename | Logic |
|---|---|
| **GrowlingEyes** | OSINT / knowledge discovery — "the more we find out, the more our eyes narrow into a digital growl" |
| **Neurooz** | `neuro` + `Oz` — neuro-wellness on an "Urban Oz" theme |
| **Coldtrace** | cold-chain / cold-storage tracing |
| **Oaudrey** | personified agent name (Audrey) |
| **Penny-sovereign-yield-scout** | financial yield discovery (the one descriptive exception — see §4) |

**Rules:**

1. **One or two morphemes.** Coin a word (`Neurooz`) or fuse two evocative words
   (`GrowlingEyes`, `Coldtrace`). Avoid three-plus-word literal phrases.
2. **Metaphor over description.** The name carries a feeling; the *tagline* and
   the **Revvel Emblem** carry the literal meaning. `GrowlingEyes`, not
   `osint-discovery-tool`.
3. **Display name is `PascalCase` / coined caps.** `GrowlingEyes`, `Neurooz`,
   `Coldtrace`. This is what appears in the README title and BRAND.md.
4. **Directory and repo slug are lowercase, no separators where natural.**
   `growlingeyes/`, `neurooz/`, `coldtrace/`. Use a hyphen only when the
   lowercase run is unreadable.
5. **Domain matches the lowercase slug.** `growlingeyes.com`, registered at
   Namecheap, recorded in BRAND.md.
6. **Pronounceable and ownable.** Must be sayable out loud in one beat and have a
   plausibly available `.com`.

**Every codename project must, before its first design session:**

- Copy `templates/brand/BRAND_IDENTITY_TEMPLATE.md` → `docs/<slug>/BRAND.md`
- Derive all visual values from `templates/brand/REVVEL_EMBLEM_STANDARD.md`
- Set: Tagline, Domain, Parent Entity (Freedom Angel Corp, EIN 86-1209156),
  and the four brand colors.

---

## 3. Descriptive slug tier

Internal tools, engines, and utilities are named for **what they do**, in plain
kebab-case. No metaphor, no brand identity required.

**Observed slugs:** `life-insurance-lead-engine`, `creator-payout-tracker`,
`screen-recorder-finder`, `ai-video-toolkit`, `graphify-evaluator`,
`prompt-generation-app`, `revvel-skill-runner`, `cli-engine`.

**Rules:**

1. **`kebab-case`, lowercase, ASCII only.** Words joined by single hyphens.
2. **`<domain>-<noun>` or `<domain>-<role>`.** Lead with the subject, end with the
   thing it is: `-engine`, `-tracker`, `-finder`, `-toolkit`, `-runner`,
   `-evaluator`, `-app`, `-saas`, `-cli`.
3. **No version numbers or dates in the name.** `life-insurance-lead-engine`, not
   `life-insurance-lead-engine-v2`.
4. **Reserve `revvel-` prefix** for first-party platform pieces
   (`revvel-skill-runner`, `revvel-rosette-automation`).
5. **Lives in `products/<slug>/`** unless it is core platform plumbing.

---

## 4. Edge cases and exceptions

- **`penny-sovereign-yield-scout`** is a codename written in slug form. Allowed,
  but new codenames should prefer the tighter `Coldtrace`/`Neurooz` shape.
- **Suffix variants** (`life-insurance-lead-engine` vs `life-insurance-lead-saas`)
  are fine when two real surfaces ship from one domain — keep the shared stem and
  vary only the trailing role word.
- **Agent personas** (e.g. `devina-imposter`, `oaudrey`) follow the codename
  rules but live under `projects/` rather than top-level.

---

## 5. Decision checklist

```text
Is it market-facing with its own domain?
├─ Yes → Codename tier
│        ├─ Coin/fuse an evocative name (PascalCase display, lowercase slug)
│        ├─ Confirm .com is plausible
│        └─ Create docs/<slug>/BRAND.md from the template
└─ No  → Descriptive slug tier
         ├─ kebab-case <domain>-<role>
         ├─ Pick a role suffix (-engine/-tracker/-finder/-app/...)
         └─ Place in products/<slug>/
```

---

*Related: `templates/brand/BRAND_IDENTITY_TEMPLATE.md`,
`templates/brand/REVVEL_EMBLEM_STANDARD.md`, `standards/PROJECT_MANAGEMENT.md`,
`docs/DEFINITION_OF_DONE.md` (one-iteration scope).*
