# Roadmap — Soul2Bowl

**Version:** 1.0.0  
**Date:** April 2026  
**Status:** Active Planning  

---

## Overview

Soul2Bowl follows the **EXRUP (Extreme Rapid Programming)** 8-phase lifecycle from the Revvel standards. The roadmap is divided into 4 release phases to ship a complete, production-ready catering and meal prep platform.

---

## Phase 1: Foundation (Sprint 1 — Week 1–2)

**Goal:** Repository scaffolded, design system live, core pages built

### Milestones
- [ ] Create GitHub repo `midnghtsapphire/Soul2Bowl`
- [ ] Scaffold Next.js 14 project with App Router
- [ ] Configure Tailwind CSS with glassmorphism design system (see `BRAND.md`)
- [ ] Set up Clerk authentication (Google, Apple, Email)
- [ ] Set up Drizzle ORM + PostgreSQL schema
- [ ] Set up `.mcp.json` (web profile from revvel-standards)
- [ ] Set up `.env.example` with all required variables
- [ ] Configure GitHub Actions CI/CD → DigitalOcean
- [ ] Build shared layout: nav, footer, glassmorphic theme
- [ ] Build Homepage (hero, about snippet, services, menu preview, eco section)
- [ ] Build Menu page (full menu with dietary filters and photos)
- [ ] Build About page (chef bio, story, video embed placeholder)

**Exit Criteria:** Homepage and Menu page live on dev/staging URL

---

## Phase 2: Core Commerce (Sprint 2 — Week 3–4)

**Goal:** Full ordering flow operational end-to-end

### Milestones
- [ ] Build Order/Calendar page (FullCalendar.js integration)
- [ ] Implement service-type booking logic (Individual, Sunday Dinner, By the Pound, Meal Prep)
- [ ] Integrate Stripe Checkout (one-time payments)
- [ ] Integrate Stripe Subscriptions (Meal Prep × 7 weekly billing)
- [ ] Order confirmation emails via Resend
- [ ] Build Account page (order history, preferences, subscription management)
- [ ] Build Catering page (inquiry form, calendar deposit booking)
- [ ] Build Contact page (form, Google Maps embed)
- [ ] Payment dunning logic (failed payment retry + notification)
- [ ] Guest checkout with email capture

**Exit Criteria:** A real customer can browse the menu, select a date, and complete checkout

---

## Phase 3: Admin + Content (Sprint 3 — Week 5–6)

**Goal:** Admin panel fully operational; blog and SEO live

### Milestones
- [ ] Build Admin Panel (`/admin`) — auth-gated to `angelreporters@gmail.com`
  - [ ] Page text and image CMS
  - [ ] Menu item manager (add, edit, price, archive, photo upload)
  - [ ] Calendar availability manager (blackout dates, slot limits)
  - [ ] Order manager (view, status update, Stripe refund)
  - [ ] Blog post editor (rich text, SEO fields)
  - [ ] Analytics dashboard (revenue, top items, orders by date)
  - [ ] Feature toggle system
  - [ ] SEO metadata editor per page
- [ ] Build Blog section (`/blog`) with category + slug routing
- [ ] Write 5 launch blog posts (SEO-targeted)
- [ ] Implement all JSON-LD schemas (FoodEstablishment, Menu, MenuItem, Article)
- [ ] `sitemap.xml` and `robots.txt` generation
- [ ] Achieve Lighthouse SEO score ≥ 90

**Exit Criteria:** Admin panel fully functional; 5 blog posts published; SEO baseline met

---

## Phase 4: Polish + Launch (Sprint 4 — Week 7–8)

**Goal:** Animations, accessibility, final QA, production launch

### Milestones
- [ ] Implement all Framer Motion animations (hero steam, card hover, page transitions, scroll reveals)
- [ ] Food photography assets integrated (all menu photos at correct specs)
- [ ] Owner video produced and embedded on About page
- [ ] Implement 5 accessibility modes (WCAG AAA, ECO CODE, NEURO CODE, DYSLEXIC MODE, NO BLUE LIGHT)
- [ ] Full WCAG 2.1 AA audit and remediation
- [ ] Mobile-first responsive QA (all breakpoints: 375px, 768px, 1024px, 1280px, 1440px)
- [ ] Performance audit — target Lighthouse Performance ≥ 85
- [ ] All images converted to WebP + compressed
- [ ] Set up Plausible analytics
- [ ] Set up Sentry error tracking
- [ ] Google Business Profile optimized
- [ ] Connect Google Search Console + submit sitemap
- [ ] Email newsletter signup connected to email list
- [ ] Meta (Instagram/Facebook) auto-posting setup
- [ ] Final RAID + DARE logs updated
- [ ] Production deploy to `soul2bowl.com`
- [ ] DNS + SSL configuration on DigitalOcean

**Exit Criteria:** `soul2bowl.com` is live, orders can be placed, admin panel works, Lighthouse ≥ 85/90

---

## Post-Launch Enhancements (Backlog)

| Feature | Priority | Notes |
|---|---|---|
| Push notifications (order ready, pickup reminder) | P1 | Via web push API |
| Loyalty/rewards points system | P2 | Gamified repeat ordering |
| Mobile app (React Native / Expo) | P2 | Per Revvel mobile standard |
| Yelp / TripAdvisor review integration | P1 | Pull testimonials automatically |
| Gift cards | P2 | Stripe gift card support |
| Referral program | P2 | Affiliate engine from Revvel standard |
| Spanish language support | P3 | i18n with `next-intl` |
| Live order tracker (SMS updates) | P2 | Twilio integration |

---

## Timeline Summary

| Phase | Week | Status |
|---|---|---|
| Phase 1: Foundation | Weeks 1–2 | 🔲 Not Started |
| Phase 2: Core Commerce | Weeks 3–4 | 🔲 Not Started |
| Phase 3: Admin + Content | Weeks 5–6 | 🔲 Not Started |
| Phase 4: Polish + Launch | Weeks 7–8 | 🔲 Not Started |
| Post-Launch (backlog) | Week 9+ | 🔲 Backlog |
