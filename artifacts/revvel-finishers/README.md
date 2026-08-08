# Revvel Finishers (seed package)

Script-first fleet that **finalizes** fragmented code, wires missing commerce last-mile, and ships sellable artifacts. All work follows `revvel-standards`.

## Intent

- Clean up unfinished products, bad merges, missing `products/dist` artifacts
- Prefer **scripts/CLI + GitHub Actions** over large agent fleets
- Keep an append-only memory (`memory/LEARNINGS.md`, `memory/RESEARCH_LOG.md`)
- Execute WRs in `ORDERED_WRS.md` order (0→1→2 money path first)

## Layout

| Path | Role |
| --- | --- |
| `SYSTEM_PROMPT.md` | Operator contract for every finisher session |
| `ORDERED_WRS.md` | Deployment sequence (do not scramble) |
| `memory/LEARNINGS.md` | Append-only vaccines |
| `memory/RESEARCH_LOG.md` | Append-only web research log |
| `templates/WR-FINISHER.md` | WR shape |
| `scripts/audit-404s.sh` | Fail-closed live URL probe |
| `scripts/organize-chat.sh` | Chat → ordered deployment wrapper |
| `.github/workflows/grok-pr-review.yml` | Optional PR review action |

## Chat → correct deployment

Huge research chats (for example the Finisher thread attached to WR-16924) are filtered and organized by:

- **CLI:** `../../scripts/chat-deployment-organizer.js`
- **SaaS UI:** `../../products/chat-deployment-organizer` (port 3012)
- **WR pack:** `../wrs/`

## Bootstrap checklist

1. Create empty GitHub repo `revvel-finishers` (or keep this seed under `artifacts/`).
2. Copy this directory to the new repo root.
3. Grant GitHub App / connector access.
4. Run Finisher-1 builders before Gumroad (Finisher-2).

## Validation

```bash
bash scripts/audit-404s.sh
node ../../scripts/chat-deployment-organizer.js --input /tmp/sample.txt --format markdown
```

From monorepo root, root `npm test` covers the organizer engine.
