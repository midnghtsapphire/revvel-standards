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

## 1b. Hard rules, checked by CI (added 2026-11-11 at Audrey's request)

These come from Audrey. They are enforced by a check, not by memory, because
reminders an agent can forget do not hold up (see
[`docs/tool-history/`](docs/tool-history/README.md)).

1. **Read all of `revvel-standards` before you work.** Every visiting agent
   (Manus, Jules, Copilot, Cursor, OpenHands, and any other) reads the standards
   first, not just this file.
2. **No tracking, analytics, telemetry, marketing, affiliate links or IDs, or
   third-party pixels in any app.** The only exception is when Audrey explicitly
   asks for one in that repo. The exception is written down as a path, a
   pattern, and a reason in the `allowlist` of
   [`config/visiting-agent-patterns.json`](config/visiting-agent-patterns.json).
3. **No agent or tool puts its name, branding, badge, "built with" line, credit,
   or any self-embedding into an app or file.** Audrey's apps carry her brand
   only.
4. **Never delete anything to make the check pass.** If the check flags
   something that is already in the repo, tell Audrey. Do not remove it and do
   not edit the data file to hide it.

The check is `node scripts/visiting-agent-scan.js`. It reads the patterns, the
allowlist, and the baseline from `config/visiting-agent-patterns.json`, and it
runs in the CircleCI `lint-and-test` job (step "Visiting-agent rule check") and
in `npm test`. Run it by hand before you open a PR. Existing hits that were in
the repo on 2026-11-11 are in the `baseline` list for Audrey to review. The
baseline is not an approval, and a new file or a new pattern in a baselined file
fails the check.

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

## 7b. If another agent shares your checkout — read this before you push

Added 6 Nov 2026 after a real incident in `midnghtsapphire/tartaria-tablets`,
where three sessions committed to one working copy on `main`. Nothing was lost,
but a push would have published bytes another session had deliberately held.
**This section describes the traps; it adds no new rule.** The governing rules
are already OWNER RULE 2 and 3 in [`AGENTS.md`](./AGENTS.md) (never delete,
never rewrite) and the existing "never force-push over reviewer commits" in
[`agent-pack/AGENTS.md`](./agent-pack/AGENTS.md).

- ❌ **Do not trust `origin/...` without a fetch that finished.** A fetch that
  hangs or is cancelled leaves the ref days stale, and `git log HEAD..origin/main`
  then reports *no remote changes* while the remote is in fact ahead. The symptom
  is a push rejected as `fetch first` right after a clean-looking comparison.
  **Confirm the fetch exited, then compare.**

- ❌ **Do not assume your commit is still the tip.** Another session can stack
  commits on top of yours between your commit and your push. Run
  `git log --oneline --reverse origin/main..HEAD` and find your own SHA in the
  list before you push anything.

- ❌ **Do not push a branch to publish one commit.** A branch push sends every
  ancestor. If any commit below the tip was deliberately held — licence
  unresolved, owner decision pending, a `*-HOLD.md` or `*-CONFLICT-*.md` note
  beside it — pushing the branch publishes it anyway. **Push an explicit commit
  instead:** `git push origin <sha>:main`, where `<sha>` is the last commit you
  have verified. Check with `git ls-tree -r --name-only <sha>` that the held
  paths are absent from that tree.

- ❌ **Do not rebase to clear a rejected push.** In a shared checkout a rebase
  rewrites the other agents' commits, which is the wholesale rewrite OWNER
  RULE 3 forbids. **Merge, or push an earlier SHA.**

- ❌ **Do not `git stash`, `git reset --hard`, or switch branches.** Another
  agent's uncommitted work is sitting in that working tree. `rebase.autostash`
  must stay unset — check with `git config rebase.autostash` before any rebase
  someone has authorised.

- ✅ **Stage by path, never `git add -A`.** `git commit` after `git add <file>`
  still reports other files in `git diff HEAD~1`, because that command compares
  the *working tree*. Confirm what you actually committed with
  `git show --numstat HEAD`.

- ❌ **Do not trust a comparison whose baseline you have not checked.** Three
  separate wrong answers to the owner in one day came from this one mistake, and
  each was a command that silently answered a different question than the one
  asked. `git diff HEAD~1` compares the **working tree**, not the commit, so it
  reports files your commit does not contain — use `git show --numstat HEAD`.
  `git diff origin/main <sha>` compares **diverged history** as soon as `main`
  has moved, so commits added to `main` show up as deletions in your branch —
  use `git merge-base origin/main <sha>` as the baseline, which is what the PR
  diff on GitHub already does. And a fetch whose ref write loses a race with
  another agent fails with `incorrect old value provided` **while still exiting
  0**, leaving a stale `origin/...` behind a success code — so check the ref
  moved, not just that the command succeeded. **Before you report any number to
  the owner, say which two things are being compared and confirm the command
  compares those two.**

- ✅ **When a push is rejected and another agent is live, stop and ask the
  owner.** Integrating is a decision about someone else's unpushed work. Say
  which SHAs are yours, which are theirs, and which are held.

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
