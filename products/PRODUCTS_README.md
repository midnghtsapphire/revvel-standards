# Revvel Products Directory

Live product portfolio targeting **$10k/month → $10M in 3 years**.

## Active Products

| Product | Port | Domain | Status | Tier |
|---------|------|--------|--------|------|
| prompt-generation-app | 3006 | promptforge.revvel.co | Shipped | $29 / $99mo / $499 |

## Local Development

```bash
cd products/<product-name>
npm install
npm run dev
### 1. High-Ticket Affiliate Hub
**Location:** `affiliate-hub/`  
**Port:** 3001  
**Description:** Interactive directory of the best high-ticket affiliate programs for 2026  
**Revenue Model:** Affiliate commissions, premium listings, lead generation  
**Status:** ✅ Production Ready

### 2. AI Video Toolkit
**Location:** `ai-video-toolkit/`  
**Port:** 3002  
**Description:** Complete resource guide for faceless YouTube automation with AI tools  
**Revenue Model:** Affiliate commissions, premium guides, consultation services  
**Status:** ✅ Production Ready

### 3. Mac Screen Recorder Finder
**Location:** `screen-recorder-finder/`  
**Port:** 3003  
**Description:** Interactive comparison tool for Mac screen recording software  
**Revenue Model:** Affiliate commissions, sponsored placements, comparison reports  
**Status:** ✅ Production Ready

### 4. Revvel PromptForge
**Location:** `prompt-generation-app/`  
**Port:** 3006  
**Description:** Research-backed prompt packet generator with source logs, competitor gaps, blue/red-ocean scoring, and code-review prompts  
**Revenue Model:** $29 prompt packets, $99/month workspace, $499 setup service  
**Status:** ✅ Production Ready

## 🛠️ Tech Stack

All products use:
- **Framework:** Next.js with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (static export)
- **UI:** Modern, responsive, dark mode support

## 🏃 Quick Start

Run all products locally:

```bash
# Install dependencies for each product
cd affiliate-hub && npm install && cd ..
cd ai-video-toolkit && npm install && cd ..
cd screen-recorder-finder && npm install && cd ..
cd prompt-generation-app && npm install && cd ..

# Run development servers (in separate terminals)
cd affiliate-hub && npm run dev &       # Port 3001
cd ai-video-toolkit && npm run dev &    # Port 3002
cd screen-recorder-finder && npm run dev &  # Port 3003
cd prompt-generation-app && npm run dev &   # Port 3006
```

## Testing

From repo root:

```bash
npm test
```

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md).

- `awesome-grok-build` — Grok Build skill browser & install planner (port 3012)
