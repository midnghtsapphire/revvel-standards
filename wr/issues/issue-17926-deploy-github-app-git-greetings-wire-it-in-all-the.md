# WR: [WR] deploy github app git-greetings wire it in all the way

**Issue:** #17926  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-08-24  
**Research Date:** 2026-08-24  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Scope

- End-to-end implementation and deployment of the `git-greetings` GitHub App, named `oaudrey-git-greetings`.
- Development of a GitHub Action (`oaudrey-git-greetings-action`) to wrap the app for ease of integration into standard repository workflows.
- The app must deliver highly personalized, non-generic interactions ("umph") — for example, dynamically referencing user contributions, checking repository context, or providing custom onboarding guidance based on the user's role (first-time contributor, maintainer, etc.).
- Delivery includes full documentation, passing test suites (`npm test` and `npm run workflows:validate`), and a verified deployment path.

## Approach

- **1. Application Setup & Deployment:** Register the GitHub App (`oaudrey-git-greetings`) with necessary permissions (Issues: write, Pull Requests: write). Deploy the backing service (e.g., Node.js backend) to a stable hosting environment.
- **2. Interaction Logic ("Umph"):** Implement webhook handlers for `issues.opened` and `pull_request.opened`. Enhance the payload processing to generate dynamic greetings using an LLM or predefined contextual templates rather than static strings.
- **3. Action Wrapper:** Create a composite GitHub Action at `products/oaudrey-git-greetings/action.yml` that allows repositories to configure custom greeting behaviors (e.g., setting tone, enabling/disabling specific triggers).
- **4. Secrets Management:** Document required app credentials (APP_ID, PRIVATE_KEY, WEBHOOK_SECRET) by adding them (names only) to `docs/SECRETS_MAP.md`.
- **5. Validation & CI:** Write unit tests for the webhook handlers and action configuration logic to guarantee 100% pass rates for `npm test` and `npm run workflows:validate`.

## Acceptance Criteria

- [ ] GitHub App `oaudrey-git-greetings` is successfully registered, deployed, and listening for webhook events.
- [ ] The app provides contextual, non-generic greetings ("umph") on new issues and pull requests.
- [ ] A reusable GitHub Action wrapper is created in the repository and documented.
- [ ] All necessary secrets are documented in `docs/SECRETS_MAP.md`.
- [ ] `npm test` passes 100%.
- [ ] `npm run workflows:validate` reports 0 invalid workflows.
- [ ] The `.github/workflows/anti-scaffolding-enforcer.yml` check passes successfully.

## Risks & Mitigations

- **Risk:** The app requires broad permissions which could be exploited if credentials leak. **Mitigation:** Adhere strictly to the principle of least privilege; request only `Issues: write` and `Pull Requests: write`. Document all secrets explicitly.
- **Risk:** Contextual greetings could become spammy or inappropriate. **Mitigation:** Implement logic to ensure greetings are only sent on the *first* interaction by a user in the repository, and include a configuration option to disable AI-generated dynamic text if it behaves unexpectedly.

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix

## Learnings — What & Why

Standardizing the deployment of internal tools as both GitHub Apps and Actions (using the `oaudrey` prefix) creates a consistent integration pattern across the organization. Adding contextual "umph" to greetings significantly improves the developer experience by moving away from robotic, easily ignorable auto-replies, fostering better engagement in the repository.
