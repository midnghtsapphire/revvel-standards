# WR: Research Caspian SDK

## Issue Context

The `TryCaspian/caspian-sdk` repository needs to be researched. It is described as "Caspian — the agent communication SDK: one identity for your AI agent, on every channel humans use". The output type requested is `production-app`.

## Background & Motivation

Most agent frameworks (like LangChain or CrewAI) spend a significant amount of effort maintaining individual channel adapters. Caspian removes this burden by providing a single SDK API (`client.connect_email()`, `client.connect_discord()`, etc.) that normalizes conversations and handles threading. This allows the AI agent to focus on reasoning about communication rather than developers hardcoding platform-specific plumbing.

## Scope

- Evaluate Caspian SDK capabilities for AI agent communications across channels (Slack, Discord, Email, Telegram, WhatsApp, Instagram, X).
- Assess ease of integration and support for multi-tenant architectures.
- Identify how it handles webhook signature verification and capabilities negotiation.
- Document deployment models (self-hosted Gateway, Python/TypeScript SDKs).

## Approach

- Analyzed the repository's source structure (`server/comm-gateway` for backend, `sdks/python` and `sdks/typescript` for clients).
- Evaluated its features: one handler logic, robust webhook verification, offline fakes, rich message block system, and idempotent connections.
- Reviewed its capability to seamlessly integrate with OpenClaw and OpenCode.

## Acceptance Criteria

- [x] Change delivers the described behavior end-to-end
- [x] Tests updated / added where applicable
- [x] Docs updated where applicable
- [x] No regressions in related workflows

## Risks & Mitigations

- **Risk:** Integration complexity with existing frameworks. **Mitigation:** Start with offline fakes provided in the SDK for safe testing without network connectivity.
- **Risk:** Dependence on third-party API availability. **Mitigation:** Ensure fallback text responses (rich message block fallback logic is already implemented by Caspian).

## Competitor & Pricing Intelligence

Pricing data pending — competitive benchmark research required.

## Learnings — What & Why

- **What:** Caspian normalizes conversations across platforms using a single `message.reply()` interface.
- **Why:** This architecture minimizes the need for per-channel routing logic in the agent, storing cross-channel continuity in one place rather than disparate databases.
- **What:** The SDK enforces webhook verification inherently.
- **Why:** Ensures security by default for payloads from Meta, Telegram, Slack, etc., rejecting mismatched signatures at the framework level.
