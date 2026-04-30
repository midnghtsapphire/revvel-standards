# Revvel Ecosystem: Project Catalog

**Version:** 1.1.0
**Date:** 2026-04-30
**Status:** Incomplete - Representative Sample

> [!NOTE]
> **This is a manually maintained snapshot.** For a complete, real-time list
> of all repositories, use the GitHub API or the organization page:
> ```bash
> gh repo list midnghtsapphire --limit 500 --json name,description,updatedAt
> ```
> A future `generate-project-catalog.yml` workflow will auto-generate this file.
> The `stale-docs-check.yml` workflow flags this file when it hasn't been updated in 30+ days.

---

## 1. Introduction

The MIDNGHTSAPPHIRE GitHub organization contains over 300 individual repositories, representing a wide range of projects, applications, libraries, and research. This document provides a catalog of the most significant and active repositories.

A complete, real-time list of all repositories can be accessed via the [MIDNGHTSAPPHIRE GitHub page](https://github.com/MIDNGHTSAPPHIRE).

## 2. Application & SaaS Repositories

### Food & Catering

| Repository | Status | Description | Link |
| :--- | :--- | :--- | :--- |
| **Soul2Bowl** | In Development | Premium online ordering and catering platform for St. Louis fusion cuisine — BBQ, Asian-Hawaiian, Southern soul food. Features glassmorphic design, animated UI, booking calendar, Stripe payments (one-time + subscriptions), Clerk auth (Google/Apple/Email), admin CMS panel, and eco-friendly LIFEMADE compostable bowl showcase. | [Soul2Bowl](https://github.com/MIDNGHTSAPPHIRE/Soul2Bowl) |

### General Applications

These repositories contain full-stack applications and Software-as-a-Service (SaaS) products.

| Repository | Status | Description | Link |
| :--- | :--- | :--- | :--- |
| **Pawsitting** | Deployed | Pet sitting management app with a purple glassmorphism UI, 10-table database, Stripe billing, and AI chat features. | [Pawsitting](https://github.com/MIDNGHTSAPPHIRE/Pawsitting) |
| **the-alt-text** | Deployed | AI-powered SaaS for generating SEO-optimized alt text for images. Includes a 3-tier Stripe subscription model and a REST API. | [the-alt-text](https://github.com/MIDNGHTSAPPHIRE/the-alt-text) |
| **steel-white** | Deployed | (Reese Reviews) An application for Amazon Vine reviewers to track products, ETV (Estimated Tax Value), and inventory. Includes an affiliate engine. | [steel-white](https://github.com/MIDNGHTSAPPHIRE/steel-white) |
| **revvel-forensic-studio** | Deployed | An AI-powered image analysis and enhancement tool with a "Glass Observatory" theme, 12 distinct workspaces, and a FastAPI backend. | [revvel-forensic-studio](https://github.com/MIDNGHTSAPPHIRE/revvel-forensic-studio) |
| **mindmappr** | Deployed | The backend service for the MindMappr AI agent, which is integrated with Telegram and Slack. | [mindmappr](https://github.com/MIDNGHTSAPPHIRE/mindmappr) |
| **meetaudreyevans-dashboard** | Deployed | The full React-based dashboard for the `meetaudreyevans.com` hub, running in a Docker container. | [meetaudreyevans-dashboard](https://github.com/MIDNGHTSAPPHIRE/meetaudreyevans-dashboard) |

## 3. Standards & Infrastructure Repositories

These repositories define the standards, documentation, and infrastructure for the entire ecosystem.

| Repository | Status | Description | Link |
| :--- | :--- | :--- | :--- |
| **revvel-standards** | Live | The single source of truth for all documentation, including templates, deployment guides, and infrastructure maps. | [revvel-standards](https://github.com/MIDNGHTSAPPHIRE/revvel-standards) |
| **revvel-app-template** | In Development | A working boilerplate repository for all new applications, pre-configured with the required stack and features. | [revvel-app-template](https://github.com/MIDNGHTSAPPHIRE/revvel-app-template) |
| **rvvel** | Live | The source code for the main portfolio and hub website, `meetaudreyevans.com`, deployed via GitHub Pages. | [rvvel](https://github.com/MIDNGHTSAPPHIRE/rvvel) |

## 3a. AI Skills & Plugin Repositories

These repositories contain agent skills, Claude Code plugins, and AI extension marketplaces.

| Repository | Status | Description | Skill Entry | Link |
| :--- | :--- | :--- | :--- | :--- |
| **Claude-Skills-Governance-Risk-and-Compliance** | Active (Fork) | Expert-level GRC compliance guidance for ISO 27001, SOC 2, FedRAMP, GDPR, HIPAA, NIST CSF 2.0, PCI DSS v4.0.1, TSA Cybersecurity, and ISO 42001 AI Management System — delivered as a Claude Code plugin marketplace. Fork of `Sushegaad/Claude-Skills-Governance-Risk-and-Compliance` v0.3.0. Benchmarked at 94% accuracy across 18 test cases. | [`skills/grc-compliance/`](../skills/grc-compliance/) | [Claude-Skills-GRC](https://github.com/MIDNGHTSAPPHIRE/Claude-Skills-Governance-Risk-and-Compliance) |

## 4. Research Documents

These documents contain AI-powered research analysis following the [AI Research Module Standard](Master_Inventory/AI_RESEARCH_MODULE_STANDARD.md).

| Document | Date | Status | Description | Link |
| :--- | :--- | :--- | :--- | :--- |
| **Search Engine Alternatives** | 2026-04-30 | Complete | Comprehensive analysis of search engine options (Elasticsearch, OpenSearch, MeiliSearch, Typesense, Algolia, Solr, Vespa). Recommends MeiliSearch for product search with OpenRouter enhancement. | [SEARCH_ENGINE_ALTERNATIVES_RESEARCH.md](SEARCH_ENGINE_ALTERNATIVES_RESEARCH.md) |
| **GitHub Enterprise** | 2026-04-14 | Complete | Analysis of GitHub Enterprise vs Personal GitHub for cross-account access and automation. | [GITHUB_ENTERPRISE_RESEARCH.md](GITHUB_ENTERPRISE_RESEARCH.md) |
| **Test Harness** | 2026-04-19 | Complete | Evaluation of test harness options for the revvel-standards repository. | [TEST_HARNESS_RESEARCH.md](revvel-standards/TEST_HARNESS_RESEARCH.md) |
| **Mobile Test Harness** | 2026-04-19 | Complete | Mobile testing framework research and recommendations. | [MOBILE_TEST_HARNESS_RESEARCH.md](revvel-standards/MOBILE_TEST_HARNESS_RESEARCH.md) |

## 5. Data & Research Repositories

These repositories contain datasets, research papers, and archives of valuable information.

| Repository | Status | Description | Link |
| :--- | :--- | :--- | :--- |
| **ai-conversation-extractions** | Archived | A massive archive of over 1,000 AI conversation logs from ChatGPT and Grok, containing prompts, code snippets, and project ideas. | [ai-conversation-extractions](https://github.com/MIDNGHTSAPPHIRE/ai-conversation-extractions) |
| **SSRN_Whitepapers** | Archived | A collection of academic and technical whitepapers, primarily for submission to SSRN (Social Science Research Network). | [SSRN_Whitepapers](https://github.com/MIDNGHTSAPPHIRE/SSRN_Whitepapers) |
| **business-ideas-vault** | Archived | A master collection of business concepts, plans, and validation research. | [business-ideas-vault](https://github.com/MIDNGHTSAPPHIRE/business-ideas-vault) |
| **cyber-security-turn-business** | Archived | Business plans, research, and documentation related to cybersecurity ventures. | [cyber-security-turn-business](https://github.com/MIDNGHTSAPPHIRE/cyber-security-turn-business) |
