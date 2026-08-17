# Context Primer — [PROJECT_NAME]

> This document orients new agents (and returning agents) to this codebase.
> Read this immediately after SYSTEM_STATE.md at the start of every session.

---

## Tech Stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Runtime | Node.js | [PLACEHOLDER] | |
| Language | TypeScript | [PLACEHOLDER] | Strict mode |
| Framework | [PLACEHOLDER] | [PLACEHOLDER] | e.g., Express, Next.js, SvelteKit |
| Database | [PLACEHOLDER] | [PLACEHOLDER] | e.g., MySQL 8, PostgreSQL 16 |
| ORM | Drizzle | [PLACEHOLDER] | |
| Auth | [PLACEHOLDER] | [PLACEHOLDER] | e.g., Clerk, custom JWT |
| Payments | Stripe | [PLACEHOLDER] | |
| Email | Resend | [PLACEHOLDER] | |
| Package manager | pnpm | [PLACEHOLDER] | |
| Testing | Vitest + Playwright | [PLACEHOLDER] | |
| CI/CD | GitHub Actions | — | See `.github/workflows/` |
| Deployment | DigitalOcean Droplet + PM2 | — | IP: [PLACEHOLDER] |

---

## Key Files and Their Purposes

| File / Directory | Purpose |
|---|---|
| `SYSTEM_STATE.md` | Current system status — read first every session |
| `src/server/index.ts` | [PLACEHOLDER — e.g., "Express server entry point"] |
| `src/db/schema.ts` | [PLACEHOLDER — e.g., "Drizzle ORM schema definitions"] |
| `src/routes/` | [PLACEHOLDER — e.g., "All API route handlers"] |
| `src/lib/` | [PLACEHOLDER — e.g., "Shared utility functions"] |
| `.env.example` | All required environment variables (no real values) |
| `drizzle.config.ts` | Drizzle ORM configuration |
| `vitest.config.ts` | Test configuration |
| `playwright.config.ts` | E2E test configuration |

---

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `user-service.ts` |
| Functions | camelCase | `getUserById()` |
| Classes | PascalCase | `UserService` |
| Database tables | snake_case | `user_profiles` |
| Environment variables | SCREAMING_SNAKE_CASE | `DATABASE_URL` |
| Git branches | `feat/`, `fix/`, `chore/` prefixes | `feat/user-auth` |
| Git commits | Conventional Commits | `feat: add user login` |

---

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| [PLACEHOLDER — e.g., "Database migrations"] | [PLACEHOLDER — e.g., "Drizzle Kit push"] | [PLACEHOLDER — reason] |
| [PLACEHOLDER] | [PLACEHOLDER] | [PLACEHOLDER] |

---

## What NOT to Do

> These are hard rules. Breaking them requires explicit approval from the repository owner.

- [ ] **Do NOT** use `any` in TypeScript — use `unknown` and narrow with type guards
- [ ] **Do NOT** commit `.env` files — use `.env.example` only
- [ ] **Do NOT** write raw SQL strings with user input — use Drizzle ORM
- [ ] **Do NOT** merge PRs that fail CI — fix CI first
- [ ] **Do NOT** deploy without a passing test suite
- [ ] **Do NOT** [PLACEHOLDER — add project-specific rules here]
