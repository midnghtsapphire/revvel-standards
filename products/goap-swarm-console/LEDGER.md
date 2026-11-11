# LEDGER — GOAP Swarm Console

## 2026-11-11 14:20 UTC — MarketShipper — Agent-as-FTE sales deck and landing page

- **Actor:** MarketShipper (Cursor Cloud Agent, Grok 4.7)
- **Requested by:** Audrey Evans, work request #18334, routed by TriageChief
- **Role:** executed
- **Files:** `sales/deck.md` (added), `sales/slides.json` (added), `scripts/build_sales_deck.py` (changed; previous TSX scraper commented), `public/goap-agent-sales-deck.pdf` (rebuilt), `landing/` (added), `scripts/build-agent-fte-landing.mjs` (added), `deploy/app.yaml` (added), `app/agent-as-fte/page.tsx` (changed), `app/agent-as-fte/deck/page.tsx` (changed; previous slide array commented), `lib/calendly-url.js` (added), `lib/sales-deck.js` (added), `.circleci/config.yml` (changed), `.circleci/scripts/build-agent-fte.sh` (added), root `CHANGELOG.md` (changed)
- **What was done:** Wrote a 13-slide sales deck and a static landing page for agent-as-fte.revvel.co. The PDF is produced by the existing ReportLab script from the new markdown source. The landing page embeds Calendly only when `CALENDLY_URL` is an https link on calendly.com with a scheduling path. CircleCI builds both and curls the page for HTTP 200.
- **Decisions:** Case studies stay on a proof-pending slide. On 2026-11-11, GitHub Pages for this repo returned 404, affiliate-hub.revvel.co and the other product hostnames in the deploy notes did not resolve, revvel-standards.vercel.app returned 402, and oaudrey.com returned a domain-parking page. None of those is a customer deployment. No outreach was sent. The issue stays open because prospects, customers, and Stripe MRR are Audrey's call.
- **Sources:** `GOAP.md` (persona and what the planner does), `products/goap-swarm-console/lib/agent-roi.js` (the ROI formula), issue #18334, issue #18330, `oaudrey/.do/app.yaml` (the static App Platform shape)
- **Commits / PRs:** this commit on `cursor/goap-agent-fte-sales-1d53`
- **Open / handoff:** Audrey still has to supply her Calendly URL, Namecheap DNS for agent-as-fte.revvel.co, a DigitalOcean token, and approval before any outreach. A real case study waits on a live product (#18330). Next owner: Audrey Evans, then 1-Git-Triage-Chief for merge.
- **Credit note:** MarketShipper wrote the deck, the landing page, the CircleCI job, and this record. The planner, the ROI function, and the earlier 12-slide page were already in the repo (Codex, 2026-11-10) and were kept.
