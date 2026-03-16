# Revvel STANDARDS

---

1. **Folder & File Structure**
   - Organize scripts, api, data, docs, tests, engine, cli, output, models; naming conventions are descriptive and explicit.

2. **Coding & Naming Standards**
   - Use clear, descriptive names for files, classes, and functions.
   - CLI and API options must be accessible and user-intent-driven.

3. **Data Flow & Architecture**
   - See docs/tech_flow.md for complete diagram.
   - Overview: User/API → Auth (Google/Apple/OAuth/Registration) → Database (Supabase/Fireball/DO) → Audio Processing → Payments (Stripe) → Expenses (Plaid) → Admin Dashboard → Analytics/Docs/Site.

4. **Data Dictionary**
   - Key entities: users, payments, expenses, audio_files, logs, tokens.
   - Example fields:
       | Entity  | Field       | Type   | Description                        |
       |---------|-------------|--------|------------------------------------|
       | User    | id          | UUID   | Unique user identifier             |
       | Payment | id          | UUID   | Stripe payment ID                  |
       | AudioFile| input_path | string | Raw file path                      |
       | Log     | event       | string | Event description/type             |

5. **Database Schema Standards**
   - SQL: explicit types, unique constraints, indexed where relevant.
   - NoSQL: top-level collections for entities; reference foreign keys as explicit fields.

6. **Vault & Credential Handoff**
   - Request credentials/vault access from admin before starting.
   - Use platform secret management (Supabase Vault, Firebase/Fireball, Digital Ocean App Secrets).
   - Credentials are delivered individually and revoked post-handoff.
   - Document workflow in AGENTS.md and tech_flow.md.

7. **Agent Onboarding**
   - Clone repo, access credentials, follow setup instructions.
   - Reference AGENTS.md and tech_flow.md for specifics.

8. **Automation & Integration**
   - OpenRouter-powered automation scripts for docs/idea generation.
   - Registration API for onboarding.
   - CI/CD: GitHub Actions triggers for tests, docs, site updates.

9. **Accessibility, Theming, Admin Features**
   - Support selectable themes (glassy, anime, steampunk, dark, etc.).
   - Admin dashboard: UI/content/marketing/stats hooks.
   - Accessibility: WCAG AAA contrast, ergonomic layouts.

10. **Payment & Expense Tracking**
    - Stripe integration for subscriptions/tokens.
    - Plaid for expense tracking.

11. **References**
    - See tech_flow.md for diagrams and schemas; AGENTS.md for onboarding details.

---

This update unifies standards for all agents, ensuring every workflow, credential, automation, and tech decision is clear, repeatable, and accessible.