# UGC Review Generator

## Live Deployment

▶️ **[Open the live app & test it](https://revvel-standards.vercel.app/docs/ugc-review-generator/)**

## What It Does

This production app now supports two creative systems:

1. **Amazon UGC / HeyGen mode** — the original avatar-video workflow for product reviews.
2. **Zeely-style local lead mode** — a reverse-engineered ad system inspired by the screenshot in issue `#14627`, generating:
   - stacked overlay captions
   - a short proof-led talking-head script
   - landing-page hero copy
   - a 30-day content calendar
   - compliance checks for proof/urgency claims

The goal is to give Revvel a working UI for quickly turning one offer into publish-ready ad assets instead of leaving the request as a plan only.

## Features

- Amazon UGC visual prompt + script generator
- Local-service / real-estate lead-ad generator modeled on the screenshot workflow
- Copy-to-clipboard packet export
- 30-day content plan for reels, stories, carousels, emails, and shorts
- Affiliate module, newsletter capture, and 7 accessibility display modes

## Tech Stack

- Next.js
- React
- Tailwind CSS
- Deterministic JavaScript packet builder (`src/lib/creative-system.js`)

## Local Development

```bash
cd products/ugc-review-generator
npm install
npm run dev -- --port 3007
```

## Testing

Targeted regression:

```bash
cd /home/runner/work/revvel-standards/revvel-standards
node tests/ugc-review-generator.test.js
```

Product build:

```bash
cd /home/runner/work/revvel-standards/revvel-standards/products/ugc-review-generator
npm run build
```

## Deployment

- Root directory: `products/ugc-review-generator`
- Build command: `npm run build`
- Framework: Next.js static export

## Requirements

Includes mandatory UI modules for EXRUP methodology: Affiliate Marketing, Newsletter, and Accessibility controls.
