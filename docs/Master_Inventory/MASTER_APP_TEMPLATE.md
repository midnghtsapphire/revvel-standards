# Revvel Master Application Template

**Version:** 1.1.0
**Date:** April 3, 2026
**Status:** Single Source of Truth (SSOT)

---

## 1. Introduction

This document is the **Single Standard File** for building applications within the Revvel and MIDNGHTSAPPHIRE ecosystem. It contains everything needed to build a complete production application from scratch without questions. When an agent is directed to the "one standard file," this is it.

## 2. Technology Stack

Every new application must be built using the standardized technology stack outlined below. This ensures consistency, maintainability, and rapid development across all projects.

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React / Next.js | The core framework for all web interfaces. |
| **Styling** | Tailwind CSS | Utility-first CSS framework. A **glassmorphism UI** aesthetic is the required preference. |
| **Backend** | Node.js / Express or tRPC | The server-side runtime and API structure. |
| **Database** | PostgreSQL or SQLite | PostgreSQL (via Drizzle ORM) for complex applications. SQLite is permitted for lightweight, single-tenant tools. |
| **Authentication** | Clerk or Custom JWT | Clerk is preferred for rapid setup; custom JWT is acceptable for specific architectural needs. |
| **Deployment** | DigitalOcean / CodeMagic | DigitalOcean App Platform or Droplets for web and backend. CodeMagic is mandatory for mobile applications. |

## 3. Required Features

Every application must include a specific set of features by default. These are non-negotiable baseline requirements for all Revvel products.

### E-Commerce and Financial Integrations

A robust financial foundation is required for all applications. This includes a full **Shopping Cart** system with add, remove, and quantity controls, backed by persistent state management. 

For payment processing, **Stripe Integration** is mandatory. This must cover secure checkouts, webhook handling, and refund capabilities. Furthermore, **Subscription Management** must be implemented via Stripe, supporting multiple plan tiers and providing a customer-facing billing portal.

For applications requiring banking data, **Plaid Integration** is required to facilitate bank account linking, balance checks, and transaction history retrieval.

### Administration and Control

A comprehensive **Admin Panel** is a critical requirement. This dashboard must allow administrators to modify the user interface—including colors, layouts, branding, and fonts—without requiring code changes or redeployments. Additionally, administrators must have the ability to dynamically toggle features on and off for specific users or globally.

### Marketing, SEO, and Analytics

Organic growth and visibility are paramount. The application must have a strong **SEO Foundation**, including auto-generated meta tags, Open Graph tags, Twitter Cards, structured data (Schema.org JSON-LD), `sitemap.xml`, and `robots.txt`. 

For paid acquisition, **SEM Hooks** must be built-in, supporting Google Ads integration, conversion tracking pixels, and UTM parameter handling. The admin panel must feature a **Backlinking Stats** dashboard displaying backlink counts, referring domains, and anchor text distribution, integrated with free APIs like OpenLinkProfiler or similar Free and Open Source Software (FOSS) tools.

Content management requires granular **Meta Data Management**, allowing per-page control over titles, descriptions, keywords, canonical URLs, and `hreflang` attributes for internationalization. Furthermore, **Alt Text** must be auto-generated for all images using an AI/LLM integration, with a manual override capability provided in the admin panel.

Finally, the application must include **Auto Marketing via Meta**. This involves integrating with the Facebook and Instagram Business APIs to automatically post products, create ad campaigns, define audience targeting, and view performance metrics. At this time, Meta is the only required social media integration for this specific feature.

### Accessibility and Quality Assurance

The application must strictly comply with **WCAG 2.1 AA** accessibility standards. This includes comprehensive screen reader support, full keyboard navigation capabilities, and high contrast modes.

For tracking user behavior, privacy-respecting **Analytics** must be integrated, prioritizing FOSS solutions like Plausible or Umami. 

Application stability is ensured through robust **Error Handling**, utilizing global error boundaries and Sentry-style error tracking. Code quality is maintained through comprehensive **Testing**, requiring full unit, integration, and end-to-end (e2e) test coverage using Vitest and Playwright.

### Auto-Documentation

The codebase must support **Auto-Generated Docs**. This means API documentation, field-to-database mapping, and a comprehensive data dictionary must be automatically generated and maintained from the source code.

## 4. Project Lifecycle

Every project must follow a strict, eight-step lifecycle to ensure thorough planning and rapid execution.

| Phase | Description |
| :--- | :--- |
| **1. Deep Research** | Conduct market analysis, competitor reviews, and blue ocean/red ocean assessments. |
| **2. Specification** | Create a full specification document detailing all features, data models, API endpoints, and wireframes. |
| **3. Rollout Plan** | Develop a phased release plan with clearly defined milestones and target dates. |
| **4. Scrum Docs** | Generate sprint planning documentation, backlog creation, user stories, and acceptance criteria. |
| **5. D.A.R.E. Log** | Maintain a log tracking Decisions, Actions, Results, and Evidence. |
| **6. R.A.I.D. Log** | Maintain a log tracking Risks, Assumptions, Issues, and Dependencies. |
| **7. Implementation** | Execute using EXRUP (Extreme Rapid Programming)—shipping the complete, fully tested product in one intense iteration. |
| **8. Release** | Deploy to the live environment, verify functionality, and finalize all documentation. |

## 5. CI/CD Pipeline

Continuous Integration and Continuous Deployment (CI/CD) are mandatory for all projects.

For web and backend services, **GitHub Actions** must be used for all build, test, and deploy workflows. For mobile applications, **CodeMagic** is mandatory for React Native/Expo builds and automated store submissions.

A critical security and quality gate is the **Code Review** process. Venice AI code review is mandatory before every push to the `main` branch. 

The current **Deployment Strategy** is to auto-deploy to DigitalOcean upon pushing to the `main` branch. We are currently operating under a "Live-First" deployment exception, skipping staging environments to save time and avoid sandbox issues. The future state will transition to a strict development to testing to live pipeline with proper quality gates.

## 6. Mobile Application Standards

When a project requires a mobile application, specific standards apply. The application must be built using **React Native with Expo**. Deployment must be fully automated to the Google Play Store and Apple App Store via **CodeMagic**. The core feature set for any mobile application must include push notifications, deep linking capabilities, and robust offline support.

## 7. Security Standards

Security is integrated into every layer of the application. **Secret Management** must be handled by HashiCorp Vault, utilizing AppRole and OIDC authentication. **API Protection** requires the implementation of rate limiting, CORS configuration, and `helmet.js`. **Data Validation** must be strictly enforced using Zod. Finally, **Database Security** must prevent SQL injection through the use of parameterized queries handled by the chosen ORM (Drizzle).

## 8. Branding and Design

The visual identity of Revvel applications must follow specific guidelines. The aesthetic preference is a **Glassmorphism UI/UX** design. A **Dark Theme** must be the default presentation, but a manual light mode toggle is mandatory. When selecting **Domains**, prioritize trending, high-SEO, creative, and cost-effective domain names.

## 9. MCP Server Integration

Every Revvel project must be wired with MCP servers to give AI coding agents (Claude Code, Cursor, GitHub Copilot, Windsurf) full access to the project's data, services, and tools. This is enforced by placing a `.mcp.json` at the project root.

### Mandatory for Every Project

1. **`.mcp.json`** — Copy from `revvel-standards/templates/mcp/mcp.<profile>.json` and merge with `mcp.revvel-custom.json`.
2. **`rvvel-affiliate-links-mcp`** — Always included. Enables AI agents to insert real affiliate links automatically. Run: `npx rvvel-affiliate-links-mcp`.
3. **`code-review-mcp-server`** — Always included. Enforces the Dev→Test→Live gate. Requires local clone: `github.com/midnghtsapphire/code-review-mcp-server`.

### Profile Selection

| Project Type | Template to Copy |
|---|---|
| Full-stack / flagship | `templates/mcp/mcp.full.json` + `mcp.revvel-custom.json` |
| Web (Next.js / React) | `templates/mcp/mcp.web.json` + `mcp.revvel-custom.json` |
| Mobile (Expo) | `templates/mcp/mcp.mobile.json` + `mcp.revvel-custom.json` |
| CLI / utility / script | `templates/mcp/mcp.minimal.json` + `mcp.revvel-custom.json` |

### Quick Setup

```bash
# Run from the new project root:
bash ../revvel-standards/scripts/setup-mcp.sh web
```

### Full Documentation

See **[`MCP_STANDARD.md`](https://github.com/midnghtsapphire/revvel-standards/blob/main/docs/Master_Inventory/MCP_STANDARD.md)** for the complete standard including all 32 community servers, the FastMCP custom server guide, and the full Revvel Custom MCP catalog.
