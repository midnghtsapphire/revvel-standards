# SEO Audit — `veinsloop` (V.E.I.N.S. app)

**Audited repo:** `midnghtsapphire/veinsloop` (the Lovable + Vite + React + TS + Supabase app)
**Live URL audited:** `https://veinsloop.lovable.app/`
**Audited commit:** `162c999`
**Date:** 2026-07-06
**Scope:** Read-only audit. **No code was changed** — per instruction, all fixes are to be executed later by the review/agent fleet.

> **Naming note (do not combine):** This audit covers the `veinsloop` app and its
> in-repo **VINES** documentation set (`docs/vines/`). It is **separate from any
> `vines-cli`** — do not merge the two. Folder name here (`docs/loopveins/`) is the
> requested mirror location; the actual repo is `veinsloop`.

---

## 0. TL;DR verdict

The **technical SEO basics are already in place** (meta description, Open Graph, canonical, JSON-LD, `robots.txt`, `sitemap.xml`, `llms.txt`) — better than most Lovable exports. But **four things cap how well this can rank / be "recognized":**

1. **It's a client-rendered SPA** (Vite/React, no SSR/prerender) — crawlers see an empty `<div id="root">` for everything except the static `index.html` head. Most content is not in the initial HTML.
2. **The brand entity is fragmented** — "V.E.I.N.S." is expanded 4 different ways across your properties. Google can't build one clean entity.
3. **Your best marketing content is locked behind auth** (`/about`, `/healing-algorithms`), so it can never be indexed.
4. **`llms.txt` uses undefined internal labels as if they are externally verifiable terms** ("VSPR", "S-MOS") — an E‑E‑A‑T / trust risk.

Rough grade: **technical foundation B+, actual discoverability C.** The gap is content-indexability and brand consistency, not tags.

---

## 1. What's already good (keep it)

| Item | Status | Notes |
| --- | --- | --- |
| `<title>` + `meta description` | ✅ present | Description is clear and benefit-led. |
| Open Graph tags | ✅ present | `og:title`, `og:description`, `og:type`, `og:url`. |
| `canonical` | ✅ present | Points to `veinsloop.lovable.app` (see finding H4). |
| JSON-LD structured data | ✅ present | `Organization` + `WebSite` blocks. |
| `robots.txt` | ✅ present | Explicit allow for Googlebot/Bingbot/Twitterbot/facebookexternalhit + `Sitemap:` line. |
| `sitemap.xml` | ✅ present | But incomplete (see H2). |
| `llms.txt` | ✅ present | Good AI-crawler practice; correctly walls off auth-gated app. |
| `react-helmet-async` installed | ✅ available | Per-route meta is *possible* today; only partially used. |

---

## 2. Critical findings (biggest ranking blockers)

### C1 — Client-side rendering: content isn't in the HTML
**What:** The app is a Vite/React SPA. The server returns only `index.html` (static head + empty `#root`); all page content is painted by JS. Google *can* render JS but does so on a delayed, budget-limited second pass; Bing and most social/AI crawlers largely do not.
**Impact:** Only the home route's static head is reliably indexed. Marketing copy on public pages is invisible to non-JS crawlers.
**Fix (fleet):** Add **prerendering** for the public marketing routes (`/`, `/plans`, `/waitlist`, and public versions of About/Healing-Algorithms). Options, cheapest first:
- `vite-react-ssg` or `vite-plugin-prerender`/`react-snap` to emit static HTML per public route at build time.
- Or move the marketing surface to a prerendered/SSR shell (e.g. an SSG landing site) and keep the authed dashboard as the SPA.
The authed dashboard does **not** need SSR — it's correctly `noindex`-by-nature.

### C2 — Brand entity fragmentation ("V.E.I.N.S." means 4 things)
**What:** The acronym is expanded inconsistently across your own properties:
| Source | Expansion |
| --- | --- |
| `veinsloop/index.html` (OG) + `llms.txt` | **Virtual Evolution of Integrated Network Sheaves** |
| `revvel-standards/docs/VEINS_MONITOR.md` | **Vital Engine INtelligence Surveillance** |
| `revvel-standards/docs/veins/README.md` | **OpenVorce Community IntegRation Standards** |
| `veins-self-healing-engine` (repo tagline) | **V.E.I.N.S. Self-Healing Engine** (VSPR + Perplexity Brain) |

**Impact:** Search engines resolve entities by *consistent, repeated* name+description signals. Four expansions = no entity consolidation = weaker Knowledge-Graph recognition and diluted brand SERP.
**Fix (fleet):** Choose **one** canonical expansion and use it verbatim everywhere (site, READMEs, llms.txt, JSON-LD `name`/`alternateName`, social profiles). Add the others only as `alternateName` in JSON-LD if they must coexist.

### C3 — Marketing content is behind auth
**What:** `/about` and `/healing-algorithms` (the pages that actually explain the product, and that use Helmet) are inside `RequireAuth` + `RouteGate`. Public routes are only `/`, `/auth`, `/waitlist`, `/checkout/cancel`, `/plans`.
**Impact:** Your richest, keyword-dense explanatory content can never be crawled or ranked.
**Fix (fleet):** Publish **public** versions of About and Healing-Algorithms (or public marketing equivalents) outside the auth shell, and add them to the sitemap.

### C4 — `llms.txt` uses undefined internal labels as public claims
**What:** `llms.txt` describes the "**VSPR** runtime" and "**S-MOS** health formula" as if they are externally grounded mechanisms, while `revvel-standards/skills/malama/` documents those terms as non-production/internal context.
**Impact:** Publishing undefined internal labels as factual public mechanisms is an E‑E‑A‑T and trust liability — exactly what AI Overviews and reviewers penalize, and it undermines the "recognition" you want.
**Fix (fleet):** Choose one path before publishing: (a) add real, public, cited definitions for VSPR/S-MOS, or (b) reword `llms.txt`/marketing to plain pipeline language (inputs, checks, remediation, verification) without those labels. Ship only after `llms.txt` and `skills/malama` are aligned.

---

## 3. High-priority findings

### H1 — No `og:image` / `twitter:image`, but `twitter:card = summary_large_image`
Social/AI cards will render **blank**. `summary_large_image` *requires* an image.
**Fix:** Add a 1200×630 `og:image` (and `twitter:image`) — e.g. `/public/og-cover.png` — and reference an absolute URL.

### H2 — `sitemap.xml` is incomplete and lists a low-value page
Only `/` and `/auth` are listed. Missing public, indexable routes: **`/plans`, `/waitlist`** (and any future public About/Algorithms). `/auth` (a login screen) is low value and arguably should be `noindex`, not sitemap priority 0.3.
**Fix:** Add all public marketing routes; drop or `noindex` `/auth`.

### H3 — Dotted acronym fragments the primary keyword
`<title>` leads with **"V.E.I.N.S."**. Users search `veins` / `self-healing devops`, not `V.E.I.N.S.`. The dots split the token and the tagline ("Observe broadly. Heal deliberately.") carries no keyword.
**Fix:** Lead the title with the searchable brand + a keyword, e.g. `VEINS — Self-Healing DevOps Observability & Remediation`. Keep the dotted form only as `alternateName` in JSON-LD.

### H4 — Canonical / OG URLs hard-coded to the Lovable subdomain
Everything points to `veinsloop.lovable.app`. If you launch on a purchased domain (see §5), stale canonicals will split ranking signals between the subdomain and the real domain.
**Fix:** Make the base URL a build-time env var; update `canonical`, `og:url`, JSON-LD `url`, `robots.txt` Sitemap line, and `sitemap.xml` locs together on domain launch. Add a 301 from the old subdomain if possible.

---

## 4. Medium / low findings

- **M1 — README is a placeholder.** `veinsloop/README.md` is still `"TODO: Document your project here"`. The README is the #1 repo-level recognition signal on GitHub and is often indexed. Write a real, keyword-rich README (what VINES is, features, screenshots, live link). *(Repo-doc change — queue for the fleet; not code.)*
- **M2 — Helmet only on some pages.** `react-helmet-async` is used on Entry/Auth/About/HealingAlgorithms but not consistently. Give every public route a unique `title` + `description` via Helmet.
- **M3 — Internal linking.** Prerendered public pages should cross-link (Home ↔ Plans ↔ Waitlist ↔ About) so crawlers discover and pass authority.
- **L1 — `changefreq`/`priority` hints** in the sitemap are cosmetic (Google mostly ignores them); fine to keep, don't over-invest.
- **L2 — Favicon/theme** are set (good); ensure the `og:image` matches brand colors for a coherent card.

---

## 5. Domain decision — `repoheal.com` vs `veinsai.io` (from your GoDaddy cart)

| Factor | **repoheal.com** ($45.99/3yr, .com) | **veinsai.io** ($179.99/3yr, .io) |
| --- | --- | --- |
| Price | ✅ ~4× cheaper | ❌ $180 vs $46 |
| TLD trust/SEO | ✅ `.com` — highest default trust, best CTR | 🟡 `.io` fine for devtools, weaker for broad SEO |
| Keyword match to product | ✅ "repo" + "heal" = *self-healing repos*, literal | 🟡 "veins" + "ai" — metaphor, not a search term |
| Spellable from hearing it | ✅ yes | 🟡 "veinsai" mis-parses (vein-sai? vein-say?) |
| Collision risk | ✅ clean | ❌ "veins" → medical/anatomy SERPs + "venison" autocorrect |
| Brand continuity with V.E.I.N.S. | ❌ a rebrand | ✅ keeps the veins identity |

**SEO recommendation: `repoheal.com` is the stronger buy.** Cheaper, `.com`, and it *is* the keyword ("self-healing repos") — you'd rank for intent, not just brand. `veinsai.io` only wins if you're committed to the *veins* brand identity for a dev audience and are willing to fight the medical-"veins"/"venison" collision noted in the earlier naming discussion.
**Middle path:** buy **`repoheal.com`** as the primary/marketing domain (SEO + product-intent), and *optionally* hold `veinsai.io` as a brand redirect (301 → repoheal.com) if you want to protect the VEINS identity without splitting ranking signals. Don't run both as live canonical sites.
*(This is a recommendation only — no purchase made.)*

---

## 6. Fix checklist for the fleet

Ordered by ROI. Nothing here has been executed — this is the work list for the review/agent fleet.

- [ ] **C1** Prerender public routes (`vite-react-ssg`/prerender) so content is in the HTML.
- [ ] **C2** Pick ONE canonical "V.E.I.N.S." expansion; align site + all READMEs + llms.txt + JSON-LD.
- [ ] **C3** Publish public (non-auth) About / Healing-Algorithms marketing pages.
- [ ] **C4** Reword `llms.txt`/marketing to plain pipeline terms (or add cited definitions), and align with `skills/malama` before shipping.
- [ ] **H1** Add `og:image` + `twitter:image` (1200×630).
- [ ] **H2** Complete `sitemap.xml` (add `/plans`, `/waitlist`); `noindex` `/auth`.
- [ ] **H3** Rewrite `<title>` to lead with a searchable brand + keyword.
- [ ] **H4** Parameterize base URL for a clean custom-domain launch (+301 from subdomain).
- [ ] **M1** Replace the placeholder `veinsloop/README.md` with a real, keyword-rich README.
- [ ] **M2** Per-route Helmet meta on every public page.
- [ ] **M3** Cross-link the public marketing pages.
- [ ] **§5** Decide domain (recommended: `repoheal.com` primary).

### Suggested review-fleet persona routing (per `standards/REVVEL_CODE_REVIEW_FLEET.md`)
- **Product/Process** — C2, C3, H3, M1 (brand/content/scope).
- **Implementation** — C1, H1, H4, M2, M3 (build/render/meta changes).
- **Docs/Contracts** — C4, M1 (llms.txt / README accuracy).
- **Compliance** — C4 (fabricated-term / E‑E‑A‑T risk).
- **Syntax/Final Gate** — validates the sitemap/robots/JSON-LD still parse after edits.

---

*Read-only audit. No `veinsloop` code was modified; no domain was purchased. All
remediation is queued for the fleet.*
