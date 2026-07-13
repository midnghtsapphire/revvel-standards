# Neurooz — R.A.I.D. Log

**Date:** April 6, 2026  
**Author:** MIDNGHTSAPPHIRE / GlowStarLabs  
**App:** Neurooz — AI-Powered ADHD Productivity & Financial Guardian  
**Version:** 1.0.0  

---

## Risks

| ID | Risk | Probability | Impact | Mitigation | Owner | Status |
|----|------|-------------|--------|------------|-------|--------|
| R-001 | HIPAA compliance required for cognitive health data storage | High | Critical | Engage compliance review; encrypt all health data at rest; implement audit logging | Audrey Evans | Open |
| R-002 | Plaid API rate limits or outages block financial guardian features | Medium | High | Implement exponential backoff retry; cache last-known-good data; graceful degradation UI | Dev Team | Open |
| R-003 | User cognitive data could be exploited if breached | High | Critical | End-to-end encryption; zero-knowledge architecture where possible; SOC2 compliance path | Audrey Evans | Open |
| R-004 | ADHD users may abandon app if onboarding is too complex | High | High | WoZ test onboarding flow; implement progressive disclosure; max 3-step setup | UX Lead | Open |
| R-005 | Agent handoff failures cause incomplete features in production | High | High | Implement SHIFT testing standard; mandatory behavioral validation; deploy agent model | Dev Team | Open |
| R-006 | OpenRouter API costs escalate with AI-powered features | Medium | Medium | Implement token budgeting; use free/low-cost model routing via smart-ai-router; cache responses | Dev Team | Open |
| R-007 | Competitor apps (Tiimo, Goblin Tools) launch similar financial features | Medium | Medium | Accelerate blue ocean features; focus on Oz Engine cognitive adaptation — unique differentiator | Product | Open |
| R-008 | DigitalOcean droplet single point of failure | Medium | High | Implement automated backups; document disaster recovery plan; consider DO App Platform | DevOps | Open |
| R-009 | Apple/Google app store rejection for health claims | Medium | High | Review app store guidelines; use "wellness" not "medical" language; add disclaimers | Legal | Open |
| R-010 | Biometric data (Apple Watch HR) triggers additional privacy regulations | Medium | High | Process biometric data on-device only; never store raw biometric data; GDPR Art. 9 compliance | Legal | Open |

---

## Assumptions

| ID | Assumption | Validated | Impact if Wrong | Action to Validate |
|----|------------|-----------|-----------------|-------------------|
| A-001 | Users with ADHD will pay for a combined productivity + financial app | No | Product-market fit failure | Conduct user interviews; launch beta with waitlist; track conversion rates |
| A-002 | Plaid free tier is sufficient for MVP financial features | No | Need paid Plaid plan earlier than budgeted | Test Plaid free tier limits; document actual API call volume |
| A-003 | React + TypeScript is the correct stack for this app | Yes | Major rewrite needed | Already validated — matches revvel-standards |
| A-004 | ADHD users prefer dark mode with warm colors | No | UI may cause eye strain or sensory issues | WoZ test with real ADHD users; offer multiple accessibility modes |
| A-005 | OpenRouter provides reliable multi-model routing for AI features | Partial | AI features become unreliable | Test failover cascade; implement smart-ai-router fallback |
| A-006 | One DigitalOcean droplet can handle expected traffic at launch | No | Performance issues at launch | Load test before deployment; define scaling triggers |
| A-007 | The Oz theme will resonate with target demographic (18-45 ADHD adults) | No | Theme feels juvenile or alienating | A/B test Oz theme vs. minimal theme; gather user feedback |
| A-008 | Users will trust an app with both cognitive AND financial access | No | Users compartmentalize trust; won't grant both | Offer modular onboarding — users can enable features independently |
| A-009 | CodeMagic free tier supports React Native + Expo builds | No | Need paid CI/CD for mobile | Test CodeMagic build pipeline before committing |
| A-010 | Affiliate marketing revenue can offset infrastructure costs | No | Negative unit economics | Track affiliate conversion rates from week 1 |

---

## Issues

| ID | Issue | Severity | Status | Resolution | Date Identified |
|----|-------|----------|--------|------------|-----------------|
| I-001 | No CI/CD pipeline configured | High | Open | Copy templates/cicd/ and configure for neurooz repo | 2026-04-06 |
| I-002 | No automated tests exist | High | Open | Add Vitest + Playwright test suites | 2026-04-06 |
| I-003 | No CHANGELOG.md in repo | Medium | Open | Create and configure auto-update via GH Actions | 2026-04-06 |
| I-004 | No branch protection rules enabled | High | Open | Enable via GitHub API; enforce PR-based merges | 2026-04-06 |
| I-005 | Missing Schema.org JSON-LD markup | Medium | Open | Add Freedom Angel Corp parent org + Neurooz app schema | 2026-04-06 |
| I-006 | No privacy policy or terms of service | High | Open | Draft privacy policy covering cognitive + financial data | 2026-04-06 |
| I-007 | 6 open GitHub issues unresolved | Medium | Open | Triage and prioritize in sprint backlog | 2026-04-06 |
| I-008 | No deploy script or deployment documentation | High | Open | Create deploy.sh and DEPLOYMENT.md | 2026-04-06 |
| I-009 | No accessibility modes implemented beyond ADHD mode | Medium | Open | Implement all 7 mandatory accessibility modes | 2026-04-06 |
| I-010 | App not listed in INFRASTRUCTURE_MAP.md | Medium | Open | Add Neurooz entry to master infrastructure map | 2026-04-06 |

---

## Dependencies

| ID | Dependency | Type | Status | Impact if Unavailable | Mitigation |
|----|------------|------|--------|----------------------|------------|
| D-001 | Plaid API | External | Active | Financial guardian features disabled | Cache data; graceful degradation; manual entry fallback |
| D-002 | OpenRouter API | External | Active | AI cognitive features disabled | smart-ai-router with multi-model fallback |
| D-003 | Stripe API | External | Not Configured | No subscription billing | Block: must configure before launch |
| D-004 | DigitalOcean Droplet | Infrastructure | Not Provisioned | No deployment target | Provision droplet; configure Nginx + PM2 |
| D-005 | Clerk or JWT Auth | Internal | Not Implemented | No user authentication | Block: must implement before launch |
| D-006 | Apple Watch HealthKit | External/Optional | Not Implemented | No biometric focus detection | Feature can launch without this; add in v2 |
| D-007 | React Native + Expo | Internal | Not Started | No mobile app | Web-first launch; mobile in Phase 2 |
| D-008 | Drizzle ORM + PostgreSQL | Internal | TBD | No data persistence | Block: must verify/implement before launch |
| D-009 | revvel-standards templates | Internal | Available | Manual CI/CD setup | Templates ready in templates/cicd/ |
| D-010 | Freedom Angel Corp entity docs | Legal | Available | No SEO authority inheritance | Schema.org templates ready in ENTITY_HIERARCHY.md |

---

**Review Cadence:** This RAID log must be reviewed and updated at the start of every sprint.
