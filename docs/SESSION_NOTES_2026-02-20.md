# Session Notes — February 20, 2026

## Purpose
This document captures EVERY detail Revvel shared during this session so nothing is lost.
Push to GitHub (MIDNGHTSAPPHIRE/revvel-standards) immediately.

---

## App-Specific Details Shared This Session

### GodsofInsurance
- **Original design**: Zeus sitting in an ornate chair as splash screen — powerful, godly, really cool and ornate
- **Theme**: Greek mythology, NOT cherry blossoms (that's Anime Ascend)
- **Primary purpose**: Insurance LEAD GENERATION for life insurance
- **Agent-focused**: Had extensive features to keep insurance agents positive and motivated in a brutal industry
- **User spent ~100 hours** building this app — it was very detailed
- **Lead gen innovation**: Insurance leads cost $40-$150 each and get sold to 5+ agents — total monopoly/racket
- **Blue Ocean**: Scrape PUBLIC RECORDS for life events that trigger insurance needs:
  - Marriage licenses (public record in every county)
  - New home purchases (county recorder)
  - New business filings
  - Birth announcements
  - New driver's licenses
- **Newlyweds** are the perfect target — just married, need life insurance, homeowners, auto updates, beneficiary changes
- **Philosophy**: Cut out the middleman — agents pay a fraction for exclusive, fresh leads nobody else has
- **AI phone answering**: "Insurance of the gods — phone answering everything"
- **Original repo**: Was on Replit as InsuranceLeadPro (@angelreporters/InsuranceLeadPro)
- **FOSS-first**: Use as much free software as possible, combine multiple FOSS tools to match paid competitors. Only pay for APIs that accelerate, then build our own better version.

### Anime Ascend Wellness
- **Original design**: White background, cherry blossom branches, Asian-themed, chibi mascot, dainty and subtle Japanese minimalism
- **NOT blue, NOT corporate**
- **Primary purpose**: HEALTH MONITORING (not just a habit tracker)
  - Heart arrhythmia detection via phone sensors (camera + flash for PPG/photoplethysmography)
  - Stress detection via biometric signals
  - Fall detection (accelerometer/gyroscope) — especially for sick/elderly users
  - Guided exercises that STAY WITH YOU through the session (companion mode)
  - Emergency alerts if fall detected or vitals concerning
- **Secondary features**: Habits, journaling, meditation, goals (these are fine but NOT the primary purpose)
- **One of Revvel's favorite apps** — took hours to build
- **STATUS**: v2.0 COMPLETE — pushed to GitHub, on hub, 21/21 tests passing

### PawSitting
- **Reese's business** (Revvel's daughter) — real local pet sitting business
- **Service area**: Wellington, Fort Collins, Loveland (NoCo), Evans, Timnath, Berthoud, and ALL surrounding Northern Colorado areas
- **NOT just dogs/cats**: Reese watches horses, goats, peacocks, and all kinds of animals
- **Farm & Ranch tier**: Premium service for large/exotic animal care — this is the Blue Ocean differentiator
- **Branding**: Family has a pasture with animals, wants a metal plaque with business name on the fence
- **Logo should feel like**: Could work on a ranch gate plaque — sturdy, professional, but modern (rustic-modern)
- **Reese likes PURPLE** — incorporate into color palette
- **SEO targets**: All NoCo cities + animal-specific searches (horse sitting, livestock care, etc.)
- **AI assistants**: Text/chat assistant + AI phone answering for when Reese is at school
- **Blue Ocean**: No other pet sitting app handles livestock and exotic animals

### Rentable (rent-anything-hub)
- **Personality**: "Rent the Unrentable" — fun, quirky (emotional support goats, haunted mirrors, astronaut suits)
- **Keep as separate app** from rentiverse-finds-it-all-30 — multiple versions for different audiences is intentional
- **Existing features to preserve**: WeirdVault, CO2 tracking, Fair Value gauge, barter system, emergency mode

### Sips (StarbucksSecretSips / secret-sip-feed)
- **Existing features to preserve**: Image recipe extraction, social media extraction, categories, favorites, admin controls
- **Rewrite way better** but keep core functionality

### Email Organizer (revvel-email-organizer)
- **300,000 emails** to test against — ultimate stress test for the app
- **Purpose**: Organize, unsubscribe, delete, create smart folders
- **Folder style**: Fixer-style naming with colons (e.g., "Category:Subcategory")
- **Testing plan**: Use the massive email dataset to establish the best filter rules
- **If there are timeouts or issues, figure them out** — that's the point of testing with real data
- **Drive app is done** but email app needs testing
- **Gmail**: <angelreporters@gmail.com>

### TimelineTracker
- **Created during COVID** when Revvel was going through a hard time
- **Original purpose**: Court documentation — court filings, posts to mayor's site, evidence, all organized chronologically
- **Product vision**: Could be for everyone — imagine pulling together every post grandparents ever made on Ancestry, every document, every public record into one timeline
- **Use cases**: Legal cases, family history, estate planning, ancestry research, digital life archive
- **Status**: Empty on GitHub, original code likely on Replit (@angelreporters/TimelineTracker)
- **Replit access**: Subscription lapsed, may need to pay to access repos. Unlike Lovable, Replit may lock you out.

---

## Universal Philosophy (ALL Apps)

### AI-for-Good Movement
- Every app showcases AI as a force for GOOD — empowering real people, not replacing them
- Public turning negative on AI due to billionaire tech bro narratives
- Musk saying robots replace doctors in 2 years — tone deaf, doesn't know how regular people live
- "My dad won't even use his credit card on the internet. He's not letting robots do surgery."
- The only ones trying to use AI for bad are HUMAN BEINGS — AI itself knows when something's out of whack
- Every app should have an About/Mission page communicating this philosophy
- "AI that works FOR you, built BY real people"
- AI assistants aren't taking jobs — they give small entrepreneurs 24/7 service that billion-dollar companies have
- This is a MOVEMENT, not just a product line

### FOSS-First Philosophy
- Use as much free/open-source software as possible
- Combine multiple FOSS tools to be as robust as top paid competitors
- Only pay for APIs that move us fast ahead
- Then build our own better version of any paid API we use
- Don't mind paying for APIs that accelerate, but prefer to eventually replace them

### Blue Ocean in EVERY App
- Every single app must have a cutting-edge differentiator
- People should immediately see it provides stuff other apps don't
- Research topics independently, come back with ideas WITHOUT user input
- Document ALL Blue Ocean findings — they won't be remembered tomorrow

### Documentation is NON-NEGOTIABLE
- If it's not documented, it doesn't exist
- No one will buy an app without documentation
- Everything must be on GitHub — sandbox is not persistent
- Previous sessions claimed to document but didn't — that's unacceptable
- Specs, blueprints, data schemas, patent disclosures = real money value
- Research findings must be documented and pushed to GitHub

### AI Assistants (Standard Module)
- Text/Chat AI assistant in every app
- AI Phone Answering assistant in every app
- Google Voice for free local business number
- FOSS stack: Vocode, Piper TTS, Whisper STT

### Stop Wasting Tokens
- User has carpal tunnel — minimize typing
- User has been repeating the same information across sessions — that's a waste of tokens they're paying for
- READ the standards docs, READ the existing code, READ the session notes
- Don't ask questions that are already answered in documentation
- Don't build on assumptions — read first, then build

---

## Zip Files / Lost Projects
- Previous session said they put all zip files from LLM sessions into GitHub
- User saw "weird entries that weren't really what they were"
- Need to audit GitHub for these and verify they're correct
- Some projects only existed in LLM sessions (Replit, Lovable, etc.)
- Replit subscription lapsed — may need to pay to recover projects there
- Lovable doesn't require payment to access projects

---

## Active Builds This Session
1. GodsofInsurance — Zeus theme, lead gen, agent support (team bZnQNKFMd4I8cU3NxVMfRq)
2. Anime Ascend Wellness — COMPLETE, pushed to GitHub (team JsHzs0g1TzjJRDJjNSTy4U)
3. PawSitting — Reese's NoCo pet sitting (team FwA5Cys3bPyVAiBX41rNGx)
4. Rentable — rent-anything-hub rewrite (team Z3KvI5JtHVn4KpQc0ILLSG)
5. Sips — StarbucksSecretSips rewrite (team n54OUrG22wg2GqmKcLT9rR)
6. Spec Documentation — all 102 repos (team jaUZVexsoGxLB5ZUmkr8D1)
7. Auto-Deploy Pipeline — COMPLETE from previous session (team yAcYEfS2Yskj6cRFKqERhA)
