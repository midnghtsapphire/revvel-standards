# Revvel Default Application Template

**Version:** 1.0.0
**Date:** 2026-02-25
**Status:** Master Template - DO NOT MODIFY

---

## 1. Introduction

This document serves as the **single source of truth (SSOT)** for the structure, standards, and mandatory components of every new application developed within the Revvel/Audrey Evans ecosystem. Adherence to this template is mandatory to ensure consistency, quality, and rapid development across all projects.

## 2. Folder Structure

All new repositories must adhere to the following standardized folder structure:

```text
/project-name
├── docs/             # All project documentation (BLUEPRINT.md, ROADMAP.md, etc.)
├── src/              # Main application source code
│   ├── components/   # Reusable UI components
│   ├── pages/        # Application pages or routes
│   ├── services/     # API clients, external service integrations
│   ├── styles/       # Global styles, themes, and CSS
│   └── utils/        # Helper functions and utilities
├── assets/           # Static assets (images, fonts, logos)
├── data/             # Seed data, mock data, or local data stores
├── tests/            # Unit, integration, and end-to-end tests
├── .env.example      # Example environment variables
├── .gitignore        # Git ignore file
├── CHANGELOG.md      # Automated changelog
├── LICENSE           # Project license file
├── package.json      # Project dependencies and scripts (for Node.js)
├── requirements.txt  # Project dependencies (for Python)
└── README.md         # Project overview and setup instructions
```

## 3. Required Files & Content

### LICENSE

All repositories must contain a `LICENSE` file with the following text. No other license is permitted for original repositories.

> All Rights Reserved. Copyright 2010-2026 Freedom Angel Corp / Audrey Evans.

### .env.example

The `.env.example` file must list all required environment variables for the application to run, with placeholder values. This includes, but is not limited to:

```text
# Stripe API Keys
STRIPE_PUBLIC_KEY_TEST=
STRIPE_SECRET_KEY_TEST=
STRIPE_PUBLIC_KEY_LIVE=
STRIPE_SECRET_KEY_LIVE=

# Auth Providers (Google, Apple)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=

# Database Connection
DATABASE_URL=

# JWT Secret
JWT_SECRET=

# OpenRouter API Key
OPENROUTER_API_KEY=
```

### CHANGELOG.md

This file must be automatically updated on every push to the `main` branch via a GitHub Action. It should log all commit messages and associate them with a version number.

## 4. Standard Modules & Features

Every application must include the following modules and features without exception.

| Module / Feature | Description |
| :--- | :--- |
| **Authentication** | Google OAuth, Apple Sign-In, and standard email/password with JWT. |
| **Billing** | Stripe integration for both subscriptions and one-time payments. Must support both test and live keys. |
| **Customer Service** | A built-in layer for customer support, including a text agent, call agent, and self-service for refunds, returns, and cancellations. |
| **Payment Dunning** | Automated handling of payment failures, including dunning emails, payment retry logic, and grace periods. |
| **Accessibility Modes** | Five mandatory, user-toggleable accessibility modes: **WCAG AAA**, **ECO CODE**, **NEURO CODE**, **DYSLEXIC MODE**, and **NO BLUE LIGHT**. |
| **Error Recovery** | Self-healing mechanisms to gracefully handle and recover from unexpected errors. |
| **Analytics** | An integrated dashboard to display key application metrics. |
| **Token Economy** | A credit/token-based system with a free tier and paid tokens for overage or premium features. |
| **AI Assistants** | An AI-powered text/chat assistant and an AI-powered phone answering service. |
| **SEO** | Minimum of 1000+ backlinks, full Schema.org JSON-LD implementation, and comprehensive meta tags on all pages. |
| **Affiliate Engine** | Built-in affiliate marketing system with support for 20, 50, 100, 200, and 500 campaign buttons. |
| **Email Marketing** | Automated email collection and integration with an auto-newsletter system. |

## 5. Pricing and Business Model

All applications will follow a standardized freemium and subscription model.

- **Pricing Tiers:** Subscriptions are based on site size (Small: 1-50 pages, Medium: 51-500, Large: 501-10k, Enterprise: 10k+).
- **Token Overage:** Each subscription tier includes a monthly token allowance. Overage is billed on a per-token basis.
- **Freemium Flow:** New users receive a small number of free tokens. The first use of a token-based feature initiates a free trial, which automatically converts to a paid subscription if not canceled.

## 6. Design and Philosophy

- **UI Design:** All apps must use a **glassmorphism dark UI**. Each app will have a unique color identity based on warm tones that are resilient to blue light filters.
- **Blue Ocean Feature:** Every app must include at least one unique, innovative feature that is not present in competing products.
- **AI-for-Good:** Every app must include a dedicated section or page explaining its "AI-for-Good" philosophy, emphasizing how the technology empowers users rather than replacing them.
- **Admin Account:** The email `angelreporters@gmail.com` must be configured as a full-access admin account, authenticated automatically without a password.
- **No Watermarks:** No watermarks or AI metadata are permitted in any user-facing or published content.

## 7. Auto-Documentation

- **CHANGELOG.md:** Must be automatically updated on every push to the `main` branch.
- **Comprehensive Docs:** Every repository must include a `/docs` folder containing a `BLUEPRINT.md`, `ROADMAP.md`, and other essential project documentation as outlined in the `revvel-standards`.
