# Sprint Log — Soul2Bowl

Sprint history index. Links to detailed sprint documents.

---

## Active Sprint

**Sprint 1 — Foundation** (Phase 1 of 4)  
**Status:** 🔲 Not Started — awaiting repo creation and asset delivery

---

## Sprint 1 Planning

**Goal:** Repository scaffold + core pages  
**Duration:** 2 weeks  
**Start Date:** TBD (pending repo creation)

### User Stories

| ID | Story | Acceptance Criteria | Priority |
|---|---|---|---|
| US-001 | As a customer, I can view the Soul2Bowl homepage and understand what's offered | Homepage loads with hero, services, menu preview, eco section | P0 |
| US-002 | As a customer, I can view the full menu with photos, prices, and dietary filters | Menu page displays all items; filters work; images shown | P0 |
| US-003 | As a customer, I can sign up/in with Google, Apple, or email | Clerk auth flows complete without error | P0 |
| US-004 | As a customer, I can read about the chef and her story | About page loads with bio, photo, and video embed placeholder | P1 |
| US-005 | As a developer, CI/CD pipeline deploys automatically on push to main | GitHub Actions → DigitalOcean deployment succeeds | P0 |

### Sprint 1 Backlog

- [ ] Create GitHub repo `midnghtsapphire/Soul2Bowl`
- [ ] Scaffold Next.js 14 project (App Router, TypeScript, Tailwind)
- [ ] Design system: configure glass tokens, typography, color palette
- [ ] Set up Clerk (Google, Apple, Email/Password)
- [ ] Set up PostgreSQL + Drizzle ORM (initial schema: users, menu_items)
- [ ] Build shared layout (glassmorphic nav + footer)
- [ ] Build Homepage (`/`)
- [ ] Build Menu page (`/menu`)
- [ ] Build About page skeleton (`/about`)
- [ ] Configure `.mcp.json` (web profile)
- [ ] Set up GitHub Actions workflow
- [ ] Create `.env.example`
- [ ] Create `LICENSE` file

---

## Sprint 2 Planning

**Goal:** Full ordering and commerce flow  
**Duration:** 2 weeks  
**Depends on:** Sprint 1 complete

### User Stories

| ID | Story | Acceptance Criteria | Priority |
|---|---|---|---|
| US-006 | As a customer, I can pick a date and time to order via the calendar | Calendar shows available slots; selection moves to checkout | P0 |
| US-007 | As a customer, I can pay for an order with a credit card via Stripe | Stripe Checkout completes; order stored in DB; confirmation email sent | P0 |
| US-008 | As a customer, I can subscribe to weekly Meal Prep × 7 | Stripe subscription created; weekly billing works | P0 |
| US-009 | As a customer, I can inquire about catering with a deposit | Catering form sends inquiry + deposit payment via Stripe | P0 |
| US-010 | As a customer, I can view my order history in My Account | Account page shows past orders with status | P1 |

---

## Sprint 3 Planning

**Goal:** Admin panel + blog + SEO  
**Duration:** 2 weeks  
**Depends on:** Sprint 2 complete

### User Stories

| ID | Story | Acceptance Criteria | Priority |
|---|---|---|---|
| US-011 | As an admin, I can edit any page text or image from the admin panel | CMS changes reflect live on the website within seconds | P0 |
| US-012 | As an admin, I can manage menu items (add, edit, archive, change price) | Admin CRUD on menu_items; changes reflect on Menu page | P0 |
| US-013 | As an admin, I can view all orders and update their status | Admin sees order list; can mark as confirmed, preparing, ready, completed | P0 |
| US-014 | As a visitor, I can read blog posts about food and catering | Blog loads with posts; correct SEO metadata | P1 |
| US-015 | As Google, I can crawl all pages with proper structured data | JSON-LD validates in Google Rich Results Test | P0 |

---

## Sprint 4 Planning

**Goal:** Animations, accessibility, launch  
**Duration:** 2 weeks  
**Depends on:** Sprint 3 complete + food photography + owner video

### User Stories

| ID | Story | Acceptance Criteria | Priority |
|---|---|---|---|
| US-016 | As a visitor, I see food steam animations on the hero section | Framer Motion steam particles render on hero | P1 |
| US-017 | As a screen reader user, I can fully navigate the site | WCAG 2.1 AA audit passes; alt text on all images | P0 |
| US-018 | As a customer on mobile, the site is fully usable | All pages responsive from 375px to 1440px | P0 |
| US-019 | As the owner, the site is live at soul2bowl.com | Production deploy successful; DNS resolves; SSL green | P0 |

---

## Sprint History

| Sprint | Date | Summary | Status |
|---|---|---|---|
| Sprint 1 | TBD | Foundation + core pages | 🔲 Not Started |
| Sprint 2 | TBD | Commerce + ordering | 🔲 Not Started |
| Sprint 3 | TBD | Admin + blog + SEO | 🔲 Not Started |
| Sprint 4 | TBD | Polish + launch | 🔲 Not Started |

---

## Daily Standup Template

```text
Date: YYYY-MM-DD
Yesterday: [What was completed]
Today: [What is being worked on]
Blockers: [Anything blocking progress]
```

---

## Definition of Done

A ticket is **Done** when:
1. Code is merged to `main`
2. All automated tests pass
3. Feature is visible and functional in production or staging URL
4. CHANGELOG.md is updated
5. DARE log entry created if a significant decision was made
