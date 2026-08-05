# Revvel Ecosystem: New Team & Agent Onboarding

**Version:** 1.0.0
**Date:** 2026-02-25
**Status:** Required Reading

---

## 1. Welcome to the Revvel Ecosystem

This guide is the mandatory starting point for any new team member or AI agent joining the Revvel/Audrey Evans project. Its purpose is to rapidly bring you up to speed on our culture, processes, and technical stack. Your first task is to read this and the following documents in order.

## 2. The Onboarding Reading List

To get started, you must read the following documents from the `MIDNGHTSAPPHIRE/revvel-standards` repository in this specific order:

1. **`ONBOARDING.md`** (This file)
2. **`DEFAULT_APP_TEMPLATE.md`** - The master template for all new applications.
3. **`DEPLOYMENT_GUIDE.md`** - How to deploy applications to our infrastructure.
4. **`INFRASTRUCTURE_COMPLETE.md`** - The complete map of our digital assets.
5. **`PROJECT_CATALOG.md`** - A catalog of our existing projects.

Understanding these documents is not optional. They are the foundation of our development methodology.

## 3. Key Rules & Core Philosophy

Our development process is guided by a few simple, non-negotiable rules.

- **FOSS First:** Always prioritize Free and Open Source Software. Paid tools and APIs are used only when a FOSS alternative cannot meet the required speed or quality.
- **GitHub First:** Everything goes to GitHub. Code, documentation, notes, and configurations. The GitHub repository is the permanent record. Local sandboxes are temporary. If it's not on GitHub, it doesn't exist.
- **Auto-Docs:** Documentation is not an afterthought; it is automated. Every repository must have a `CHANGELOG.md` that is updated on every push. All projects must be thoroughly documented in the `/docs` folder.
- **No Questions, Just Execute:** The project requirements and standards are clearly defined in the documentation. Your role is to execute on that vision with speed and precision. Ambiguity should be resolved by referencing the standards, not by stopping to ask questions.

## 4. The LLM Routing Stack

To manage costs and maximize efficiency, we use a tiered, "free-first" approach to Large Language Model (LLM) routing via OpenRouter.

1. **Tier 1 (Free):** `MiMo-V2-Flash`, `Trinity`, `Venice`, `Llama 3.3`, `DeepSeek V3.2`
2. **Tier 2 (Premium):** Paid models are to be used **only when necessary** to achieve a specific task that the free models cannot handle.

This stack is designed to handle the vast majority of tasks using free models, reserving premium models for specialized, high-value work.

## 5. The Bullpen Rotation

We employ a "bullpen rotation" strategy for development teams to maintain high energy and fresh perspectives.

- **Swap at 15-20 Minutes:** Teams or agents should expect to be swapped out of a task after 15-20 minutes of focused work.
- **Fresh Context = Fresh Energy:** The handoff process is designed to be seamless. A new team can pick up exactly where the previous one left off by reading the `SPRINT_STATE.md` and other relevant documentation. This constant rotation prevents burnout and encourages novel solutions.

## 6. Communication Style

All communication, whether in documentation, commit messages, or user-facing content, must adhere to the following principles:

- **Detailed:** Be thorough and provide context. Avoid one-word answers or vague descriptions.
- **Authentic:** Write like a human. Avoid corporate fluff, jargon, and overly formal language.
- **Direct:** Get to the point. Be clear and concise in your writing.

We are building tools for real people, and our communication should reflect that.
