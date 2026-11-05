# Zero-touch secrets: design draft (Secret, 2026-11-05)

Status: **DRAFT for fleet feedback.** Nothing here is built yet. No secrets in this file.

## Audrey's goal (relayed by TriageChief, 2026-11-05)

Audrey never wants to track or fetch secrets again. Bots sign up for services with her account info and get free API keys. If a key costs money, a bot opens a WR + PR so she approves only the subscription. Everything else is automatic.

## Hard rules (kept)

- A secret value never shows up in chat, an issue, a PR, a log, an agent memory, or any public repo (this repo is public).
- Agents ask for secrets by **name** and never see the raw value. Values go straight into the process that needs them at run time.
- Never delete. Rotation adds a new version and leaves the old one disabled, not destroyed.
- No GitHub-hosted Actions (Audrey's rule). Injection runs only on her own machines or personal workflows.
- Spending money, enabling a paid plan, and any step that only Audrey can do (2FA, passkey, captcha the bot can't get past, ID verification) go to her.

## Architecture

```mermaid
flowchart LR
  A[Agent needs KEY_NAME] --> B[Broker on Audrey's machine]
  B -->|policy check: agent, repo, scope| C[(Vault: Bitwarden Secrets Manager)]
  C -->|value, in memory only| D[Child process env]
  D --> E[Tool or app runs]
  B --> F[Audit log: name, agent, time, never value]
  G[Acquirer bot] -->|new key| C
  G -->|paid plan needed| H[WR + draft PR for Audrey]
```

1. **One vault for machine secrets.** Bitwarden Secrets Manager, because Audrey already uses Bitwarden. It has machine accounts with scoped access tokens and a CLI (`bws`) that can run a command with secrets injected (`bws run`). Check current free-tier limits before relying on them. Personal logins stay in her Bitwarden Password Manager. GlowVault stays as a local fallback.
2. **Broker.** A small local service owned by Secret. It holds the only machine-account token, checks a policy file (which agent can read which secret name for which repo), injects the value into a child process, and writes an audit line with no value in it.
3. **Acquirer flow (sign up and get a key).**
   - Pick the service's free tier. Sign up through the normal site pages with Audrey's saved identity from her vault.
   - Write the new key straight from the browser download or clipboard into the vault. Never paste it into a chat or file.
   - If the site needs 2FA, a passkey, ID, or payment, stop and hand off to Audrey.
   - If only a paid plan works: open a WR plus a draft PR showing the plan, its price, and why. Audrey approves the subscription only.
4. **Leak response.** The local pre-commit scanner (brain-dump #6) blocks commits that contain keys and prints only masked values. For a committed key: rotate it at the provider, store the new value in the vault, and mark the old one revoked. History cleanup goes to Audrey because it rewrites history.
5. **Rotation.** A scheduled job lists key ages by name and rotates keys where the provider allows it through an API. The rest become WRs.

## Not available yet (to build)

- Policy-checked broker with per-agent scopes and a value-free audit log.
- A browser-to-vault handoff, so a freshly issued key never passes through agent context.
- A short-lived token exchange, so agents never hold even the machine token.

## Open questions for the fleet

1. Bitwarden Secrets Manager or something else (1Password service accounts, Infisical self-host, HashiCorp Vault in `midnghtsapphire/infrastructure`)?
2. Which machine runs the broker? Is the storage desktop online?
3. Do we keep GlowVault, or migrate it into the vault?
4. Who reviews the per-agent scope policy? PrivacyWarden doesn't exist yet, so Secret is solo.

## Next steps

- [ ] Fleet feedback (Whiteboard/Ideas Discussion)
- [ ] Audrey picks the vault (if it costs money, that becomes a WR)
- [ ] Prototype the broker on her machine
- [ ] Merge the brain-dump #6 hooks
