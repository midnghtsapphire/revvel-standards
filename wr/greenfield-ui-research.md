# WR #16931 — Greenfield UI Research & Integration Report

**Status:** complete  
**Issue:** [#16931](https://github.com/midnghtsapphire/revvel-standards/issues/16931)  
**Source repo:** [rgn/greenfield-ui](https://github.com/rgn/greenfield-ui)  
**Deliverable product:** [`products/greenfield-ui-lab`](../products/greenfield-ui-lab/)  
**Research date:** 2026-08-08  
**Output type:** production-app (research + modernized lab app)

---

## Executive summary

`rgn/greenfield-ui` is a **2018 Hyperledger Composer demo front-end** (Angular 5 + Angular Material + Bootstrap 3 + ng2-dnd). It implements an **idea marketplace** with:

- Kanban columns by idea state (`FRESH` → `INWORK` → `FINISHED`)
- Participant CRUD (`Person`)
- Asset CRUD (`Idea`, `PersonalWallet`)
- Social signals (like / follow)
- A **"days" wallet** used as effort currency (donate days to ideas)

It is **not a reusable modern design system**. Stars: **0**. Last push: **2018-01-28**. License: **Apache-2.0** (declared in `package.json`). Hyperledger Composer itself is **deprecated/archived** ([hyperledger-archives/composer](https://github.com/hyperledger-archives/composer), ~1.6k stars, archived).

**Recommendation:** do **not** vendor or port the Angular/Composer stack into revvel-standards. **Extract the domain UX patterns** (state board, day-wallet allocation, idea cards with adapters/likes/followers) and rebuild them as a Next.js App Router product that matches monorepo conventions. That rebuild ships as `products/greenfield-ui-lab` on port **3012**.

---

## 1. Source repository audit

| Field | Value | Source |
| --- | --- | --- |
| Full name | `rgn/greenfield-ui` | [GitHub API](https://api.github.com/repos/rgn/greenfield-ui) |
| Stars | **0** | GitHub API `stargazers_count` |
| Forks | 0 | GitHub API |
| Language | TypeScript | GitHub API |
| Default branch | `master` | GitHub API |
| Created | 2018-01-22 | GitHub API |
| Last push | 2018-01-28 | GitHub API |
| Size | ~40 KB | GitHub API |
| License file | none at root; `package.json` says `Apache-2.0` | [package.json](https://raw.githubusercontent.com/rgn/greenfield-ui/master/package.json) |
| Description / topics | empty | GitHub API |
| npm package | **not published** (private: true) | package.json |
| Author | Ralf Gnädinger (Trivadis) | package.json |

### 1.1 Tech stack (as of last commit)

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Angular 5.2.x + Angular CLI ~1.x | EOL long ago |
| UI kits | `@angular/material` 5.x + Bootstrap 3.3.7 + jQuery | Mixed design systems |
| Layout | `@angular/flex-layout` beta | Legacy |
| DnD | `ng2-dnd` | Board drop zones |
| Backend client | `composer-client` + `composer-rest-server` (`latest`) | Hyperledger Composer REST |
| i18n | XLF messages (en/fr stubs) | Minimal |
| Tests | Karma/Jasmine unit + Protractor e2e | Many empty specs |

Citations:

- README (Angular CLI scaffold): <https://raw.githubusercontent.com/rgn/greenfield-ui/master/README.md>
- package.json: <https://raw.githubusercontent.com/rgn/greenfield-ui/master/package.json>
- App module: <https://raw.githubusercontent.com/rgn/greenfield-ui/master/src/app/app.module.ts>
- Domain model: <https://raw.githubusercontent.com/rgn/greenfield-ui/master/src/app/com.trivadis.greenfield.ts>

### 1.2 Architecture map

```text
Browser (Angular SPA :4200)
  ├─ mat-toolbar nav: Home / Dashboard / Person / Idea / Wallet
  ├─ Board + Card (kanban columns via ideaStateFilter pipe)
  ├─ CRUD forms for Idea / Person / PersonalWallet
  └─ DataService<T> → HTTP JSON → composer-rest-server :3000 /api/*
         └─ Hyperledger Fabric network (greenfield-network card)
```

Routes (`app-routing.module.ts`):

| Path | Component | Role |
| --- | --- | --- |
| `/` | Home | Landing |
| `/dashboard` | Dashboard | Board of all ideas filtered by state |
| `/person` | Person | Participant CRUD |
| `/idea` | Idea | Asset CRUD |
| `/wallet` | PersonalWallet | Days balance CRUD |

### 1.3 Domain model (reusable concept layer)

From `com.trivadis.greenfield.ts`:

| Concept | Type | Fields / behavior |
| --- | --- | --- |
| `IdeaState` | enum | `FRESH`, `INWORK`, `FINISHED` |
| `Idea` | Asset | id, description, days, state, owner, adapter[], likedBy[], followedBy[] |
| `PersonalWallet` | Asset | walletId, days, owner |
| `Person` | Participant | personId, firstName, lastName |
| Transactions | — | `IdeaDonateDays`, `IdeaLike`, `IdeaFollow`, `IdeaStateChange`, wallet release/revoke |
| Events | — | donation success/fail, liked/followed, state change |

**Product insight:** the interesting IP is not the Angular code — it is the **effort-currency + idea-lifecycle board** pattern. That maps cleanly onto revvel-standards WR triage, agent day allocation, and research idea funnels.

### 1.4 UI patterns observed

1. **Toolbar + nested menus** for Participants vs Assets (Material toolbar).
2. **Kanban board columns** (`BoardComponent`) with droppable body and filtered idea lists.
3. **Draggable cards** showing description, owner tooltip, chips for adapters / days / followers / likes.
4. **Generated-looking CRUD forms** (Hyperledger Composer Yeoman style) — heavy, not reusable as design tokens.
5. **Generic `DataService<T>`** REST wrapper (getAll/getSingle/add/update/delete) with `?resolve=true`.
6. **Hard-coded API base** `http://localhost:3000/api/` in `configuration.ts`.
7. **Pipes:** `ideaStateFilter`, `count`, `ifEmpty`.

### 1.5 Compatibility assessment vs revvel-standards

| Dimension | greenfield-ui | revvel-standards products | Conflict? |
| --- | --- | --- | --- |
| Framework | Angular 5 SPA | Next.js App Router + React 19 | **Hard conflict** — do not mix in one product |
| Styling | Material indigo-pink + Bootstrap 3 | Tailwind v4 utility CSS | **Hard conflict** |
| Backend | Hyperledger Composer REST | Stateless calculators / OpenRouter / Polar | **Hard conflict** (Composer EOL) |
| Package manager | npm private app | per-product `package.json` under `products/` | Compatible if rebuilt |
| License | Apache-2.0 | MIT root LICENSE | Compatible for pattern reuse; do not copy large generated HTML without attribution |
| Tests | Karma/Protractor | `node:assert` / tsx / product scripts | Rebuild tests |
| Deploy | `ng serve` + composer-rest-server | Vercel / static export paths | Rebuild |

**Conclusion:** treat greenfield-ui as a **reference prototype**, not a dependency.

---

## 2. Indexed-web research — design systems & monorepo UI incorporation

### 2.1 What indexed-web teams do when adopting external UI kits

| Approach | When to use | Fit for revvel-standards | Citations |
| --- | --- | --- | --- |
| **Copy-in components (shadcn model)** | Need ownership + Tailwind tokens | **Best default** for multi-product monorepo | [shadcn monorepo docs](https://ui.shadcn.com/docs/monorepo) |
| **Shared `packages/ui` workspace** | Many apps, one brand | Future extraction once ≥3 apps share primitives | [shadcn monorepo](https://ui.shadcn.com/docs/monorepo), [component architecture guide](https://paulserban.eu/blog/post/shadcnui-component-architecture-building-scalable-design-systems-in-nextjs/) |
| **npm library dependency** | Stable external design system | Only if actively maintained | Industry default |
| **iframe / micro-frontend** | Isolate legacy Angular | Overkill here (source is tiny + dead stack) | — |
| **Full rewrite of UX patterns** | Legacy demo, good domain | **Chosen path for greenfield-ui** | This report |

### 2.2 Reference ecosystems (stars snapshot, 2026-08-08)

| Project | Role | Stars (approx.) | Source |
| --- | --- | --- | --- |
| shadcn/ui | Copy-paste Radix+Tailwind components | **~120,788** | <https://github.com/shadcn-ui/ui> |
| Tailwind CSS | Utility styling / tokens | **~97,100** | <https://github.com/tailwindlabs/tailwindcss> |
| Radix Primitives | Accessible headless primitives | **~19,147** | <https://github.com/radix-ui/primitives> |
| Hyperledger Composer | Legacy BaaS tooling (EOL) | **~1,610** (archived) | <https://github.com/hyperledger-archives/composer> |
| rgn/greenfield-ui | Source under review | **0** | <https://github.com/rgn/greenfield-ui> |

### 2.3 Best practices distilled for revvel-standards

1. **Do not vendor dead stacks.** Composer is archived; Angular 5 has no security path.
2. **Own the UI code** (shadcn-style) so products keep shipping without upstream lock-in ([Vercel Academy shadcn path](https://vercel.com/academy/shadcn-ui)).
3. **Centralize design tokens** (CSS variables + Tailwind `@theme`) rather than Bootstrap/Material dual themes.
4. **Separate domain logic from presentation** — pure TS modules under `app/data/` with unit tests (existing product pattern: `red-light-therapy-dosage-calculator`).
5. **Compose boards from cards + filters** — the greenfield `ideaStateFilter` pipe becomes a pure `filterIdeasByState()` function.
6. **Prefer local-first demos** for research lab apps; optional API adapters later (mirrors original `DataService` without Composer).
7. **Document port + Vercel path** in product README (repo deployment standard).
8. **Monetize the modernized pattern**, not the archive clone (see §4).

### 2.4 How other projects incorporate similar board UIs

| Pattern | Examples / notes | Transferable idea |
| --- | --- | --- |
| Kanban columns by status | Trello-like boards, Linear triage, GitHub Projects | Map `FRESH/INWORK/FINISHED` → WR lifecycle labels |
| Effort tokens / story points | Jira story points, Harvest retainers | Greenfield "days" wallet = capacity planning |
| Social proof on cards | likes/followers on ideas | Stakeholder interest signals on research WRs |
| REST resource namespaces | Composer `/api/Idea` style | Future OpenAPI for idea store |

---

## 3. Integration recommendations for revvel-standards

### 3.1 Recommended pathway (implemented)

| Step | Action | Status |
| --- | --- | --- |
| 1 | Document audit + risks (this file) | Done |
| 2 | Encode domain pure functions (states, donate days, like/follow, filters) | `products/greenfield-ui-lab/app/data/greenfield.ts` |
| 3 | Ship interactive Next.js lab (board + wallet + export) | `products/greenfield-ui-lab` |
| 4 | Tests for domain invariants | `products/greenfield-ui-lab/tests/` |
| 5 | Register port **3012** in agent docs | AGENTS.md / docs/AGENTS.md |
| 6 | Catalog entry in app registry | docs/APP_REGISTRY.md |

### 3.2 Explicit non-goals (from WR exclusions, reconciled)

WR text mixed **research-only exclusions** with **production-app expected scope**. Resolution:

- **In scope:** research report + one shippable lab app that *demonstrates* incorporation patterns (build-direct / production-app).
- **Out of scope:** forking/modifying `rgn/greenfield-ui` upstream; running Hyperledger Fabric; claiming Composer compatibility.
- **Deferred (not blockers):** shared monorepo `packages/ui` extraction; Polar checkout wiring; multi-tenant auth.

### 3.3 Architectural fit diagram

```text
revvel-standards/
  wr/greenfield-ui-research.md          ← findings (this report)
  products/greenfield-ui-lab/           ← production-app
    app/data/greenfield.ts              ← pure domain (from Composer model)
    app/page.tsx                        ← board + wallet UX (Material→Tailwind)
    tests/*.test.ts
    research/INTEGRATION.md             ← product-local copy of recommendations
    README.md                           ← run/test/deploy
```

### 3.4 Potential conflicts (detail)

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Reintroducing Angular into monorepo | High | Forbidden; React/Next only |
| Pinning `composer-*` latest | Critical (EOL + supply chain) | Do not add dependency |
| Dual Bootstrap+Material CSS | Medium | Single Tailwind token set |
| Hard-coded localhost API | Medium | Local state store + export; no silent remote |
| Apache-2.0 attribution if copying HTML | Low | We reimplemented patterns; cite source in README |

---

## 4. Market, SEO, and monetization (WR research checklist)

### 4.1 Keywords (directional; label = industry estimate / confidence)

| Keyword theme | Intent | Confidence |
| --- | --- | --- |
| idea management software | commercial | medium |
| internal innovation board | B2B | medium |
| effort allocation / capacity planning | ops | medium |
| kanban board open source | developer | high |
| design system monorepo next.js | developer | high |
| hyperledger composer migration | long-tail archive | high (niche) |

*Search volume/CPC not pulled from a paid SEO API in this run — treat as directional themes, not audited volumes (WR-4482 confidence label).*

### 4.2 How the market works today

- Innovation / idea portals (Brightidea, IdeaScale class) sell **workflow + governance**, not blockchain demos.
- Dev tools monetize **board UX** via SaaS seats or open-core.
- Design-system adoption monetizes via **faster product shipping** (revvel pipeline velocity), not component license fees when using copy-in kits.

### 4.3 Monetization path for this artifact

| Path | Price band (directional) | Notes |
| --- | --- | --- |
| Free lab / lead magnet | $0 | SEO + GitHub traffic into revvel products |
| SaaS "Idea → WR board" | $19–$49/mo | Map board to work-request intake (future) |
| Services: Composer/legacy UI modernization | project-based | Use research report as sales collateral |
| Polar.sh tip / sponsor | tips | Aligns with prime directive funding surface |

Primary near-term value: **accelerate product UI consistency** and seed an **idea/effort board** reusable across OSINT and automation products.

### 4.4 Community chatter (themes)

- Legacy Hyperledger Composer users seek **migration off Composer** (archived project warning).
- Teams reject dual Material+Bootstrap stacks as unmaintainable.
- Monorepo teams prefer **owned components + tokens** over black-box UI kits when shipping many small apps.

---

## 5. BOM (bill of materials)

| Item | Role | Cost | Rank |
| --- | --- | --- | --- |
| Next.js 15/16 | App framework | $0 OSS | Best fit (repo standard) |
| React 19 | UI runtime | $0 OSS | Required |
| Tailwind CSS v4 | Styling/tokens | $0 OSS | Best fit |
| TypeScript + tsx tests | Domain tests | $0 OSS | Required |
| Vercel | Deploy path | free hobby / paid pro | Default deploy |
| shadcn/ui (optional later) | Shared primitives | $0 OSS | Adopt when extracting `packages/ui` |
| Hyperledger Composer | Original backend | N/A EOL | **Do not use** |
| Angular Material 5 | Original UI | N/A EOL | **Do not use** |
| OpenRouter | Not required for lab | paid if used | Out of scope for v1 |
| Polar.sh | Funding CTA later | platform fees | Optional GTM |

**ROI break-even:** lab app costs only agent time; monetization is indirect (pipeline speed + optional SaaS). No paid API required to demo.

---

## 6. Definition of Done checklist

| Criterion | Evidence |
| --- | --- |
| greenfield-ui thoroughly reviewed | §1 audit + source citations |
| Indexed-web incorporation research | §2 with stars + URLs |
| Integration recommendations documented | §3 + product research doc |
| Production-app with docs + tests + deploy | `products/greenfield-ui-lab` |
| Compatibility / conflicts called out | §1.5, §3.4 |
| Marketing/SEO/monetization present | §4 |
| BOM present | §5 |

---

## 7. Learnings — what & why

- **What:** greenfield-ui is a Trivadis Hyperledger Composer **idea board** demo, not a general-purpose design system.
  **Why:** README is stock Angular CLI; domain file is `com.trivadis.greenfield`.
- **What:** Composer is archived; pinning `composer-rest-server@latest` is unsafe.
  **Why:** Hyperledger deprecated Composer; no maintained REST path.
- **What:** Valuable extract is **state board + day wallet + social chips**.
  **Why:** Maps to WR triage and capacity planning without blockchain.
- **What:** Incorporation into revvel-standards means **rewrite in Next/Tailwind**, not submodule.
  **Why:** Monorepo products are already Next.js; Angular would fork the stack.

---

## 8. Human-readable next steps (click path)

1. Open the PR for this branch and confirm files under `products/greenfield-ui-lab/` and `wr/greenfield-ui-research.md`.
2. Locally: open a terminal → `cd products/greenfield-ui-lab` → `npm install` → `npm test` → `npm run dev`.
3. Browser: go to `http://localhost:3012` → you should see three columns (Fresh / In work / Finished) and a wallet balance.
4. Click **Add idea**, move an idea between columns, donate days from the wallet, export JSON/Markdown.
5. Deploy: push to main / Vercel project root or product path; open the live URL listed in the product README once provisioned.

---

## 9. Citations index

1. <https://github.com/rgn/greenfield-ui>
2. <https://api.github.com/repos/rgn/greenfield-ui>
3. <https://raw.githubusercontent.com/rgn/greenfield-ui/master/package.json>
4. <https://raw.githubusercontent.com/rgn/greenfield-ui/master/src/app/com.trivadis.greenfield.ts>
5. <https://raw.githubusercontent.com/rgn/greenfield-ui/master/src/app/app.module.ts>
6. <https://github.com/hyperledger-archives/composer>
7. <https://ui.shadcn.com/docs/monorepo>
8. <https://github.com/shadcn-ui/ui>
9. <https://github.com/tailwindlabs/tailwindcss>
10. <https://github.com/radix-ui/primitives>
11. <https://vercel.com/academy/shadcn-ui>
12. <https://paulserban.eu/blog/post/shadcnui-component-architecture-building-scalable-design-systems-in-nextjs/>
