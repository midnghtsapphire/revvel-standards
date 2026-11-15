# n8n

| Field | Value |
| --- | --- |
| Category | automation |
| Status | trial |
| First evidence found | 2026-04-23 |
| Latest evidence found | 2026-11-05 |
| Cost | free self-hosted |
| Verdict | RECORDED: n8n default in delivery-glue plan (oaudrey PR #4, 2026-11-05) |

Dates are the earliest and latest dated artifact found in the searched
repos, not adoption dates. See the [README](README.md) for what the verdict
labels mean.

## What it was used for

Local lab (oaudrey issue #9) moving finished work from GitHub to Google Drive; earlier WRs for n8n templates.

## What worked

- oaudrey PR #12 merged: n8n 2.46.6 + Postgres 17.11 lab, localhost only, smoke test passes.

## What did not work

- Compose version of the lab flagged by GitGuardian (see gitguardian.md).

## Why kept or dropped

Trial on her computer only. FOSS self-hostable option per docs/AUTOMATION_EXTENSIONS_INTEGRATION.md.

## Evidence

- [Automation extensions doc (2026-04-23)](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/docs/AUTOMATION_EXTENSIONS_INTEGRATION.md)
- [oaudrey PR #4: delivery-glue plan](https://github.com/midnghtsapphire/oaudrey/pull/4)
- [oaudrey issue #9](https://github.com/midnghtsapphire/oaudrey/issues/9)
- [oaudrey PR #12](https://github.com/midnghtsapphire/oaudrey/pull/12)
- [WR #14657: n8n and sellable pdfs](https://github.com/midnghtsapphire/revvel-standards/issues/14657)
- [n8n workflows folder](https://github.com/midnghtsapphire/revvel-standards/blob/8f3bd64eeee6dd3b207b66f8704f99565f1ca252/workflows/n8n/README.md)

## Open gaps for Audrey

- **Needs Audrey:** yes: whether the lab becomes production
- Go or no-go for production.
