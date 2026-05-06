# Agents Guide

This document provides guidance for AI agents and human contributors working in this repository.

## Credentials and Test Accounts

When tests or demos require credentials:

- **Use official test/demo accounts** provided by the service or vendor where available.
- Prefer documented sandbox/staging environments over production.
- Store credentials in the project's secret manager (e.g., Vault, GitHub Actions secrets) — never commit them to source control.
- If no official test credentials exist, request them through the appropriate channel (vendor support, internal IT, or the project owner).
- Document the source and rotation policy for any test credentials in the relevant runbook.

**Do not** attempt to obtain credentials through unauthorized means. All credentials used in this repository must come from legitimate, authorized sources.

## Code Review

See [CODE_REVIEW_STANDARD.md](./CODE_REVIEW_STANDARD.md) for the current code review process and AI reviewer configuration.

## Testing

See [testing/SKILL.md](./testing/SKILL.md) for testing standards, including PromptFoo skill tests.
