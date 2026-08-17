# Claude Session Capability Manifest (claude.ai chat)

What the claude.ai chat lane can and cannot do against this org, as observed 2026-07-20. Note: Claude's system prompt, internal reasoning, and Anthropic skill files are not exportable and are intentionally absent.

## Lanes
| Lane | Auth | Can | Cannot |
|---|---|---|---|
| GitHub MCP (api.githubcopilot.com/mcp/) | OAuth | reads: PRs, issues, files, commits, user | writes 403: merge, issue create/update, comments |
| Zapier GitHub bridge | Zapier account | create branch/file/PR/issue, update PR/issue, submit review | merge (no action exists); quota-limited (402 when tasks exhausted) |
| Claude Code (laptop) + PAT | fine-grained PAT (Contents RW, PRs RW) | full incl. merge | n/a — use for anything the other lanes 403 |

## Other connected tools (this account)
Sentry (reads), Vercel, ClickUp, Gmail, Google Calendar/Drive, Notion, Airtable, monday.com, Figma, Canva, Slack, HubSpot, alphaXiv/bioRxiv/Clinical Trials, Hugging Face. Plus sandbox compute (bash/Python, file creation) and web search.

## Known failure modes hit this cycle
- OAuth integration 403 on all repo writes → route writes via Zapier or PAT lane
- Zapier 402 "insufficient tasks" on quota exhaustion → top up or PAT lane
- Unauthenticated api.github.com rate-limits from sandbox → use authenticated lanes
- OpenRouter credit exhaustion stalled agents instead of Perplexity keyless failover (see #16467)

## Zapier Skills registered
- wr to pr revvel-standards
- wr followup issue revvel-standards
