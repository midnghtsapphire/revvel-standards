# Team State — Persistent Handoff File
## Updated: Feb 16, 2026 16:49 MST
## PURPOSE: Every team reads this on startup, writes to it as they work
## New teams pick up exactly where the last one stopped

---

## COMPLETED ✅

### Team B — 6 Standalone Apps (DONE)
- meetaudreyevans-dashboard — LIVE at <http://147.182.211.246>
- datascope-standalone — LIVE at <http://68.183.29.25>
- marketing-automation — LIVE at <http://159.65.231.36>
- project-face-standalone — LIVE at <http://192.241.141.186>
- data-router-standalone — LIVE at <http://24.199.90.253>
- ai-benchmarking-standalone — LIVE at <http://198.211.98.52>
- All have dual-mode Stripe, Tailwind v4 fixed, pushed to GitHub

### Auto-Deploy Pipeline (DONE)
- Repo: MIDNGHTSAPPHIRE/auto-deploy-stores
- CLI tool, MCP server, Expo wrapper, credential vault, GitHub Actions
- Google Cloud service account integrated (private-gpu project)
- Waiting on: Apple Developer ($99/yr) and Google Play ($25 one-time)

### Skills Vault (DONE)
- Repo: MIDNGHTSAPPHIRE/revvel-skills-vault
- 9,691 total skills in .skill.yml format
- 58 custom + 53 OpenClaw bundled + 9,580 community
- Python manager CLI: `python3 tools/skill_manager.py search "forensics"`

---

## IN PROGRESS 🔄

### Revenue Apps Deployment — LIVE ✅
- Deployment Hub: <https://80-iv830kdszt1i912djvcqi-ae25626c.us2.manus.computer/>
- Ordain.Church: <https://8001-iv830kdszt1i912djvcqi-ae25626c.us2.manus.computer/> ✅
- Instant Certificates: <https://8002-iv830kdszt1i912djvcqi-ae25626c.us2.manus.computer/> ✅
- InTheWild: <https://3000-iv830kdszt1i912djvcqi-ae25626c.us2.manus.computer/> ✅ (fixing env vars)
- TheAltText: <https://3001-iv830kdszt1i912djvcqi-ae25626c.us2.manus.computer/> ✅
- Forensic Studio: <https://8004-iv830kdszt1i912djvcqi-ae25626c.us2.manus.computer/docs> ✅
- NOW BUILDING: Blue Ocean features for TheAltText, InTheWild, Forensic Studio

### Repo Audit — DONE ✅
- 221 repos (130 owned, 91 forks)
- 14 Blue Ocean inventions cataloged
- 111 repos flagged for deletion (cleanup script ready)
- Report: Walter-Evans-GitHub-Repo-Inventory.md
- Cleanup: Walter-Evans-GitHub-Cleanup-Script.sh

### Team C — Lovable Apps + CurlCare
- Task ID: aX7aqKJIRZBmQlF5IIPUER (status 5)
- CurlCare Premium: full build done (13 pages, admin panel, backend, DB)
- 9 existing Lovable apps being wired up
- Stripe configuration in progress

---

## CREDENTIALS & INFRASTRUCTURE

### DigitalOcean
- Droplet 1: 104.248.51.82 (revenue apps — Docker ready)
- Droplet 2: 147.182.211.246 (dashboard)
- Droplet 3: 68.183.29.25 (datascope)
- Droplet 4: 159.65.231.36 (marketing-automation)
- Droplet 5: 192.241.141.186 (project-face)
- Droplet 6: 24.199.90.253 (data-router)
- Droplet 7: 198.211.98.52 (ai-benchmarking)
- API token: env var DIGITALOCEAN_TOKEN

### Stripe
- Rising Aloha LIVE keys: saved (pk_live_ + sk_live_)
- Puce Seesaw TEST key: pk_test_ saved (need sk_test_)

### Google Cloud
- Service account: private-gpu-c7b617abaa99.json
- Project: Private GPU

### GitHub
- Account: MIDNGHTSAPPHIRE
- All repos are private

### Zenodo
- Username: Midnghtsapphire
- ORCID: 0009-0005-0663-7832
- API Token (ZENODO-EOP): vcLlx7BOdvyxmT004hTKNJClrEiBglVR6YwT2J1HmU5faKOetzzIO3Tteisd

### OpenRouter
- API Key: use env var OPENROUTER_API_KEY (already set)

### Admin Account (ALL APPS)
- Email: <angelreporters@gmail.com>
- Auto-authenticated, no password, full admin access
- DO NOT ASK FOR THESE AGAIN — THEY ARE RIGHT HERE

---

## PRIORITY ORDER
1. Web deployments (get live URLs)
2. Android APKs (sideload-ready)
3. Google Play Store ($25 one-time)
4. Apple App Store ($99/yr — waiting on funds)

## RULE #-1: EVERYTHING GOES TO GITHUB — NO EXCEPTIONS
- ALL standards, docs, API keys, credentials, configs, process docs — push to GitHub
- NOTHING stays only in the Manus sandbox
- The user is paying for GitHub — it's their permanent storage
- If anything happens to Manus, they must have everything on their own repos
- Master standards doc → MIDNGHTSAPPHIRE/revvel-standards
- Each app's configs and .env files → that app's repo
- This is non-negotiable

## RULE #-0.5: FULL DOCUMENTATION PACKAGE — EVERY PROJECT
Every project MUST have the following documentation pushed to its GitHub repo:
- Blueprint / architecture overview
- Roadmap (phases, milestones, timeline)
- Taxonomy (feature classification, module hierarchy)
- Data schema / database schema (ERD diagrams)
- Data definitions (field types, constraints, relationships)
- Kanban cards / task breakdown (what's done, in progress, backlog)
- Wireframes (UI mockups for every page/screen)
- 3D prints / visual assets (if applicable)
- Patent-ready invention disclosure (if the app contains novel inventions)
- API documentation (endpoints, request/response schemas)
- User guides and admin guides
- Deployment runbook (how to deploy, env vars, dependencies)
- All of this goes in a /docs folder in the repo
- This is for IP protection, patent filing, investor pitches, and continuity
- If it's not documented, it doesn't exist

## RULE #0: READ EXISTING CODE FIRST — ALWAYS
- BEFORE building anything, clone the existing repo and READ EVERY FILE
- Understand the user's VISION from what's already there — even rough code shows intent
- Do EXTENSIVE RESEARCH to make the app better than what exists
- INCLUDE ALL existing functionality — never drop features
- Make existing images/assets crisper/cleaner but PRESERVE them
- Build ON TOP of what's there, don't start from scratch with your own ideas
- The user's existing work is the spec — your job is to elevate it, not replace it

## MANDATORY DEPLOYMENT RULES — READ FIRST
- EVERY new app MUST be added to meetaudreyevans.com hub (MIDNGHTSAPPHIRE/Meetaudreyevans)
- Add a card with icon, name, description, status dot, and launch button
- This is the user's TESTING HUB — if it's not on meetaudreyevans.com, it doesn't exist
- EVERY app MUST have login (Google OAuth + Apple Sign-In + email/password)
- EVERY app MUST have subscription + token billing via Stripe
- NO app ships without these. Period.
- Admin account: <angelreporters@gmail.com> — auto-authenticated, no password, full admin
- Each app MUST have its OWN unique color identity — do NOT make every app the same color
- Colors must survive blue light filters (avoid pure blues, use warm tones, ambers, teals)
- Glassmorphism is the design language but palette varies per app
- NO WATERMARKS on any content or images
- NO AI metadata in published content — clean metadata only (author, ORCID, DOI, title, dates)
- No traces of AI tools in any output, exports, or publications

## STANDARD MODULES — EVERY APP MUST HAVE
- Google OAuth (Sign in with Google)
- Apple Sign-In (Sign in with Apple)
- Email/password auth with JWT
- Stripe billing (subscriptions + one-time payments)
- Customer service layer (text agent, call agent, refund, returns, cancel subscription)
- Payment failure handling (dunning emails, retry logic, grace periods)
- Universal accessibility modes (ALL 5 REQUIRED IN EVERY APP):
  - WCAG AAA compliance
  - ECO CODE mode (low energy, reduced animations, dark backgrounds)
  - NEURO CODE / Neurodivergent mode (ADHD-friendly, reduced clutter, focus mode)
  - DYSLEXIC MODE (OpenDyslexic font, increased spacing, high contrast)
  - NO BLUE LIGHT mode (warm color filter toggle, removes blue wavelengths, night-safe)
  - All modes toggleable in settings/accessibility panel
- Self-healing error recovery
- Analytics dashboard
- Token/credit economy (free tier + paid tokens for bulk usage)

## PRICING MODEL — ALL APPS (ALREADY DECIDED — DO NOT CHANGE)
- SUBSCRIPTION TIERS based on website SIZE (number of pages):
  - Small sites (1-50 pages): lowest tier
  - Medium sites (51-500 pages): mid tier
  - Large sites (501-10K pages): higher tier
  - Enterprise (10K+ pages): custom pricing
- Each tier includes X tokens/month
- TOKENS kick in AFTER subscription included amount is exceeded (overage billing)
- A site with 4 pages CANNOT be charged the same as a site with 1 million pages
- Token system is UNIVERSAL across all apps
- Use FOSS/free models where possible (BLIP, BLIP-2, etc.) to minimize per-request costs
- Alt text and all AI features must show results clearly after processing
- Users must be able to see and copy results
- IMPORTANT: Revvel is paying for OpenRouter (per-token AI costs), DigitalOcean (7 droplets),
  and Manus credits. Pricing MUST cover these real infrastructure costs + profit margin.
- The business model must be self-sustaining from day one. No charity pricing.
- Every customer must be profitable after their subscription covers infrastructure costs.
- FREEMIUM CONVERSION FLOW:
  - Give a few free tokens to start (enough to see value)
  - Auto-signup into subscription trial on first use
  - If they don't cancel, auto-charged monthly
  - Standard SaaS trial → auto-billing conversion funnel
  - This applies to ALL apps universally

## BLUE OCEAN FEATURES TO BUILD (per app)
- ALL apps: WCAG AAA, ADHD/neurodivergent mode, DYSLEXIC MODE, ECO CODE, NEURO CODE
- Ordain.church: State marriage laws, LGBTQ+ affirming, interfaith ceremony builder, QR certificates ✅ DONE
- TheAltText: E-commerce SEO, bulk processing API, Shopify/Amazon/WooCommerce integration
- In-the-wild: Micro-app generation (not just static sites), automated domain/deployment
- Forensic: Batch processing, video frame extraction, face reconstruction, PDF/HTML reports
- PawSitting: Real-time pet cam, GPS walk tracking, AI pet report cards, AI text + phone assistant
- GodsofInsurance: AI phone answering everything, 24/7 AI insurance agent, multi-carrier quote comparison
- Rentable: AI fair value engine, carbon footprint sharing economy, barter system, emergency mode
- Sips: AI drink customizer, nutrition calculator, barista ordering mode, community voting

## AI-FOR-GOOD PHILOSOPHY — EVERY APP
- Every app must showcase AI as a force for GOOD — empowering real people, not replacing them
- The public is turning negative on AI due to billionaire tech bro narratives (Musk saying robots replace doctors in 2 years, etc.)
- These people are tone deaf — they don't know how regular people live. Revvel's dad won't even use a credit card on the internet.
- Our apps are living proof that AI serves PEOPLE: helping a teenager run a business, making insurance accessible, providing accessibility for neurodivergent/disabled users, saving money
- Every app should have an About/Mission page that communicates this philosophy
- "AI that works FOR you, built BY real people" — this is the brand across the entire portfolio
- The AI assistants (text, phone) aren't taking jobs — they're giving small entrepreneurs the same 24/7 service that billion-dollar companies have
- Accessibility modes (NEURO CODE, DYSLEXIC MODE, NO BLUE LIGHT, ECO CODE) show more care for humans than anything from Silicon Valley
- This is a MOVEMENT, not just a product line — we're teaching the population how great AI can be when it's built with heart
- FOSS-first philosophy: use as much free/open-source software as possible (even combining multiple FOSS tools) to be as robust as top paid competitors
- Only pay for APIs that move us fast ahead, then build our own better version

## AI ASSISTANT MODULE — STANDARD FOR ALL APPS
- Text/Chat AI Assistant: built into every app, accessible via in-app chat + SMS
- AI Phone Answering Assistant: answers a business phone line 24/7
- Use FOSS telephony: Google Voice (free local number), Vocode, Piper TTS, Whisper STT
- FOSS-first always — only pay for APIs when FOSS can't match quality, then build our own
