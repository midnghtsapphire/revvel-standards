# Amplitude → Notion Agent Standard

**Version:** 1.0.0
**Status:** Active
**Scope:** `midnghtsapphire/revvel-standards` (and any sibling repo that adopts the workflow)
**Workflow:** [`.github/workflows/amplitude-to-notion.yml`](../.github/workflows/amplitude-to-notion.yml)
**Script:** [`scripts/amplitude-to-notion.js`](../scripts/amplitude-to-notion.js)
**Skill:** [`skills/amplitude-notion-agent/SKILL.md`](../skills/amplitude-notion-agent/SKILL.md)
**Companion:** [`standards/AMPLITUDE_INTEGRATION_STANDARD.md`](AMPLITUDE_INTEGRATION_STANDARD.md) (the GitHub → Amplitude side)

---

## 1. What this is

An autonomous agent that pulls a daily snapshot from the **Amplitude Dashboard REST API** for a saved chart, summarizes it (total events, series count, series labels), and appends a row to a **Notion database** so governance metrics (issues opened/closed, PRs merged, releases) tracked in Amplitude are visible in Notion alongside Audrey's other dashboards — without leaving Notion.

It closes the loop:

```text
GitHub events ── amplitude-events.yml ──▶ Amplitude
                                              │
                                              ▼
                       amplitude-to-notion.yml (this agent)
                                              │
                                              ▼
                                          Notion DB
```

---

## 2. Why an agent (not a Zapier-style point integration)

- **Stays inside the repo.** The agent's behavior, schema, secrets contract, and verification path live in this repo and are reviewed like code.
- **No external SaaS contract / billing.** Pure HTTP calls from GitHub Actions to Amplitude and Notion.
- **Auditable.** Every run leaves a log in Actions; every Notion row carries the source repo + chart ID.
- **Cheap.** One scheduled job per day; well under the free Action minute budget.

---

## 3. Required configuration

### 3.1 Secrets (Settings → Secrets and variables → Actions → Secrets)

| Name | Purpose | Vault path |
|---|---|---|
| `AMPLITUDE_API_KEY` | Amplitude project API key. *Settings → Projects → \[project\] → API Key.* | `revvel/shared/analytics/amplitude` |
| `AMPLITUDE_SECRET_KEY` | Amplitude project **secret** key. The Dashboard REST API uses HTTP Basic auth (`api_key:secret_key`). | `revvel/shared/analytics/amplitude` |
| `NOTION_API_KEY` | Notion internal-integration token (`secret_…`). Create at <https://www.notion.so/my-integrations>. | `revvel/shared/notion/standards` |
| `NOTION_AMPLITUDE_DATABASE_ID` | The 32-char database ID of the target Notion database. **Share the integration with the database** in Notion (▼ menu → *Add connections*). | `revvel/shared/notion/standards` |

### 3.2 Repo variables (Settings → Variables → Actions)

| Variable | Required? | Default | Purpose |
|---|---|---|---|
| `AMPLITUDE_CHART_ID` | yes | — | Saved Amplitude chart to query. Copy from the chart URL: `…/chart/<id>`. |
| `AMPLITUDE_REGION` | no | `us` | `us` or `eu`. Use `eu` only if the project is provisioned in Amplitude EU. |
| `NOTION_VERSION` | no | `2022-06-28` | Notion API version header. |

If any required secret/var is missing, the agent logs `::warning::` and exits 0 (no failed runs, no leaked data). Same convention as `amplitude-events.yml`.

### 3.3 Endpoints

| Region | Amplitude Dashboard host |
|---|---|
| `us` | `https://amplitude.com/api/3/chart/<id>/query` |
| `eu` | `https://analytics.eu.amplitude.com/api/3/chart/<id>/query` |

Notion: `POST https://api.notion.com/v1/pages`.

---

## 4. Required Notion database schema

The target database must contain these properties (case-sensitive):

| Property | Type |
|---|---|
| `Title` | Title |
| `Date` | Date |
| `Total Events` | Number |
| `Series Count` | Number |
| `Series Labels` | Text |
| `Source` | Text |
| `Chart ID` | Text |

A new row is created per run with:

- `Title` = `YYYY-MM-DD — owner/repo`
- `Date` = today (UTC)
- `Total Events` = sum of all numeric values across all series
- `Series Count` = number of series in the chart response
- `Series Labels` = comma-joined series labels (truncated to 1900 chars)
- `Source` = `${GITHUB_REPOSITORY}` (or `midnghtsapphire/revvel-standards` locally)
- `Chart ID` = the configured chart id

---

## 5. Verification

1. *Settings → Secrets and variables → Actions* — confirm all four secrets exist and `AMPLITUDE_CHART_ID` is set.
2. In Notion: open the target database → ▼ → *Add connections* → select the integration tied to `NOTION_API_KEY`.
3. *Actions → Amplitude → Notion Agent → Run workflow* with `dry_run: true`. Confirm the job logs the would-be Notion payload and exits 0 without writing.
4. Re-run with `dry_run: false`. Confirm a new row appears in the Notion database titled `YYYY-MM-DD — midnghtsapphire/revvel-standards`.

---

## 6. What is *not* sent

- **No event-level Amplitude data** is forwarded to Notion. Only aggregate counts and the series labels you defined in your saved chart.
- No raw issue/PR titles, commit messages, comments, diffs, file contents.
- No secrets, no environment dumps.
- The agent never reads from Notion; it only appends.

---

## 7. Adopting in a sibling repo

1. Copy `.github/workflows/amplitude-to-notion.yml` and `scripts/amplitude-to-notion.js` into the sibling repo unchanged.
2. Provision the four secrets above (`gh secret set …`).
3. Set `AMPLITUDE_CHART_ID` (and optionally `AMPLITUDE_REGION` / `NOTION_VERSION`) as repo variables.
4. Share the Notion integration with the target database.
5. Trigger once via `workflow_dispatch` to verify.

No code changes required. The `Source` column will reflect the sibling repo automatically.

---

## 8. Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Workflow logs `amplitude-to-notion skipped — missing env: …` | Secret/var not provisioned | See §3 |
| `Amplitude chart fetch failed: HTTP 401` | Wrong API/secret key, or chart in another project | Verify both keys belong to the project that owns the chart |
| `Amplitude chart fetch failed: HTTP 404` | Wrong `AMPLITUDE_CHART_ID` or wrong region | Re-copy chart id from URL; check `AMPLITUDE_REGION` |
| `Notion page create failed: HTTP 404` | Integration not shared with the database, or wrong DB id | In Notion: database → ▼ → *Add connections* |
| `Notion page create failed: HTTP 400 … property … does not exist` | DB schema missing a required property | Add the property per §4 |
