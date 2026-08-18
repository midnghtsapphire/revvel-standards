# WR Title Autocreate

**Status:** Active  
**Issue:** #16923  
**Source of truth:** [`config/wr-title-templates.yml`](../config/wr-title-templates.yml)  
**Engine:** [`scripts/wr-autotitle.js`](../scripts/wr-autotitle.js)  
**Workflow:** [`.github/workflows/wr-autotitle.yml`](../.github/workflows/wr-autotitle.yml)  
**UI app:** [`products/wr-title-studio`](../products/wr-title-studio)

## What problem this solves

Typing long, messy Work Request titles by hand is slow and noisy:

```text
[WR]  huge implementation research and filter and organize the chat into the correct deployment
```

This system:

1. **Cleans** titles (double spaces, embedded `/dragnet`, raw URLs, nested `[WR]`).
2. **Suggests** a templated title from common patterns mined from historical WRs
   (fleet maintenance, wire in, ship to market, deep research, fix CI, add, create…).
3. **Exposes** one-click starters via GitHub saved replies and a small studio app.
4. **Responds** to the comment slash command `/wr-title` (optional `force`).

No LLM is required. The path is deterministic and keyless.

## How titles are chosen

| Signal | Behavior |
| --- | --- |
| Title already clean (`[WR] ` + no noise + ≤ max length) | Leave it alone (unless `/wr-title force`) |
| Double spaces / slash commands / URLs | Light normalize |
| Keywords match a template | Rewrite with that template + subject |
| Sparse title + Summary body section | Seed suggestion from Summary |
| Nothing else | Generic clean + `[WR]` prefix |

Max length default: **100** characters (see `defaults.max_length` in the registry).

## Human paths (click-by-click)

### A. Use a saved-reply title starter when opening a WR

1. Open <https://github.com/settings/replies>.
2. Add each starter from [`docs/SAVED_REPLIES.md`](./SAVED_REPLIES.md) (the rows whose title begins with `WR title:`).
3. Open **Issues → New issue → Work Request**.
4. In the title box, delete the bare `[WR] ` if you will paste a full starter.
5. Open the comment/title saved-reply picker (left-pointing reply arrow in a
   comment box — for the **title** field, paste from your notes or from the
   studio app; GitHub only injects saved replies into comment bodies).
6. Prefer: open [WR Title Studio](../products/wr-title-studio/README.md), click
   a starter, click **Copy title**, paste into the issue title field.
7. **Success looks like:** title is one line, starts with `[WR] `, no double
   spaces, no `/dragnet` in the title.

### B. Fix a messy title on an existing WR with `/wr-title`

1. Open the Work Request issue.
2. Scroll to the comment box at the bottom.
3. Type exactly:

   ```text
   /wr-title
   ```

   Or to force a full template rewrite even when the title already looks clean:

   ```text
   /wr-title force
   ```

4. Click **Comment**.
5. **Success looks like:** a bot comment `## WR title autocreated` appears and
   the issue title updates within about a minute.

### C. CLI / agents

```bash
# Validate registry
node scripts/wr-autotitle.js --check

# Clean one title
node scripts/wr-autotitle.js --clean "[WR]  fix ci asap"

# Suggest (JSON) from title + body
node scripts/wr-autotitle.js --suggest --title "[WR] need ability to add X" --body "..."

# Mine common patterns from local issue dumps
node scripts/wr-autotitle.js --mine wr/issues --top 20
```

### D. Studio app (browse / copy)

```bash
cd products/wr-title-studio
npm install
npm run dev -- -p 3012
```

Open <http://localhost:3012>, paste a messy title, click **Suggest**, copy the result.

## Refining templates from real WRs

1. Run `node scripts/wr-autotitle.js --mine wr/issues --top 30`.
2. Inspect top unigrams/bigrams.
3. Edit `config/wr-title-templates.yml` (`templates` + `starters`).
4. Mirror new starters into `config/saved-replies.yml` and `docs/SAVED_REPLIES.md`.
5. Run `node --test tests/wr-autotitle.test.js tests/saved-replies.test.js`.

Junk titles still get cleaned first (`normalizeSubject`) before templating, so
noisy historical data does not ship into new titles as-is.

## Workflow wiring

`.github/workflows/wr-autotitle.yml` listens for:

- `issues` opened/edited (WR-looking issues only)
- `issue_comment` containing `/wr-title` or `/title`
- `workflow_dispatch` with an issue number

It never touches pull requests.

## Related

- Title → full WR expansion: [`workflows/TITLE_TO_WR_EXPANSION.md`](../workflows/TITLE_TO_WR_EXPANSION.md)
- Saved replies registry: [`docs/SAVED_REPLIES.md`](./SAVED_REPLIES.md)
- WR field filler (body fields, not titles): `scripts/wr-fill-fields.js`
