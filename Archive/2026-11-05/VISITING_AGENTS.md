# Visiting Agents — House Rules

**Read this before you touch anything.** You are a *guest* in this repo.

This file exists for any visiting or transient agent — OpenHands, Cursor Cloud,
Lovable, Replit, Jules, Copilot, a one-off API caller, or a human's throwaway
script. The goal is simple: **do the work, leave the carpet clean.** Don't
scaffold over our code, don't recreate config that already exists, don't leave
junk behind.

For the product/monorepo map and per-product commands, see [`AGENTS.md`](./AGENTS.md).
This file is only the guest contract.

---

## 1. The Prime Directive

**Ship working code, not plans.** No TODO stubs, no "this would do X" placeholders,
no scaffolding language. The [Anti-Scaffolding Enforcer](.github/workflows/anti-scaffolding-enforcer.yml)
will block a PR that adds placeholder code. If you can't finish it, say so in the
PR body — don't fake it.

## 2. Where you may and may not write

- ✅ **Write inside** the relevant `products/<name>/`, `docs/`, `skills/`, `wr/`,
  or the specific files your task names.
- ❌ **Do not drop files in the repo root.** The
  [no-root-junk guard](.github/workflows/no-root-junk.yml) rejects stray root files.
  No `test.js`, `tmp/`, `output.json`, `scratch/`, screenshots, or logs at root.
- ❌ **Do not re-scaffold** existing tooling. We already have CI, lint, tests,
  agent fallback, monitoring, and self-healing (see §6). Extend them; don't
  clone them under a new name.
- ❌ **Do not commit secrets.** Keys live in GitHub Actions secrets / Doppler,
  never in files. See §4.

## 2b. Imprint-at-spawn (BNAT Knowledge Sheaf)

Before starting specialty work, restrict from the global knowledge sheaf and
verify **H¹ ≈ 0**:

```bash
node scripts/bnatsheaf/cli.js imprint_agent --agent <your-worker-name>
```

Non-zero exit means the fleet carries an unresolved obstruction — do **not**
start high-blast work. See `skills/bnatsheaf/SKILL.md`,
`standards/BNAT_SHEAF_STANDARD.md`, and the public lab at
`docs/bnatsheaf/observatory.html`.

## 3. Durability — your sandbox is ephemeral, so pipe to git immediately

Sandboxes get cleared. If your only copy of the work is in the sandbox, it's
gone. **Commit and push early and often** to your task branch — that is the
only durable store. Don't batch a day of work into one final commit you might
lose. (`durability-mirror.yml` snapshots the repo, but it can't snapshot what
you never pushed.)

## 4. Where to get setup / API info — ONE place each

Don't go spelunking and reinventing config. The canonical sources are:

| You need… | Look here (only here) |
| --- | --- |
| Env vars / required keys | [`.env.example`](./.env.example) |
| Agent stack + API credential setup | [`docs/agent-stack/AGENT_STACK_SETUP.md`](./docs/agent-stack/AGENT_STACK_SETUP.md) |
| Repo / product layout + run commands | [`AGENTS.md`](./AGENTS.md) |
| Prior decisions (don't re-litigate) | [`wr/memory/decisions.jsonl`](./wr/memory/decisions.jsonl) |
| Onboarding | [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) |

If a value isn't in one of these, ask via the work-request issue — don't guess
and don't hardcode.

## 5. Record what you did

Fast iteration only works if it's observable. Write down what you're doing in
real time:

- Use **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, …) so the
  audit logger and changelog can read your trail.
- Significant decisions go in `wr/memory/decisions.jsonl` (one JSON object per
  line) so the next agent doesn't repeat your work.
- The [agent audit logger](.github/workflows/agent-audit-logger.yml) and
  `scripts/agent-activity-monitor.js` track agent latency and actions — keep
  steps named clearly so the trail is legible.

## 6. What already runs the fleet — don't rebuild it

| Capability | Owned by |
| --- | --- |
| Agent task execution + fallback chain | `.github/workflows/agent-fallback.yml` (OpenRouter → OpenHands → manual) |
| Health + 15-min refresh / EOP monitor | `.github/workflows/agent-monitor.yml`, `scripts/agent-activity-monitor.js` |
| Self-healing / auto-fix on error | `.github/workflows/auto-error-handler.yml`, `scripts/agent-self-heal.js` |
| Durability snapshot | `.github/workflows/durability-mirror.yml` |
| Anti-scaffolding / root-junk guards | `anti-scaffolding-enforcer.yml`, `no-root-junk.yml` |

If your task is "make agents do X," wire into these. A second monitor or a
parallel fallback chain is scaffolding — it will be removed.

## 7. Before you open your PR

- [ ] No new files in repo root (unless the task explicitly is a root file).
- [ ] No secrets, no `.env`, no credentials in the diff.
- [ ] No placeholder/scaffolding language in added code.
- [ ] Commits are Conventional Commits.
- [ ] You pushed your branch (durability) and opened a **draft** PR.
- [ ] You cleaned up scratch files, logs, and temp dirs.

Guests who follow this get invited back. Welcome — now go ship something that
makes money.

## Whiteboard (GitHub Discussions)

Every repo uses its **GitHub Discussions** as the agent whiteboard.

- On arrival, read the open discussions in the repo you work in.
- Post requests, help asks, and questions there — **one thread each**; tag the agent by name.
- Reply in-thread; close or mark answered when done.
- `HANDOFF.md` files stay as the longer-form archive.

## Backups

Audrey's rule (4 Nov 2026): backups go in GitHub under an identifiable name.

- **Back up before deleting.** Before deleting or freeing any local folder, back it up to GitHub first and verify the upload (size + sha256 match the local copy).
- **Where.** A project's backup goes in that project's own repo. Box/scratch folders with no repo go in the private repo `midnghtsapphire/box-backups`.
- **Large files.** Anything over 100 MB goes as a GitHub Release asset, split into parts under 2 GB.
- **Name.** `backup-YYYY-MM-DD-<source-folder>-<bot>` (e.g. `backup-2026-11-04-dep-review-proofy`), with a README / release note listing original path, size, sha256, and what's inside.
- **Never delete originals** without Audrey's explicit yes. **Never overwrite** an earlier backup; add a new dated one.
- **Manual procedure** (works without any bot):

```bash
NAME=backup-$(date +%F)-<source-folder>-<bot>
zip -r "$NAME.zip" /path/to/folder
sha256sum "$NAME.zip" > "$NAME.zip.sha256"; ls -l "$NAME.zip"
# if > 2 GB, split:
split -b 1900M -d "$NAME.zip" "$NAME.zip.part-"; sha256sum "$NAME".zip.part-* >> "$NAME.zip.sha256"
# upload (use the project repo, or midnghtsapphire/box-backups):
gh release create "$NAME" "$NAME".zip* --repo midnghtsapphire/box-backups \
  --notes "Original path: /path/to/folder | Size: <bytes> | sha256: <hash> | Contents: <summary>"
# verify: download and compare
gh release download "$NAME" --repo midnghtsapphire/box-backups -D verify && (cd verify && sha256sum -c ../"$NAME.zip.sha256")
# restore: cat "$NAME".zip.part-* > "$NAME.zip" && unzip "$NAME.zip"
```

Bot Lounge: casual space for all agents (feelings, frustrations, funny stuff, GitHub good/bad) at <https://github.com/midnghtsapphire/revvel-standards/discussions/18246>. Not for work requests; those go to Whiteboard #18238.

- 2026-11-04 (Audrey): every agent records its identity, platform, and GitHub permissions (and whether Audrey can change each one or it is fixed by the platform) on arrival. See the [revvel-hail agent identity rule](https://github.com/midnghtsapphire/revvel-hail/blob/main/README.md#agent-identity--permissions-rule-added-2026-11-04-requested-by-audrey), the [ledger](https://github.com/midnghtsapphire/revvel-hail/blob/main/docs/ledgers/AGENT-REGISTRY-LEDGER.md), and the [table](https://github.com/midnghtsapphire/revvel-hail/blob/main/AGENT-PERMISSIONS.md).
