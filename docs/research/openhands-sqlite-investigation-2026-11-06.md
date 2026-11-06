# OpenHands SQLite error: investigation record

**Requested by:** Audrey Evans, after the PR lifecycle work. **Actor:** Codex repository-audit specialist, ChatGPT Work Mode. **Date:** 2026-11-06, America/Denver. **Status:** error not yet identified; no fix claimed.

## Evidence checked

- Searched the current `revvel-standards` checkout's scripts, workflows, configuration, documentation and work requests for SQLite exceptions, locked databases, read-only databases and OpenHands references.
- Queried the public GitHub issues API for `user:midnghtsapphire sqlite openhands`, `repo:midnghtsapphire/revvel-standards sqlite`, `user:midnghtsapphire "database is locked"`, `user:midnghtsapphire "sqlite3.OperationalError"`, `user:midnghtsapphire "no such table"`, and OpenHands/error titles.
- Public search worked. The exact exception queries returned no matching issues. Generic SQLite/OpenHands matches concerned unrelated integrations or project documentation, not an attributable OpenHands failure.
- The available local public repository inventory contained only 100 repositories; no matching OpenHands repository appeared in that subset. This is not an exhaustive account inventory claim.

## Separate issue, not an OpenHands diagnosis

[MindMappr issue #11](https://github.com/midnghtsapphire/mindmappr/issues/11), titled **BUG: Ephemeral SQLite on DO App Platform — data lost on every deploy**, describes MindMappr's SQLite persistence on an ephemeral container filesystem. No evidence connects that issue to Audrey's reported OpenHands error. It must not be treated as the cause or used to justify changing an OpenHands database.

## Information needed for a concrete repair

The next useful input is the **exact error/traceback or failing OpenHands task URL**. If the URL does not establish the environment, also identify whether it is **OpenHands Cloud or a self-hosted installation**. These distinguish an application schema/migration failure, host filesystem problem, package/runtime mismatch, and other possible failures without guessing.

No database was opened, modified, replaced, reset or deleted. No deployment change was made. Once the attributable error is available, inspect the relevant code and logs, preserve existing data, reproduce the failure, apply the smallest targeted correction, and verify the original failing operation succeeds.

## Update: supplied error identifies authentication failure

**2026-11-06 — Codex, after Audrey supplied the actual `all-hands-bot` code-review error.** This update supersedes the earlier "error not yet identified" status; the initial investigation remains above as history.

The supplied failure is HTTP **401**, code **`token_not_found_in_db`**, with **`Invalid proxy server token passed`** and **`Unable to find token in cache or LiteLLM_VerificationTokenTable`**. The credential was already masked in the supplied message; no credential value is recorded here.

This establishes that the contacted LiteLLM proxy did not recognize the presented token. It does **not** establish SQLite corruption, a missing SQLite table, or a database migration problem. The table name appears in an authentication lookup error. There is no basis to delete, reset, rebuild, or otherwise repair a database from this evidence.

### Credential and endpoint separation

The root agent verified the matching error and key distinction in the [official OpenHands LLM documentation](https://docs.openhands.dev/openhands/usage/llms/openhands-llms). OpenHands Cloud API credentials and OpenHands LLM credentials serve different endpoints and must not be interchanged blindly.

Local integration evidence reported by the root agent:

- `scripts/call-openhands-api.sh` uses `OPENHANDS_API_KEY` for the Cloud conversation API.
- `.github/workflows/openhands-resolver.yml` uses `OPENROUTER_API_KEY` with the OpenRouter base URL. That configuration is a different route from an OpenHands LLM proxy.

The corrective operation is to identify the failing bot's actual LLM base URL and credential source, then configure a valid credential issued for **that proxy**. If a server migration changed the base URL, verify that the token exists in the new proxy's credential store; pointing an old token at a different proxy does not transfer its registration. The error alone does not distinguish a wrong endpoint, wrong key type, revoked token, or missing token registration. Do not change the Cloud conversation key unless its own endpoint fails validation.

Verification must repeat the original failed code-review operation with the corrected endpoint/credential pairing and observe successful authentication. No successful live repair has been observed in this session.

### Authorization and remaining access limitation

Audrey explicitly authorized deployment and merging during the follow-up. The remaining obstacle is **access, not missing approval**. The root agent rechecked the connector and received an unknown-tool error; git push lacked credentials. `GH_TOKEN`, `GITHUB_TOKEN`, `SSH_PRIVATE_KEY`, `DOPPLER_TOKEN`, `OPENHANDS_API_KEY`, `LLM_API_KEY`, and `LLM_BASE_URL` were absent from the available environment. No live key/account settings were available to correct or verify. These observations describe this session's access only, not whether credentials exist in Audrey's services.

No token was guessed, disclosed, or replaced; no database was modified. The authenticated settings surface for the failing bot/proxy is still needed to perform and verify the authorized repair.
