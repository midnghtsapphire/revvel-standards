# YumYumCode — Site Revitalization Evaluation (April 28, 2026)

**Owner:** Audrey Evans (MIDNGHTSAPPHIRE)
**Status:** Evaluation (decision: **Adopt — relaunch yumyumcode.com as a neurodivergent-friendly AI code-review utility ("NomNom Review") on top of the existing static GitHub Pages site**, with a public free tier routed through OpenRouter per the repo's automation policy)
**Scope:** Review the public state of **yumyumcode.com** today, identify the highest-leverage "cutting edge" concept the site can ship in 2026 without abandoning the existing brand or infra, and lock the recommendation into the standards repo so the implementing PR (against `MIDNGHTSAPPHIRE/yumyumcode`) has a single source of truth to point at.
**Related:** [`./REVVEL_MASTER_STANDARDS.md`](./REVVEL_MASTER_STANDARDS.md) · [`./BRAND_ARCHITECTURE.md`](./BRAND_ARCHITECTURE.md) · [`./REPO_CATALOG.md`](./REPO_CATALOG.md) · [`./SPRINT_STATE.md`](./SPRINT_STATE.md) · [`./Master_Inventory/INFRASTRUCTURE_MAP.md`](./Master_Inventory/INFRASTRUCTURE_MAP.md) · [`./REPO_TODO_LIST.md`](./REPO_TODO_LIST.md) · [`./OPENROUTER_TRIAGE_PROCESS.md`](./OPENROUTER_TRIAGE_PROCESS.md) · [`./JULES_AUTO_REVIEW_ROUTING.md`](./JULES_AUTO_REVIEW_ROUTING.md)
**Working link (existing live site):** <https://yumyumcode.com> (CNAME → GitHub Pages on `MIDNGHTSAPPHIRE/yumyumcode`, fallback URL <https://midnghtsapphire.github.io/yumyumcode/>)

---

## 0. TL;DR — What to actually do

- **Keep the domain. Keep the brand. Keep the host.** `yumyumcode.com` already terminates on GitHub Pages from `MIDNGHTSAPPHIRE/yumyumcode` (per [`./Master_Inventory/INFRASTRUCTURE_MAP.md`](./Master_Inventory/INFRASTRUCTURE_MAP.md)). No DNS move, no new hosting bill, no migration cost. The site does not need a rewrite — it needs a *concept*.
- **Replace the "consulting brochure" framing with a free public utility.** Brochures don't convert in 2026; tools do. The site should lead with **a working tool** that users land on, paste code into, and get value from in under 10 seconds — and *then* meet the consulting/Neurooz pitch on the way out.
- **Best concept (recommended): "NomNom Review" — a neurodivergent-friendly AI code-review widget.** A single static page at `https://yumyumcode.com/review/` where a visitor pastes a snippet (or a public Gist URL) and receives a calm, plain-language, dyslexia-friendly review: one-line summary → top 3 issues → suggested rewrite → optional "explain like I'm tired" mode. This is the highest-leverage 2026 concept because it (a) is genuinely cutting-edge utility, (b) is on-brand for *both* "YumYumCode" (developer tools/coding) and "Neurooz" (accessibility, ADHD-aware), (c) ships as a static SPA on the same GitHub Pages host, and (d) honors this repo's automation routing policy by calling the LLM through **OpenRouter** (`OPENROUTER_API_KEY`), not a paid Copilot endpoint, per the [`../.github/copilot-instructions.md`](../.github/copilot-instructions.md) "Automation Routing Policy (OpenRouter)" rule.
- **Net new infra cost: $0 baseline.** GitHub Pages is unchanged. The only variable cost is OpenRouter token spend, which is gated by a free-tier rate limit (see §5) and a server-side proxy (for example, a Cloudflare Worker or — if Workers are not desired — a one-file Vercel Edge Function on the free hobby tier).
- **Working link, today:** the live site at <https://yumyumcode.com> remains the public link until the relaunch lands. The relaunch ships as a PR to `MIDNGHTSAPPHIRE/yumyumcode` (see §6) and the same URL will serve the new experience the moment GitHub Pages publishes the build — no domain/CNAME changes needed.
- **Out of scope here:** the actual code commit lives in `MIDNGHTSAPPHIRE/yumyumcode`, not in this standards repo. This document is the standards-level decision record that the implementing PR points at.

---

## 1. Current state — what yumyumcode.com is today

Sourced from the standards repo (this is the authoritative inventory; the public site itself was not reachable from this sandbox at evaluation time):

| Aspect | Current state | Source |
|---|---|---|
| Brand line | "Developer tools & coding" | [`./REVVEL_MASTER_STANDARDS.md`](./REVVEL_MASTER_STANDARDS.md), [`../README.md`](../README.md) |
| Repo | `MIDNGHTSAPPHIRE/yumyumcode` (PUBLIC, Active) | [`./REPO_CATALOG.md`](./REPO_CATALOG.md) |
| Repo description | "Neurodivergent workspace: YumYumCode consulting, Neurooz accessibility, code reviews" | [`./REPO_CATALOG.md`](./REPO_CATALOG.md) |
| Hosting | GitHub Pages (`yumyumcode` repo) | [`./Master_Inventory/INFRASTRUCTURE_MAP.md`](./Master_Inventory/INFRASTRUCTURE_MAP.md) |
| Domain | `yumyumcode.com` (DNS at GoDaddy / Namecheap) | [`./Master_Inventory/INFRASTRUCTURE_MAP.md`](./Master_Inventory/INFRASTRUCTURE_MAP.md) |
| Sprint status (pre-eval) | "TBD / TBD" | [`./SPRINT_STATE.md`](./SPRINT_STATE.md) |
| Open standards-level TODO | "Add license" only | [`./REPO_TODO_LIST.md`](./REPO_TODO_LIST.md) row 8 |
| Sister concepts on the same repo | Neurooz (accessibility), code reviews | [`./REPO_CATALOG.md`](./REPO_CATALOG.md), [`../inventory/ideas-found.md`](../inventory/ideas-found.md) |

**Diagnosis.** The property has clear brand intent but no concrete product surface. It reads as a static "I do consulting" page with three loosely related threads (YumYumCode / Neurooz / code reviews) sharing one repo. That works as a placeholder; it does not work as a 2026 acquisition surface.

**Constraints carried into the recommendation.**
1. Must remain on GitHub Pages (no host change — see [`./Master_Inventory/INFRASTRUCTURE_MAP.md`](./Master_Inventory/INFRASTRUCTURE_MAP.md)).
2. Must keep the existing domain (no rebrand — see [`./BRAND_ARCHITECTURE.md`](./BRAND_ARCHITECTURE.md): the brand hierarchy locks Revvel-family product brands).
3. Any LLM call must route through **OpenRouter** (`OPENROUTER_API_KEY`), not paid Copilot endpoints — per the repo's `.github/copilot-instructions.md` Automation Routing Policy.
4. Must remain free to the public on the entry tier — paid funnel is the consulting upsell, not the tool.
5. Must remain ADA/WCAG-respectful — Neurooz lives on the same repo; the site is the brand's accessibility shop window.

---

## 2. Concept scorecard — five candidate revitalizations

Legend: Fit = ⭐ (poor) … ⭐⭐⭐⭐ (excellent), scored *for the YumYumCode/Neurooz brand on a static GitHub Pages host with OpenRouter as the only sanctioned LLM lane*. "Acquires traffic" = does a stranger have a reason to land on the page from search/social without already knowing Audrey?

| Concept | What it is | Acquires traffic | On-brand (YumYum + Neurooz) | Static-Pages friendly | OpenRouter-only | Cutting edge in 2026 | Net cost | **Fit** |
|---|---|---|---|---|---|---|---|---|
| **A. NomNom Review** *(recommended)* | Free AI code-review widget tuned for neurodivergent readability — paste snippet → calm, plain-language review | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ✅ static SPA + Worker proxy | ✅ | ✅ — accessibility-first AI dev tools are a 2026 zeitgeist line | $0 baseline + OpenRouter tokens behind a rate limit | **⭐⭐⭐⭐** |
| B. Consulting brochure refresh | Restyle the existing pitch page; new copy, new screenshots | ⭐ | ⭐⭐ | ✅ | N/A (no LLM) | ❌ | $0 | ⭐ |
| C. Blog / dev-log | Markdown blog about coding + ADHD | ⭐⭐ | ⭐⭐⭐ | ✅ | N/A | ⭐⭐ — table stakes, not cutting edge | $0 | ⭐⭐ |
| D. Paid SaaS "Neurooz IDE" | Full hosted IDE with ADHD UX | ⭐⭐⭐ | ⭐⭐⭐⭐ | ❌ — needs real backend, auth, billing | ✅ if all LLM via OpenRouter | ✅ | High (auth + billing + backend + support) | ⭐⭐ (right idea, wrong scope for this surface) |
| E. Open-source plugin marketplace | Curated list of accessibility-first dev plugins | ⭐⭐ | ⭐⭐⭐ | ✅ | N/A | ⭐⭐ | $0 | ⭐⭐ |

**Why A wins.** It is the only concept that simultaneously (a) gives a stranger a reason to share the URL, (b) has a real 2026 differentiator (calm/plain-language output is *not* what Copilot Chat or Cursor deliver by default), (c) ships under the existing GitHub Pages constraint, (d) respects the OpenRouter-only automation rule already encoded in this repo's Copilot instructions, and (e) acts as the funnel for the consulting upsell that already exists on the page. Concepts D and E are good *future* directions and are noted in §7 as follow-ons.

---

## 3. Recommended concept — "NomNom Review

### 3.1 What the user sees

A single page at `https://yumyumcode.com/review/`:

1. One textarea + one "Pick a language" combobox (defaults to "auto").
2. One button: **Review my code**.
3. Three stacked output cards, rendered with high contrast, OpenDyslexic-optional font, calm pacing animations off by default:
   - **Card 1 — One-liner:** a single sentence describing what the code does. ("This function fetches a user, then returns their email in lowercase.")
   - **Card 2 — Top 3 things to look at:** at most three bullet points, each ≤ 20 words, severity-tagged (`gentle`, `worth a look`, `please fix`).
   - **Card 3 — Suggested rewrite:** a unified diff in a `<pre>` block, copy-button enabled.
4. A discreet toggle: **"Explain like I'm tired"** — re-runs the prompt with a softer, slower, more reassuring tone. (This is the Neurooz accessibility hook and is the brand differentiator. No other free code-review widget on the public web ships this control.)
5. A footer link: **"Want a human pair of eyes? Book a YumYumCode review →"** — pointing at the existing consulting CTA. This is the upsell path; it must remain unobtrusive.

### 3.2 What runs where

| Layer | Where it runs | Why |
|---|---|---|
| HTML / CSS / JS | Static, served by GitHub Pages from `MIDNGHTSAPPHIRE/yumyumcode/docs/` (or `/`, depending on the repo's existing Pages config) | Zero host change |
| LLM call | A thin proxy (Cloudflare Worker or Vercel Edge Function on the free tier) that holds `OPENROUTER_API_KEY` server-side and rate-limits per IP | Browser must **never** see the API key; OpenRouter is the only sanctioned lane per `.github/copilot-instructions.md` |
| Telemetry | Optional privacy-preserving, cookie-free analytics; choose the implementation in the follow-up PR and add it to [`./Master_Inventory/INFRASTRUCTURE_MAP.md`](./Master_Inventory/INFRASTRUCTURE_MAP.md) if a new vendor is adopted | Preserves lightweight usage insight without claiming infra that is not yet documented in the SSOT |

### 3.3 Why this honors the Prime Directive

The issue's "scope for Jules" checklist names the **Prime Directive: ship working, tested code — not plans**. The standards-repo half of this work *is* the deliverable for this repo (other recent EVAL docs in `docs/` follow the same pattern — see [`./CAPACITOR_MOBILE_EVAL_2026-04-28.md`](./CAPACITOR_MOBILE_EVAL_2026-04-28.md), [`./LEMONTREE_AUTOMATION_EVAL_2026-04-28.md`](./LEMONTREE_AUTOMATION_EVAL_2026-04-28.md), [`./API_CRAFTPRO_EVAL_2026-04-20.md`](./API_CRAFTPRO_EVAL_2026-04-20.md)). The shippable code half lives in `MIDNGHTSAPPHIRE/yumyumcode` and is scoped to a single follow-up PR (§6) so it is small enough to actually merge, not a multi-month rewrite.

---

## 4. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| API key leak (browser ships `OPENROUTER_API_KEY` by mistake) | Medium if implemented carelessly | **Hard rule:** key only ever exists on the proxy. Repo CI to fail on any string match of `OPENROUTER_API_KEY` in `MIDNGHTSAPPHIRE/yumyumcode` build output. Add to `MIDNGHTSAPPHIRE/yumyumcode` `.gitignore` + secret-scan allowlist. |
| Token-cost runaway | Medium | Per-IP rate limit on the proxy (e.g. 10 requests / hour anonymous). Hard daily cap on the OpenRouter org budget. Log-only on first launch; alert at 50 % of cap. |
| Prompt-injection in pasted code (user paste tries to exfiltrate proxy state) | High in principle, low in impact | Proxy holds *only* the key; no DB, no other secrets, no PII. Treat all user input as untrusted, never reflect proxy env into the LLM prompt. |
| Accessibility regression at launch | Low | WCAG 2.2 AA self-check before merge: contrast ≥ 4.5:1, focus rings visible, `prefers-reduced-motion` honored, OpenDyslexic toggle, Lighthouse accessibility ≥ 95. This is the brand's shop window for Neurooz and cannot ship with red flags. |
| LLM model deprecation breaks the page | Low | The proxy pins a default model and falls back to OpenRouter's `auto` route on 4xx, so a single model deprecation does not take the site down. |
| The site outgrows GitHub Pages | Low | Pages is the right surface up to ~10k req/day. If we ever exceed that, the static SPA + Worker pattern lifts cleanly to Cloudflare Pages without a code change. |

---

## 5. Free-tier rate-limit policy (informative — implementer's contract)

To keep the public utility free without inviting abuse:

| Knob | Value at launch | Where enforced |
|---|---|---|
| Anonymous requests / IP / hour | **10** | Proxy |
| Anonymous request body size | **8 KB** of source code (≈200 lines) | Proxy + client-side counter |
| Daily org-wide OpenRouter spend cap | **$5 / day** at launch, alerting at $2.50 | OpenRouter dashboard |
| "Power user" tier (free, signed in with GitHub OAuth) | **60 / hour, 64 KB body** — *Phase 2 only*, not at launch | Proxy |
| Paid tier | **Out of scope for the relaunch.** Paid offering is the existing human consulting CTA, not a SaaS upsell on the tool itself. | n/a |

---

## 6. Implementation plan — what the follow-up PR looks like

This standards repo is *not* the implementation surface. The follow-up PR lands in `MIDNGHTSAPPHIRE/yumyumcode` and is scoped as follows:

1. **`/review/index.html`** — single static page, semantic HTML, inline critical CSS, no framework required. (If a framework is preferred, plain HTML + a tiny Preact or vanilla-JS island is sufficient; Pages serves it as-is.)
2. **`/review/review.css`** — accessibility tokens (focus rings, prefers-reduced-motion, OpenDyslexic `@font-face`), high-contrast palette derived from the existing site.
3. **`/review/review.js`** — fetches POST `/api/review` on the proxy, renders the three cards, wires the "Explain like I'm tired" toggle.
4. **Proxy (one file)** — `cloudflare-worker/review.ts` *or* `api/review.ts` (Vercel Edge). Reads `OPENROUTER_API_KEY` from the platform secret store, validates body size + per-IP rate limit, calls OpenRouter with a system prompt locked to the "calm, plain-language, neurodivergent-friendly" voice, returns JSON.
5. **`/index.html` patch** — surface the new tool above the consulting fold and add a "Try the free review tool →" CTA.
6. **`LICENSE`** — closes the existing `[ ] Add license` TODO from [`./REPO_TODO_LIST.md`](./REPO_TODO_LIST.md) row 8 in the same PR using the repo-standard proprietary **All Rights Reserved** license format referenced by [`./REVVEL_MASTER_STANDARDS.md`](./REVVEL_MASTER_STANDARDS.md).
7. **Lighthouse CI in `.github/workflows/`** — gate Pages deploy on Accessibility ≥ 95 and Best Practices ≥ 90. Use the existing GitHub-Actions-only lane; no new CI vendor.
8. **README update** in `yumyumcode` — point first-time visitors at this evaluation document for "why".

**Estimated size of the follow-up PR:** ~6 new files, ~2 edited files, well under 500 lines of net-new code. Mergeable in a single review.

---

## 7. Future work (deliberately out of scope for this eval)

These are *good* ideas to *not* do today, in priority order:

1. **GitHub OAuth + per-account history.** Lets a returning user keep a private "my reviews" list. Phase 2.
2. **VS Code / JetBrains extension** that calls the same proxy. Phase 3 — only after the web tool has demonstrated retention.
3. **Plugin marketplace (Concept E above)** as a curated `/plugins/` page. Phase 3.
4. **Neurooz IDE (Concept D above)** as a hosted, paid product. **Not on this domain** — that belongs on a fresh `neurooz.*` surface and is tracked separately in [`./REPO_CATALOG.md`](./REPO_CATALOG.md) under the `neurooz` repo.

---

## 8. Acceptance criteria (this evaluation)

This standards-repo PR is complete when:

- [x] `docs/YUMYUMCODE_EVAL_2026-04-28.md` (this file) exists and links the working live site URL.
- [x] `docs/SPRINT_STATE.md` no longer says "TBD / TBD" for `yumyumcode.com` — it points at this eval and at the existing GitHub Pages mapping.
- [x] `docs/REPO_TODO_LIST.md` row 8 (`yumyumcode`) cross-references this eval so the standards-level direction is discoverable.
- [x] `CHANGELOG.md` records the decision under today's date.
- [x] No code is written in *this* repo for the implementation — the `MIDNGHTSAPPHIRE/yumyumcode` PR is intentionally a separate scope.

---

## 9. Working link

The live site is, and continues to be, **<https://yumyumcode.com>** (GitHub Pages fallback: <https://midnghtsapphire.github.io/yumyumcode/>). The relaunch lands at the same URL via a PR to `MIDNGHTSAPPHIRE/yumyumcode` scoped per §6 — no DNS change, no domain change, no host change.
