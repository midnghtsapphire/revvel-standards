# Fieldwork Extraction Runbook

Executes the approved proposal
[`docs/proposals/approved/fieldwork-extraction-and-pdf-products.md`](proposals/approved/fieldwork-extraction-and-pdf-products.md):
move `fieldwork/` out of `revvel-standards` into its own repo
(`midnghtsapphire/fieldwork`), with **full git history preserved**.

> **Why this is a runbook, not a single PR:** the final steps create and push to
> a *new* repository. The agent that prepared this is scoped to
> `revvel-standards` only and cannot create or push to another repo — so those
> cross-repo steps are listed here for you (or a broader-scoped agent) to run.
> Nothing is deleted from `revvel-standards` until the new repo exists (Step 4).

## What's already prepared

- **`fieldwork-split`** branch (pushed to `revvel-standards`) — a
  history-preserving [`git subtree split`](https://git-scm.com/book/en/v2/Git-Tools-Subtrees)
  of `fieldwork/`, with the product files at the **root** and all 200+ commits
  that ever touched `fieldwork/`. This is what becomes the new repo's `main`.

## Steps

### 1. Create the empty repo

```bash
gh repo create midnghtsapphire/fieldwork --private --description "FieldWork — SaaS for architects & contractors"
```

### 2. Push the prepared history into it

```bash
git clone https://github.com/midnghtsapphire/revvel-standards.git rs-tmp
cd rs-tmp
git fetch origin fieldwork-split
git push https://github.com/midnghtsapphire/fieldwork.git fieldwork-split:main
```

`midnghtsapphire/fieldwork` now contains the product with full history. Verify it
looks right (README, index.html, docs/) before Step 4.

### 3. Stand up the new repo's deploy

In `midnghtsapphire/fieldwork`, add its own deploy (Vercel/DO/Pages) pointed at
`fieldwork.oaudrey.com`. Copy the relevant bits from `revvel-standards`'
`.github/workflows/deploy-oaudrey.yml` (the `fieldwork/**` path filter and the
`fieldwork.oaudrey.com` summary line) and re-root them for the new repo.

### 4. Remove `fieldwork/` from `revvel-standards` (only after Steps 1–3 pass)

Open a PR on `revvel-standards` that:

1. `git rm -r fieldwork/`
2. Edits `.github/workflows/deploy-oaudrey.yml` — drop the `fieldwork/**` path
   trigger (line ~8) and the `| FieldWork | https://fieldwork.oaudrey.com |`
   summary row (line ~95), since deploy now lives in the new repo.
3. Updates cross-references that point at `fieldwork/` as a local dir (e.g.
   `docs/GITKRAKEN_INTEGRATION.md`) to point at the new repo URL.
4. Moves the proposal to `docs/proposals/shipped/` (the terminal success state).

Keep that removal PR **draft until Step 2 is verified** — deleting the only copy
before the new repo has it would lose the product.

### 5. Clean up

```bash
git push origin --delete fieldwork-split   # the prep branch is no longer needed
```

## Rollback

Nothing here is irreversible until Step 4 merges. If anything looks wrong, delete
the new repo and the `fieldwork-split` branch; `revvel-standards` is untouched.
