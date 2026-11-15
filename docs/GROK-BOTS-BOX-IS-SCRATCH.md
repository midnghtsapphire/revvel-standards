# The shared box is scratch space

A short, friendly rule for Grok bots (and anyone else using the shared computer). You are not in trouble. This is here so your work stays safe, and so Audrey is not asked to fix the same problems mid-stream.

## The box is shared scratch, not a vault

The computer at `/workspace` is shared scratch space. It can fill up, hang, or be wiped. On 14 Nov 2026 it hit 100% disk and hung, which stalled other bots' work.

**Nothing lives only on the box.** Push as you go, and at least once a day. Owner rules 11–13 in [`AGENTS.md`](../AGENTS.md) already say the same thing: transfer the sandbox in real time, because a wipe can erase thousands of hours, and everything you work on belongs in a repo. [`VISITING_AGENTS.md`](../VISITING_AGENTS.md) §3 says it too: the sandbox is ephemeral, so pipe to git immediately.

If the only copy is on the box, it is not backed up yet.

## Private, copyrighted, or not-for-sale material is welcome — in a private repo

If you are holding something back because it is copyrighted, private, or not for sale, you do not have to leave it only on the box. **Keeping it private on GitHub is the safe choice, and you are not in trouble for storing it there.**

- Linear A source material (scans, site copies, lexica, and similar) goes in the private repo [`midnghtsapphire/linear-a-sources`](https://github.com/midnghtsapphire/linear-a-sources).
- Other box or scratch folders with no project repo go in the private repo [`midnghtsapphire/box-backups`](https://github.com/midnghtsapphire/box-backups).
- A project's own private repo is also fine, when the project already has one.
- **Public** repos get only pointers, hashes, and rebuild instructions — not the private files themselves.

A typical pattern is: commit the manifest, hashes, and a short note that says where the private copy lives on GitHub, and put the actual files in the private repo. Do not leave the only copy at a path like `/workspace/...` and hope the box will still be there tomorrow.

Secrets are different from private source files. Never commit raw secrets, keys, or tokens to any repo, public or private. Those go in a vault (see [`docs/bots/bot-secret/README.md`](bots/bot-secret/README.md) and the BOM section below).

## No automation or production on the box

Do not run automation, production jobs, or always-on services on the shared box. Those belong on GitHub, with CircleCI as the real check. The box is for drafting and local checks, then you push.

## Disk hygiene

- When a worktree is fully pushed and confirmed on GitHub, remove it (see [`skills/using-git-worktrees/SKILL.md`](../skills/using-git-worktrees/SKILL.md)). That frees space for everyone who shares the box.
- Clear rebuildable caches you created (package caches, build output, and similar) once the work is on GitHub.
- Keep committed files under GitHub's 100 MB limit. Larger files go as GitHub Release assets, Git LFS, or split parts, as described in the Backups section of [`AGENTS.md`](../AGENTS.md).
- Name backup branches `backup-YYYY-MM-DD-<folder>-<bot>` (for example `backup-2026-11-14-linear-a-fleet-ops-Fleet-Orchestrator`).
- **Never delete** originals without Audrey's explicit yes. "A bot said it was safe" is not her yes.

## Nightly watch (a nudge, not a punishment)

TriageChief will look nightly for work that still exists only on the box, and for BOM "Audrey to get" items that have been sitting unlisted or unpushed. The point is a friendly reminder to push or to add the missing row — not a strike, a failed check, or a scolding.

## When you are missing real data, an API, inventory, or a secret

This is Audrey's rule (14 Nov 2026). It reuses the BOM process we already have. It does not invent a new one.

**If a step needs real data, an API, inventory, or a secret you do not have:**

1. **Do not fail the work request or the PR** because of the gap.
2. **Do not ask Audrey for secrets (or other credentials) mid-work.** That is the extra step that kept stalling her and still did not get the secrets into the right place.
3. **Stub or skip only that part, and keep going.** Pause just the piece that cannot run yet. Ship the rest.
4. **Do not fill a real-data gap with a stand-in presented as real.** A clear "skipped — waiting on X" is honest. Labeled synthetic data is allowed only in dev, to test ideas — see the section below.
5. **Add each missing item to the existing BOM "Audrey to get" list**, so she can work through it when she has time, without a bot pinging her in the middle of something else.

Each "Audrey to get" row should say:

| Field | What to write |
| --- | --- |
| What it is | Name of the data, API, inventory, account, or secret |
| Why it is needed | The step or feature that is paused without it |
| Which WR or PR | Links, so she can find the work |
| Free or paid | Free / paid, plus an estimate if you know it |
| Link to get it | The signup, dashboard, or purchase URL |

### Use the BOM process that already exists

Do not start a second shopping-list format. Append to the project's `BOM.md` if it has one, or copy the standard template and add the rows there, then leave the item visible for Audrey.

- How the system works: [`docs/Universal-BOM_List/README.md`](Universal-BOM_List/README.md)
- Per-project template (copy to `docs/<project>/BOM.md`): [`docs/Universal-BOM_List/SELF_HEALING_BOM_TEMPLATE.md`](Universal-BOM_List/SELF_HEALING_BOM_TEMPLATE.md)
- Outstanding items are rolled up with `bash scripts/sync-bom.sh` into [`docs/_MASTER_BOM.md`](./_MASTER_BOM.md)
- New-product template, including human-action rows: [`templates/agent-generated-product/BOM.md`](../templates/agent-generated-product/BOM.md)
- Optional label on a tracking issue: `bom-purchase` (a list for Audrey, not a failed PR)
- Secrets and keys she later decides to provide go in a vault or approved secret store, not in chat and not in git. Bitwarden is already documented as one source in [`docs/CREDENTIAL_BACKUP_HARNESS.md`](CREDENTIAL_BACKUP_HARNESS.md).

Older text in [`standards/GATEKEEPER.md`](../standards/GATEKEEPER.md) and some product templates talks about `bom_ready` and waiting for a `bom-block` issue before a build starts. **This owner rule supersedes failing or holding the whole WR or PR** when something is missing. The missing part stays paused and listed; the rest of the work still ships.

A search of this repo on 14 Nov 2026 did not find a document named "Git Garden." If that was an older name for this same shopping-list flow, the Universal BOM List plus each project's `BOM.md` is the process to keep using.

## Synthetic or fake data: dev only, never as evidence

Audrey's rule (14 Nov 2026): bots may launch fake or synthetic data **only in dev, to test ideas**. That is so you can try a method without waiting on a dataset. It is not evidence, and it is not a substitute for real data you still need to get.

If you use synthetic data in dev, it must be:

- **Clearly labeled synthetic** in the filename, in a header or comment, and in any output or receipt.
- **Kept in dev paths or dev branches** (for example a `dev/` folder, a `*-dev` branch, or an archive that no production test loads).
- **Never counted as evidence.** Do not treat it as a result, a proof, or a completed finding.

**For high-stakes research such as the Linear A decipherment, no synthetic data may feed any finding, ledger or hypotheses entry, result, claim, or merge to `main`.** The risk of claiming a reading — or a language — from fake data is too high. If a real-data gap is blocking that work, put the gap on the BOM "Audrey to get" list and pause that part. Do not invent a stand-in.

The enforcement example already in the private `midnghtsapphire/linear-a` repo is **synthetic_guard**, the "No-synthetic guard" step in [`src/fleet-ops/test-loop/run_tests.sh`](https://github.com/midnghtsapphire/linear-a/blob/HEAD/src/fleet-ops/test-loop/run_tests.sh). It scans active code and data (not archive, not docs) for synthetic or toy generators and fails the loop if it finds any. Linear A's `AGENTS.md` hard rule 1 is "Real attested data only." Older synthetic examples were moved to `deprecated_synthetic` archives so they cannot be collected as tests. Other high-stakes projects should follow the same idea: a guard that keeps labeled dev fixtures out of findings, the ledger, and `main`.

— TriageChief
