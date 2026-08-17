# App & Template Registry

The map of what's built, what's reusable, and when a new app should be **composed
from templates instead of built from scratch** (Lovable-style reuse).

**Why this exists:** finished apps are the most valuable thing in the repo. New
apps of a type we've already built five times should ship *fast* by reusing
proven modules — not get rebuilt (or worse, overwrite an existing one) every time.

> Pairs with: the **No-Destroy Guard** (don't overwrite finished apps) and the
> **Completeness Gate** (templates must be done-in-detail to be worth reusing).

---

## Reusable module library (proven, already shared)

These components already exist in multiple apps. **Reuse them — do not rebuild.**
A future step extracts them into a shared `templates/modules/` package; until
then, copy from the listed source app and keep the interface identical.

| Module | What it does | Used by | Source of truth |
| --- | --- | --- | --- |
| `AccessibilityControls` | Font scaling, contrast, zoom-safe a11y panel | 5 apps | `products/life-insurance-lead-engine/build/src/components` |
| `NewsletterModule` | Email capture + list signup | 5 apps | `products/life-insurance-lead-saas/build/src/components` |
| `AffiliateModule` / `AffiliateMarketing` | Affiliate links / monetization block | 5 apps | `products/life-insurance-lead-engine/build/src/components` |
| `LeadGenerator` | Lead-capture form + flow | lead-gen apps | `products/life-insurance-lead-engine/build/src/components` |
| `Dedupe` | De-duplicate captured leads | lead-gen apps | `products/life-insurance-lead-engine/build/src/components` |

---

## App catalog

`template-ready` = finished in detail (passes the Completeness Gate) and safe to
reuse. Others are candidates to either finish or refactor toward the shared modules.

| App | Type(s) | Reusable components present | Template-ready |
| --- | --- | --- | --- |
| `products/life-insurance-lead-engine` | lead-gen, insurance, SaaS | Accessibility, AffiliateMarketing, Dedupe, LeadGenerator, Newsletter | ✅ richest |
| `products/life-insurance-lead-saas` | lead-gen, insurance, SaaS | Accessibility, Affiliate, Newsletter | ✅ (restored in #13915) |
| `products/music-video-creator` | video, subscription | Accessibility, Affiliate, Newsletter | ✅ |
| `products/revvel-skill-runner` | skill/runtime, CLI | Accessibility, AffiliateMarketing, Newsletter | ✅ |
| `products/graphify-evaluator` | evaluator/affiliate | Accessibility, Affiliate, Newsletter | ✅ |
| `products/greenfield-ui-lab` | research lab / idea board | Board columns, day wallet, export | ✅ (WR #16931) |
| `products/affiliate-hub` | affiliate, lead | — | needs review |
| `products/ai-video-toolkit` | video, lead | — | needs review |
| `products/cli-engine` | subscription, SaaS, CLI/MCP | — | needs review |
| `products/creator-payout-tracker` | payout, subscription, video | — | needs review |
| `products/openmythos` | (unclassified) | — | needs review |
| `products/printbank` | digital-download, e-commerce, static | Vector print generator, photo print sizer (tested in `tests/printbank.test.js`) | needs review |
| `products/caspian-channel-console` | SaaS, agent-comms, static | Channel planner, cost estimator, one-handler simulator, code export (tested in `tests/caspian-channel-console.test.js`) | ✅ |
| `products/prompt-generation-app` | OSINT, prompt | — | needs review |
| `products/screen-recorder-finder` | utility/finder | — | needs review |
| `products/ugc-review-generator` | review/content | — | (restored in #13915) |
| `reesereviews/vine-marketplace` | review/marketplace (nested) | — | needs review |
| `mcp-servers/github-issues` | MCP server | — | needs review |
| `revvel-rosette-automation` | automation | — | needs review |

Static site surfaces (not Node apps): `coldtrace/`, `fieldwork/`, `oaudrey/`,
`osint-hub/`, `reesereviews/`, `ui/*`, root `index.html`.

---

## Type clusters & the fast-path rule

Count template-ready apps per type. When a cluster is **saturated (≥ 3
template-ready apps)**, a new app of that type takes the **fast path**.

| Type cluster | Template-ready apps | Saturated? | New app of this type → |
| --- | --- | --- | --- |
| Lead-gen / SaaS / insurance | lead-engine, lead-saas | building toward it | compose from lead-engine |
| Growth-monetized web app (a11y + newsletter + affiliate) | 5 apps | ✅ yes | **fast path** — clone closest + swap domain logic |
| Video | music-video-creator, ai-video-toolkit | near | reuse music-video-creator |
| Review / content gen | graphify, ugc-review-generator | near | reuse graphify modules |
| OSINT | prompt-generation-app (+ osint-hub) | ❌ not yet | build in detail → becomes the template |

---

## Cross-repo reuse clusters (existing apps that span repos)

Many apps live in **separate repos / Replit**, which is why "reuse the existing
one" gets ignored — agents can't see them. List them here so reuse has real
targets. Building a new app in a saturated cluster from scratch is prohibited
without owner approval.

### 🛡️ Insurance-lead cluster — **SATURATED (4 apps). REUSE, do not rebuild.**

| App | Where it lives | Reusable assets |
| --- | --- | --- |
| `life-insurance-lead-engine` | this repo | LeadGenerator, Dedupe, Newsletter, Affiliate, Accessibility (**richest — start here**) |
| `life-insurance-lead-saas` | this repo | Newsletter, Affiliate, Accessibility |
| `GodsofInsurance` (InsuranceoftheGods) | separate repo → Replit `InsuranceLeadPro` | Zeus theme, lead gen, AI phone answering, 24/7 AI agent, multi-carrier quote comparison |
| `drive-easy-insure` | separate repo | insurance app |

**Rule for any new insurance / lead-gen WR:** start from `life-insurance-lead-engine`,
pull AI-agent / quote-comparison features from `GodsofInsurance`, and only build
net-new what none of the four already have. Do **not** create a 5th from scratch.

> ⚠️ **Risk:** `docs/Walter-Evans-GitHub-Repo-Inventory.md` contains a
> `delete_repo "GodsofInsurance"` line. That would destroy the richest insurance
> repo — neutralize it before running any inventory cleanup.

### The reuse-first rule (for the coder / pipeline)

When a Work Request asks for a new app:

1. **Classify** its type and required capabilities (auth, billing, lead capture,
   newsletter, a11y, dashboard, …).
2. **Check this registry.** If a template-ready app of that type exists, or the
   needed capabilities map to library modules, **start from those** — reuse what
   fits, even if not all of it.
3. **Saturated cluster (≥3)?** Take the fast path: clone the closest
   template-ready app, keep its proven modules, replace only the domain-specific
   logic and content. Don't rebuild from scratch.
4. **Net-new type?** Build it fully (Completeness Gate) so it *becomes* the
   template for next time.
5. **Reimagining an existing app?** That needs owner approval first (propose →
   approve → build); reuse alone does not.

The result: a few apps done in full → every similar app after them ships fast.
