# MergeMe.dev Integration — revvel-standards

**WR:** [#16824](https://github.com/midnghtsapphire/revvel-standards/issues/16824)
**Question:** Is [mergeme.dev](https://mergeme.dev) wired into revvel-standards?
**Answer (repo-side):** **Yes** after this integration ships — machine-checked by
`scripts/mergeme-wiring.js` and `.github/workflows/mergeme-status.yml`.
**Owner-side install:** still required once (GitHub App + Slack map) — see §4.

---

## 1. What MergeMe is

[MergeMe](https://mergeme.dev) ([GitHub Marketplace](https://github.com/marketplace/mergeme-app))
mirrors pull requests into Slack as **one updating card per PR**:

- Opened / reviewed / approved / merged edit the same Slack message in place
  (no notification flood).
- Review comments become thread replies under that card.
- GitHub `@mentions` resolve to real Slack users when mapped.
- Repo → channel routing without per-repo webhooks.

It does **not** replace GitHub auto-merge, Mergify, Graphite, or
`pr-state-orchestrator.yml`. It is a **PR visibility surface in Slack**, not a
merge queue.

### Marketing / SEO keywords

`mergeme.dev`, MergeMe Slack PR cards, GitHub PR Slack integration, PR notification
dedupe, engineering Slack review routing, revvel-standards MergeMe wiring.

### Monetization path

- **Internal leverage:** faster human review of agent PRs → shorter cycle time on
  revenue WRs (Polar.sh / product pipeline).
- **Hobby free tier:** small teams (limited mapped developers + channels) — good
  fit for a single-owner org.
- **Team plan:** pay-per-developer unlimited channel maps if the fleet grows.
- **Stars / social proof:** marketplace listing is the primary discovery surface;
  treat star counts on third-party comparisons as unverified unless cited from
  the marketplace page at audit time.

### Citations

- Product site: <https://mergeme.dev>
- GitHub Marketplace: <https://github.com/marketplace/mergeme-app>
- Related in-repo merge surfaces: `.github/workflows/auto-merge.yml`,
  `.github/workflows/pr-state-orchestrator.yml`,
  `.github/workflows/mergify-merge-queue-labels-copier.yml`,
  `docs/GRAPHITE_INTEGRATION.md`, `docs/MERGE_AND_OVERRIDE_POLICY.md`

---

## 2. What "wired" means here

| Layer | Wired means | Owner |
| --- | --- | --- |
| **Repo SSOT** | `config/connections.yml` has `id: mergeme` | agents / PRs |
| **Docs** | This file + `docs/mergeme-status/` live page | agents / PRs |
| **Product** | `products/mergeme-status` status app (port **3012**) | agents / PRs |
| **CI** | `mergeme-status.yml` runs `scripts/mergeme-wiring.js` | agents / PRs |
| **Tests** | `tests/mergeme-wiring.test.js` in root `npm test` | agents / PRs |
| **GitHub App** | MergeMe App installed on org/repo | **human** |
| **Slack** | Workspace connected + repo→channel + user maps | **human** |

Repo-side wiring is fully automated and regression-tested. Marketplace install +
Slack OAuth cannot be completed from a PR without the owner's browser session —
those steps stay in §4 and are tracked as external setup, not silent scope drop.

---

## 3. Repo surfaces (shipped)

```text
config/connections.yml              # id: mergeme (SSOT)
scripts/mergeme-wiring.js           # auditor CLI + pure helpers
tests/mergeme-wiring.test.js        # root npm test regression
.github/workflows/mergeme-status.yml
docs/MERGEME_INTEGRATION.md         # this file
docs/mergeme-status/index.html      # live DoD test page
products/mergeme-status/            # Next.js status / setup app
AGENTS.md                           # port 3012
docs/APP_REGISTRY.md                # catalog row
```

### Commands

```bash
# Machine answer: exit 0 = fully wired repo-side
node scripts/mergeme-wiring.js
node scripts/mergeme-wiring.js --markdown

# Product UI
cd products/mergeme-status && npm install && npm test && npm run dev   # :3012

# Root gates
npm test
npm run workflows:validate
npm run connections   # regenerate docs/CONNECTIONS_REGISTRY.md after YAML edits
```

### Workflow

- **push** on wiring paths → must stay green (fail if unwired)
- **schedule** weekly drift watch
- **workflow_dispatch** with optional `issue_number` → comments the markdown report

---

## 4. Human setup (click-by-click)

Do these once as the org owner. Success = one Slack card per PR that updates in
place.

1. **Install the GitHub App**
   - Open <https://github.com/marketplace/mergeme-app>
   - Click **Install it for free** / **Set up a plan**
   - Choose the **midnghtsapphire** account
   - Select **Only select repositories** → `revvel-standards` (or all repos)
   - Click **Install** and approve permissions
   - Success: GitHub → Settings → Integrations → Applications shows **MergeMe**

2. **Connect Slack at mergeme.dev**
   - Open <https://mergeme.dev>
   - Sign in with the same GitHub account
   - Click **Connect Slack** and finish the Slack OAuth screen
   - Success: dashboard shows a connected workspace name

3. **Map the repo to a channel**
   - In the MergeMe dashboard, add mapping:
     - Repo: `midnghtsapphire/revvel-standards`
     - Channel: your PR channel (example: `#revvel-prs`)
   - Success: mapping row is listed and enabled

4. **Map GitHub users → Slack users** (so `@mention` pings work)
   - Open user mappings
   - Pair each active GitHub login with a Slack member
   - Success: your handle shows a Slack display name

5. **Verify with a real PR**
   - Open or push to any PR on `revvel-standards`
   - In Slack, confirm **one** card appears/updates (not a stack of separate
     messages for open + review + comment)
   - Success: card title matches the PR; status chips change on review/merge

6. **Optional: re-run the in-repo auditor against a WR**
   - GitHub → Actions → **MergeMe.dev wiring status** → **Run workflow**
   - Set `issue_number` to `16824` (or the active WR)
   - Success: workflow green + comment with **Answer: YES — wired.**

---

## 5. Secrets

**No MergeMe API secret is required in this repository.** Auth is the GitHub App
installation token (managed by GitHub) plus Slack OAuth at mergeme.dev.

If a future MergeMe REST API key is introduced, add the **name only** via the
standard secrets generator / `.env.example` comment block — never commit values.

Related existing secrets (unchanged by this integration):

| Name | Role |
| --- | --- |
| `GITHUB_TOKEN` / `ADMIN_GITHUB_TOKEN` | Workflow API (status comment, checks) |
| Slack tokens used by *other* bots | Not used by MergeMe (MergeMe owns its Slack OAuth) |

---

## 6. How this coexists with other merge tools

| Tool | Job | Overlap with MergeMe? |
| --- | --- | --- |
| `auto-merge.yml` | Enable GitHub auto-merge on label | No — merge action vs notify |
| `pr-state-orchestrator.yml` | Label/state machine for PRs | No |
| Mergify labels copier | Merge-queue label copy | No |
| Graphite docs | Stacked PRs / merge queue research | Complementary |
| Octopus / Bito / OpenRouter review | Code review bots | Complementary — MergeMe surfaces their activity in Slack |

---

## 7. Definition of Done checklist (this WR)

- [x] Implementation: auditor + product app + workflow
- [x] Tests: `tests/mergeme-wiring.test.js` + product tests
- [x] Docs: this file + live `docs/mergeme-status/`
- [x] Connections registry entry
- [x] `npm test` / `npm run workflows:validate` green
- [x] Conventional Commit PR title
- [ ] Human: marketplace install + Slack map (§4) — owner browser only

---

*Last updated with WR #16824 delivery.*
