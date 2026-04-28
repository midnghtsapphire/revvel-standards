# Master Bill of Materials — All Revvel Projects

> **Note:** Run `scripts/sync-bom.sh` to regenerate this file from individual project BOMs.
> This file shows all outstanding purchases sorted by priority across all active projects.
>
> **Universal BOM List:** For the complete tooling, API, and self-healing BOM reference, see [`Universal-BOM_List/`](Universal-BOM_List/README.md).
>
> **Master Inventory:** For a full inventory of all active services, APIs, subscriptions, quota limits, and physical products across all MIDNGHTSAPPHIRE businesses, see [`_MASTER_INVENTORY.md`](_MASTER_INVENTORY.md).

**Last Regenerated:** April 14, 2026

---

## Ecosystem-Wide P0 Gaps (Universal BOM — Added April 14, 2026)

> These gaps apply across all projects and must be resolved before the autonomous agent stack is fully operational.

| Domain | Item | Provider | Est. Cost | Priority | Notes |
|---|---|---|---|---|---|
| AI/Agents | Anthropic Claude API key | Anthropic | ~$20–100/mo | P0 | Required for all autonomous agent operations |
| Error Monitoring | GlitchTip / Sentry (self-hosted) | Self-hosted on DigitalOcean | $0 | P0 | No production error tracking exists today |
| Uptime | UptimeRobot | UptimeRobot | $0 (free tier) | P0 | No uptime monitoring exists today |
| Security | Gitleaks pre-commit hook | FOSS | $0 | P0 | Prevent secrets in git history |
| Notifications | Firebase Cloud Messaging | Google | $0 | P0 | Required for all mobile app push notifications |

See [`Universal-BOM_List/API_REGISTRY_BOM.md`](Universal-BOM_List/API_REGISTRY_BOM.md) for the full API registry.

---

## Outstanding Purchases by Priority

The following items are marked ❌ "Not purchased" across all project BOMs, sorted by priority.

### P0 — Do Immediately

| Project | Item | Provider | Est. Cost | Priority | Status |
|---|---|---|---|---|---|
| Soul2bowl | DigitalOcean Spaces | Image / media CDN | DigitalOcean | $5/mo | P0 | ❌ Not yet |
| Soul2bowl | Google Cloud Console project | Google OAuth | Google | $0 | P0 | ❌ Not set up |
| Neurooz | OpenAI API (production tier) | AI/LLM features | OpenAI | Variable (~$20–100/mo) | P0 | ❌ Not set up |
| Penny Sovereign Yield Scout | Twitter/X API (Basic tier) | Signal listener — real-time tweets | X/Twitter | $100/mo | P0 | ❌ Not set up |
| Penny Sovereign Yield Scout | CoinGecko Pro API | DeFi protocol data (APY, TVL, price) | CoinGecko | $129/mo | P0 | ❌ Not set up |
| Penny Sovereign Yield Scout | Telegram Bot API | Signal listening + alert notifications | Telegram | $0 (free) | P0 | ❌ Not configured |
| Premolt | Stripe payments | Subscription billing | Stripe | Transaction % | P0 | ❌ Not set up |
| Revvel Forensic Studio | OpenAI API (GPT-4o Vision) | AI image analysis, face feature description | OpenAI | ~$20–100/mo | P0 | ❌ Not set up |
| Revvel Music Studio | Audio CDN / storage | Hosting audio files (samples, uploads) | Cloudflare R2 or AWS S3 | ~$5–20/mo | P0 | ❌ Not set up |
| Revvel Music Studio | Stripe payments | Music marketplace transactions | Stripe | Transaction % | P0 | ❌ Not set up |
| Revvel Standards | RecurseML | Autonomous PR code review — enforce standards on all contributions | RecurseML | $250/yr | P0 | ❌ 14-day trial active — decision by 2026-04-28 |
| Revvel Standards | GitHub Copilot (Individual or Business) | AI coding agent for all repos | GitHub | $10–19/mo per seat | P0 | ❌ Verify active subscription |
| The Alt Text | OpenAI API (GPT-4o Vision) | Core AI: generate alt text from images | OpenAI | ~$10–50/mo | P0 | ❌ Check usage — may need upgrade |
| The Alt Text | Domain renewal | Keep `thealttext.com` active | Namecheap | ~$15/yr | P0 | ❌ Verify renewal date |
| Universal Sar App | Mapping API | GPS/mapping for SAR operations | Google Maps Platform or Mapbox | ~$10–50/mo | P0 | ❌ Not set up |
| Universal Sar App | Push notifications | Real-time incident alerts | Firebase (free tier available) | $0–20/mo | P0 | ❌ Not set up |

### P1 — Do Soon

| Project | Item | Provider | Est. Cost | Priority | Status |
|---|---|---|---|---|---|
| Soul2bowl | Resend paid tier (if needed) | Transactional email beyond 3k/mo | Resend | $20/mo | P1 | ❌ Not yet |
| Soul2bowl | Plausible Analytics | Privacy analytics | Plausible | $9/mo | P1 | ❌ Not yet |
| Soul2bowl | Apple Developer Program | Apple Sign-In in production | Apple | $99/yr | P1 | ❌ Not purchased |
| Growlingeyes | Apple Developer Program | iOS App Store submission + TestFlight | Apple | $99/year | P1 | ❌ Not purchased |
| Growlingeyes | Google Play Developer account | Android Play Store submission | Google | $25 one-time | P1 | ❌ Not purchased |
| Penny Sovereign Yield Scout | Reddit API (free tier) | Social signal monitoring | Reddit | $0 | P1 | ❌ Not configured |
| Penny Sovereign Yield Scout | Domain registration | `pennyscout.io` or similar | Namecheap | ~$15/yr | P1 | ❌ Not purchased |
| Penny Sovereign Yield Scout | RecurseML | Autonomous PR code review + bug detection | RecurseML | $250/yr | P1 | ❌ 14-day trial active |
| Penny Sovereign Yield Scout | DigitalOcean Managed PostgreSQL | Storing yield history, signal log, compounding records | DigitalOcean | ~$15/mo | P1 | ❌ Currently using shared MySQL |
| Penny Sovereign Yield Scout | Sentry | Error monitoring for background jobs | Sentry | $0 (free tier) | P1 | ❌ Not configured |
| Penny Sovereign Yield Scout | Resend | Alert emails (impermanent loss warnings, compound reports) | Resend | $0 (free tier) | P1 | ❌ Not configured |
| Premolt | Domain registration | `premolt.com` or similar | Namecheap | ~$15/yr | P1 | ❌ Not purchased |
| Revvel Forensic Studio | Domain registration | `revvelforensics.com` or similar | Namecheap | ~$15/yr | P1 | ❌ Not purchased |
| Revvel Forensic Studio | RecurseML | Autonomous PR code review + bug detection | RecurseML | $250/yr | P1 | ❌ 14-day trial active |
| Revvel Forensic Studio | DeepAI / Replicate API | Image enhancement, face reconstruction models | Replicate or DeepAI | ~$10–50/mo | P1 | ❌ Not set up |
| Revvel Forensic Studio | Sentry Error Tracking | Production error monitoring | Sentry | $0 (free tier) | P1 | ❌ Not configured |
| Revvel Music Studio | Domain registration | `revvelmusic.com` or similar | Namecheap | ~$15/yr | P1 | ❌ Not purchased |
| The Alt Text | RecurseML | Autonomous PR code review + bug detection | RecurseML | $250/yr | P1 | ❌ 14-day trial active |
| Universal Sar App | Domain registration | `universalsar.com` or similar | Namecheap | ~$15/yr | P1 | ❌ Not purchased |
| Universal Sar App | Apple Developer Program | iOS App Store submission | Apple | $99/year | P1 | ❌ Not purchased |
| Universal Sar App | Google Play Developer account | Android Play Store submission | Google | $25 one-time | P1 | ❌ Not purchased |

### P2 — Do When Ready for Stores

| Project | Item | Provider | Est. Cost | Priority | Status |
|---|---|---|---|---|---|
| Neurooz | Apple Developer Program | iOS App Store submission | Apple | $99/year | P2 | ❌ Not purchased |
| Neurooz | Google Play Developer account | Android Play Store submission | Google | $25 one-time | P2 | ❌ Not purchased |
| Premolt | Apple Developer Program | iOS App Store submission | Apple | $99/year | P2 | ❌ Not purchased |
| Premolt | Google Play Developer account | Android Play Store submission | Google | $25 one-time | P2 | ❌ Not purchased |
| Revvel Forensic Studio | Apple Developer Program | iOS App Store submission | Apple | $99/year | P2 | ❌ Not purchased |
| Revvel Forensic Studio | Google Play Developer | Android Play Store submission | Google | $25 one-time | P2 | ❌ Not purchased |
| Revvel Music Studio | Apple Developer Program | iOS App Store submission | Apple | $99/year | P2 | ❌ Not purchased |
| Revvel Music Studio | Google Play Developer account | Android Play Store submission | Google | $25 one-time | P2 | ❌ Not purchased |
| The Alt Text | Apple Developer Program | iOS App Store submission | Apple | $99/year | P2 | ❌ Not purchased |
| The Alt Text | Google Play Developer | Android Play Store submission | Google | $25 one-time | P2 | ❌ Not purchased |

---

## Project BOM Files

- [Soul2bowl BOM](Soul2Bowl/BOM.md)
- [Growlingeyes BOM](growlingeyes/BOM.md)
- [Neurooz BOM](neurooz/BOM.md)
- [Penny Sovereign Yield Scout BOM](penny-sovereign-yield-scout/BOM.md)
- [Premolt BOM](premolt/BOM.md)
- [Revvel Forensic Studio BOM](revvel-forensic-studio/BOM.md)
- [Revvel Music Studio BOM](revvel-music-studio/BOM.md)
- [Revvel Standards BOM](revvel-standards/BOM.md)
- [The Alt Text BOM](the-alt-text/BOM.md)
- [Universal Sar App BOM](universal-sar-app/BOM.md)

---

*Auto-generated by `scripts/sync-bom.sh` — Do not edit manually.*

---

## ⚡ Universal Tool Suggestions — Evaluate for the Full Ecosystem

> This section is manually maintained. It documents researched tool recommendations across the entire MIDNGHTSAPPHIRE platform and is not overwritten by `sync-bom.sh`.

### 🤖 AI Code Quality & Autonomy

| Tool | Category | Cost | Fit | Priority |
|---|---|---|---|---|
| **RecurseML** | Autonomous bug detection + custom code standards on PRs | $250/yr | ⭐⭐⭐ All repos — catches AI-generated bugs | **P0 — 14-day trial active now** |
| **Codacy** | Static analysis, test coverage, code duplication | Free (open source) / $15/mo | ⭐⭐ Good alternative if RecurseML doesn't pan out | P1 |
| **SonarQube Cloud** | SAST, code smell detection, security hotspots | Free (public repos) / $75/mo+ | ⭐⭐ Enterprise-grade SAST for security-sensitive projects | P1 |
| **Snyk Code** | AI-powered security vulnerability scanner | Free tier / $25/mo | ⭐⭐⭐ Pairs with Snyk for dep + code scanning | P1 |
| **API CraftPro** | Auto-generates Go + Gin backend REST API (CRUD, JWT/PASETO auth, tests, CI/CD, Docker, Postman) from a SQL schema and pushes it to GitHub ([eval](API_CRAFTPRO_EVAL_2026-04-20.md)) | Free trial / paid tier | ⭐ Stack mismatch — Revvel default is Node/TypeScript, not Go; prototype-only candidate | P3 — defer |

### 🔐 Security & Secrets Management

| Tool | Category | Cost | Fit | Priority |
|---|---|---|---|---|
| **GitGuardian** | Real-time secret leak detection in commits | Free for individuals | ⭐⭐⭐ Free, instant value — detect leaked keys on push | P0 |
| **Snyk** | Dependency vulnerability scanning + fix PRs | Free tier / $25/mo | ⭐⭐⭐ Every repo with npm/pip deps | P1 |
| **Infisical** | Open-source secrets manager (HashiCorp Vault alternative) ([eval](STARRED_REPOS_EVAL_2026-04-20.md#1-infisical--application-secrets-and-configuration-management)) | Free (self-host) / $6/mo cloud | ⭐⭐⭐ Replace manual `.env` management ecosystem-wide | P1 |

### 🚀 CI/CD & Deployment Automation

| Tool | Category | Cost | Fit | Priority |
|---|---|---|---|---|
| **Railway** | One-click deploy for Node/Python with managed DBs | $5/mo hobby / $20/mo+ | ⭐ Faster to spin up than DO Droplets for rapid prototypes | P2 |
| **Render** | App hosting (alternative to DigitalOcean App Platform) | Free tier / $7/mo | ⭐ Good for small apps, simpler than DO for some use cases | P2 |
| **Doppler** | Secrets/config manager with GitHub Actions integration | Free (5 projects) / $10/mo | ⭐⭐ Simpler than Vault for env var management | P2 |
| **LieberLieber `setup-LemonTree.Automation@v6`** | GitHub Action that installs LemonTree.Automation — Windows-only CLI for diff/merge/consistency-check of Sparx Enterprise Architect UML/SysML model files ([eval](LEMONTREE_AUTOMATION_EVAL_2026-04-28.md)) | Quote-based (no public pricing) + 2× Windows runner minutes | ⭐ Wrong stack — Revvel has zero Sparx EA models; action is inert without `.eapx`/`.qea`/`.qeax` files | P3 — skip / 🗑️ Removed |

### 📊 Monitoring & Observability

| Tool | Category | Cost | Fit | Priority |
|---|---|---|---|---|
| **UptimeRobot** | Uptime pings + alerting | Free (50 monitors) | ⭐⭐⭐ Free tier is excellent — monitor all deployed apps | P0 |
| **Sentry** (free tier) | Error tracking + performance monitoring | $0 (free: 5k errors/mo) | ⭐⭐⭐ Every deployed app — already in some BOMs | P0 |
| **Plausible Analytics** | Privacy-first web analytics (GDPR-compliant, no cookies) | $9/mo | ⭐⭐⭐ Soul2Bowl, GrowlingEyes web, The Alt Text | P1 |
| **BetterStack (Logtail)** | Log aggregation + uptime monitoring | Free tier / $25/mo | ⭐⭐ Replaces multiple monitoring tools in one | P1 |

### 🧠 AI & LLM Infrastructure

| Tool | Category | Cost | Fit | Priority |
|---|---|---|---|---|
| **OpenRouter** | Multi-model LLM router (use cheapest model per task) | Pay-per-token | ⭐⭐⭐ All AI projects — already in use for some | P0 |
| **Groq** | Ultra-fast LLM inference (Llama, Mixtral) — near-free | Free tier / pay-per-token | ⭐⭐⭐ Neurooz real-time cognitive features, Penny Scout signal analysis | P1 |
| **Replicate** | Run open-source ML models (image, audio, video) | ~$0.001–0.01/call | ⭐⭐⭐ Revvel Forensic Studio, Revvel Music Studio | P1 |
| **Together.ai** | Fine-tuned LLM hosting at low cost | Pay-per-token | ⭐ Good for custom models | P2 |
| **vscode-copilot-chat-bedrock** | VS Code extension exposing AWS Bedrock models in Copilot Chat ([eval](STARRED_REPOS_EVAL_2026-04-20.md#2-vscode-copilot-chat-bedrock--aws-bedrock-models-in-copilot-chat)) | Free extension + AWS Bedrock per-token | ⭐ Duplicates OpenRouter; only useful once we have an AWS Bedrock account | P3 — defer |

### 🏢 ERP, CRM & Back-Office

| Tool | Category | Cost | Fit | Priority |
|---|---|---|---|---|
| **Odoo Community Edition** (self-hosted) | Multi-company ERP + CRM + free accounting in one database | $0 licence + shared infra | ⭐⭐⭐ Shared back office for every MIDNGHTSAPPHIRE entity (Vine House, Vine House Capital, Revvel Tech, reese-reviews) — see [`ODOO_INTEGRATION_STANDARD.md`](Master_Inventory/ODOO_INTEGRATION_STANDARD.md) | P1 |
| **OCA `account_financial_report`** | FOSS replacement for Odoo Enterprise advanced financial reports | $0 | ⭐⭐⭐ Required to stay on CE-only | P1 |
| **OCA `mis_builder`** | Consolidated KPI dashboards inside Odoo | $0 | ⭐⭐ Phase 3 rollout | P2 |
| **`revvel_odoo_bridge`** (custom addon, this org) | Revvel-owned Odoo addon: external-ID fields + inbound webhook handler | $0 | ⭐⭐⭐ Only supported Odoo ↔ Revvel integration path | P1 |

### 💳 Payments & Subscriptions

| Tool | Category | Cost | Fit | Priority |
|---|---|---|---|---|
| **Stripe** (already in stack) | Payments, subscriptions, invoicing | 2.9% + $0.30/txn | ⭐⭐⭐ All billing projects — already in BOM | P0 |
| **Paddle** | Merchant-of-record for global SaaS (handles VAT/taxes) | 5% + $0.50/txn | ⭐ Worth considering for international SaaS | P2 |
| **LemonSqueezy** | Digital product sales + subscriptions (simpler than Stripe) | 5% + $0.50/txn | ⭐ Good for info products and SaaS with low volume | P2 |

### 📧 Email & Communication

| Tool | Category | Cost | Fit | Priority |
|---|---|---|---|---|
| **Resend** (already in stack) | Transactional email | Free (3k/mo) / $20/mo | ⭐⭐⭐ All projects — already in BOM | P0 |
| **Loops** | Email marketing for SaaS (drip campaigns, onboarding) | Free (1k contacts) / $49/mo | ⭐⭐ The Alt Text SaaS onboarding, Neurooz user journeys | P1 |
| **Buttondown** | Newsletter platform for content projects | Free (100 subs) / $9/mo | ⭐ If any projects have newsletters | P2 |

### 📱 Mobile App Distribution

| Tool | Category | Cost | Fit | Priority |
|---|---|---|---|---|
| **Apple Developer Program** | iOS App Store + TestFlight | $99/year | ⭐⭐⭐ GrowlingEyes, Neurooz, Universal SAR App | P1 |
| **Google Play Developer** | Android Play Store | $25 one-time | ⭐⭐⭐ All mobile apps | P1 |
| **Expo EAS Build** | Cloud-based iOS + Android builds (no Xcode needed) | Free (30 builds/mo) / $29/mo | ⭐⭐⭐ All Expo projects | P1 |

---

## RecurseML 14-Day Trial Decision Gate

**Trial Start:** April 14, 2026  
**Trial Expires:** April 28, 2026  
**Cost if Renewed:** $250/year  
**Skill Reference:** `skills/recurse-ml/SKILL.md`

Renew if ≥ 4 of 5 criteria are met by April 28:

| Criterion | Target | Status |
|---|---|---|
| Bugs caught before merge | ≥ 5 genuine issues caught | ⬜ Pending |
| False positive rate | < 20% of comments are noise | ⬜ Pending |
| PR review time reduction | Noticeable reduction in manual review | ⬜ Pending |
| Integration reliability | 0 workflow failures due to RecurseML | ⬜ Pending |
| Custom rules effectiveness | Catching Revvel-specific patterns | ⬜ Pending |

_Update the Status column daily during the trial. Decision and rationale go in `docs/DARE_LOG.md`._

- [GrowlingEyes BOM](growlingeyes/BOM.md)
- [Neurooz BOM](neurooz/BOM.md)
- [Revvel Music Studio BOM](revvel-music-studio/BOM.md)
- [Universal SAR App BOM](universal-sar-app/BOM.md)
- [Premolt BOM](premolt/BOM.md)

---

## Universal BOM List

The **Universal BOM List** contains ecosystem-wide tooling, API, and LLM recommendations that apply to all projects:

- [Universal BOM List Overview](Universal-BOM_List/README.md)
- [Tooling & Testing BOM](Universal-BOM_List/TOOLING_AND_TESTING_BOM.md) — exhaustive FOSS + paid testing tools
- [API Registry BOM](Universal-BOM_List/API_REGISTRY_BOM.md) — all APIs needed across Revvel
- [Self-Healing BOM Template](Universal-BOM_List/SELF_HEALING_BOM_TEMPLATE.md) — copy into every project
- [LLM Recommendations](Universal-BOM_List/LLM_RECOMMENDATIONS.md) — which LLMs to use for autonomous operation
- [Folder Structure Recommendations](Universal-BOM_List/FOLDER_STRUCTURE_RECOMMENDATIONS.md) — repo improvement plan
