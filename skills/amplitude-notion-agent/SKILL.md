# Amplitude → Notion Agent Skill

Activate when any task involves syncing **Amplitude** analytics into **Notion**, building a closed-loop GitHub → Amplitude → Notion governance dashboard, or wiring scheduled metric snapshots from Amplitude charts into a Notion database.

## What this agent does

A scheduled GitHub Actions workflow (`.github/workflows/amplitude-to-notion.yml`) runs `scripts/amplitude-to-notion.js` once a day. The script:

1. Calls the **Amplitude Dashboard REST API** (`/api/3/chart/<id>/query`) using HTTP Basic auth (`AMPLITUDE_API_KEY:AMPLITUDE_SECRET_KEY`).
2. Reduces the response to a flat snapshot — total events, series count, series labels.
3. Calls **Notion's `POST /v1/pages`** with the snapshot, creating one new row in a configured Notion database.

It is the read-side complement to `amplitude-events.yml` (which sends GitHub events INTO Amplitude). Together they give Audrey a Notion view of governance throughput without leaving Notion.

## Why an agent (not a Zapier-style integration)

- Behavior, schema, secrets, and verification path live in the repo and are reviewed like code.
- No external SaaS contract / billing — pure HTTP from GitHub Actions.
- Auditable: every run leaves a log; every Notion row carries `Source` (repo) and `Chart ID`.
- Cheap: one scheduled run/day, well under the free Action minutes budget.

## When to load this skill

- Setting up Amplitude → Notion sync in any Revvel/MIDNGHTSAPPHIRE repo.
- Adding a Notion dashboard fed by Amplitude metrics.
- Debugging the `amplitude-to-notion` workflow.
- Adopting the agent in a sibling repo.
- Any task referencing "amplitude into notion", "notion analytics dashboard", "amplitude chart export to notion", or "governance metrics in notion".

## Setup checklist

1. **Provision secrets** in the target repo:
   ```bash
   gh secret set AMPLITUDE_API_KEY            --repo <owner>/<repo>
   gh secret set AMPLITUDE_SECRET_KEY         --repo <owner>/<repo>
   gh secret set NOTION_API_KEY               --repo <owner>/<repo>
   gh secret set NOTION_AMPLITUDE_DATABASE_ID --repo <owner>/<repo>
   ```
   Vault paths:
   - `revvel/shared/analytics/amplitude` — Amplitude key + secret
   - `revvel/shared/notion/standards` — Notion token + database id

2. **Set the chart variable** (Settings → Variables → Actions):
   ```bash
   gh variable set AMPLITUDE_CHART_ID --body "<chart_id_from_amplitude_url>" --repo <owner>/<repo>
   ```
   Optional: `AMPLITUDE_REGION` (`us`/`eu`), `NOTION_VERSION` (default `2022-06-28`).

3. **Create the Notion database** with this schema (see `standards/AMPLITUDE_NOTION_AGENT_STANDARD.md` §4):

   | Property | Type |
   |---|---|
   | `Title` | Title |
   | `Date` | Date |
   | `Total Events` | Number |
   | `Series Count` | Number |
   | `Series Labels` | Text |
   | `Source` | Text |
   | `Chart ID` | Text |

4. **Share the Notion integration with the database** (database header → ▼ → *Add connections*). This is the single most common failure mode — without it, the API returns 404 even with a valid token.

5. **Verify** via *Actions → Amplitude → Notion Agent → Run workflow* with `dry_run: true` first, then `dry_run: false`.

## Hard rules

- The agent **never reads** from Notion. It only appends new pages. No mutation of existing rows.
- The agent forwards **only aggregate counts** from Amplitude — never event-level data, never PII, never raw issue/PR/commit text.
- If any required secret/var is missing, the agent logs `::warning::` and exits 0. **Never** make missing config a failed run.
- Notion text properties are truncated to ~1900 characters to stay under Notion's 2000-char limit.
- Do not extend the script to write to multiple Notion databases or external services without updating the standard doc and re-running validation.

## Adopting in a sibling repo

Copy `.github/workflows/amplitude-to-notion.yml` and `scripts/amplitude-to-notion.js` unchanged. Provision the secrets and `AMPLITUDE_CHART_ID` variable. Share the Notion integration with the target database. Done — `Source` column reflects the sibling repo automatically via `${{ github.repository }}`.

## Related skills & standards

- `skills/mixpanel/SKILL.md` — sister product analytics SDK (event ingestion side)
- `skills/vault-agent/SKILL.md` — provisioning the four secrets via Vault
- `skills/security/SKILL.md` — PII rules for any future event-level extension
- `standards/AMPLITUDE_INTEGRATION_STANDARD.md` — the GitHub → Amplitude side
- `standards/INTEGRATIONS.md` — generic Notion client reference
