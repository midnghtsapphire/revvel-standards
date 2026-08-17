# Go-to-Market — Revvel Personal Assistant

## Market Opportunity

| Metric | Value | Confidence / source |
| --- | --- | --- |
| Knowledge-worker time lost to context switching | High (multi-inbox norm) | medium — industry surveys; treat as directional |
| Open-source agent framework interest (CrewAI, LangGraph, n8n) | Strong GitHub / blog momentum through 2025–2026 | medium — [Firecrawl agent frameworks roundup](https://www.firecrawl.dev/blog/best-open-source-agent-frameworks), [Dev.to 2026 frameworks](https://dev.to/thedailyagent/top-7-ai-agent-frameworks-for-developers-in-2026-3o63) |
| MCP connector ecosystem | Growing official servers (Drive, Gmail, GitHub) | high — [modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers) |
| Consumer “second brain” willingness to pay | Proven by Notion AI / Mem / Reflect tiers | medium — category comps |

**Gap:** Chatbots do not safely bridge multi-provider email + SMS + direct GitHub structure planning out of the box. This product sells that bridge as a focused SaaS.

## Positioning

**Tagline:** _Your messy inboxes, one GitHub-shaped second brain._

**Audience:** Indie hackers, operator-founders, and small teams who already commit knowledge to git and juggle Gmail/Outlook/Keep/SMS.

**Differentiator:** Offline-first multi-agent structuring with mandatory PII redaction and exportable commit plans — not another chat UI.

## Pricing

| Tier | Price | Features |
| --- | --- | --- |
| Free | $0 | Paste ingest, sample corpus, redaction, local plan, Markdown/CSV export |
| Assistant Pro | $19/mo | Higher volume, saved projects, webhook → GitHub App commits |
| Team | $79/mo | Shared repos, role gates, connector workers (Gmail/Drive/Outlook) |
| Enterprise | custom | VPC / MCP gateway, retention controls, SSO |

**Target:** 250 Pro seats by month 12 ≈ $4.7k MRR (directional).

## Launch Sequence

1. Ship playground in `products/personal-assistant` (this PR)
2. Polar product + `NEXT_PUBLIC_POLAR_CHECKOUT_URL`
3. Content: “inbox → git folder structure” SEO posts using keywords in README
4. n8n template that POSTs exports to `/api/plan`
5. Optional MCP connector pack once OAuth secrets are provisioned

## SEO / Marketing Keywords

- personal assistant github
- multi agent inbox to repo
- gmail keep drive to markdown
- pii redaction personal knowledge base
- crewai langgraph n8n personal data pipeline
- structure emails into git folders

## Monetization Path

Polar.sh checkout on the Free → Pro upgrade CTA, with GitHub-native distribution inside the revvel-standards monorepo and future standalone product repo if demand warrants.
