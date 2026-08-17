# Branch Update Guide — Pros, Cons & Caveats

> **When does this apply?** Any time a WR or feature branch needs to be brought
> up-to-date with `main`, or when you're deciding whether to merge `main` into your
> branch vs. waiting for it to land on its own.

---

## The Core Question

> Should I update my branch from `main` right now?

This guide helps you answer that, explains both methods (merge vs. rebase), and
covers what the self-healing `update-main` job does automatically.

---

## 1. Why Branches Diverge

When you (or automation) create a WR branch (`wr/issue-N-title`), it forks from
`main` at that moment. While your WR work happens:

- Other PRs merge into `main` (CI fixes, other WRs, config changes).
- Your branch doesn't automatically receive those changes.
- Eventually, GitHub shows **"This branch is out-of-date with main"** or
  **"This branch has conflicts with the base branch"**.

---

## 2. Method A — Merge (Recommended for WR Branches)

### What happens

A new "merge commit" is created on your branch that combines `main`'s latest
state with your branch's state.

```text
main:       A -- B -- C -- D
                            \
your-branch: A -- B -- X -- [merge commit]
```

### How to do it

```bash
git fetch origin main
git checkout wr/issue-N-your-title
git merge origin/main
# If conflicts appear, resolve them, then:
git add .
git commit
git push origin wr/issue-N-your-title
```

**Via GitHub UI:**
GitHub shows a **"Update branch"** button on PRs when the branch is behind `main`.
Click it to trigger the merge automatically.

### ✅ Pros

- **Safe** — no rewrite of existing commits; history is preserved.
- **Reversible** — you can revert the merge commit cleanly.
- **Collaborative** — other contributors on the same branch won't have their
  local history invalidated.
- **No force-push needed** — a normal `git push` works.
- **GitHub auto-merge compatible** — GitHub's built-in "Update branch" uses
  merge; auto-merge also handles this path.

### ❌ Cons

- **Merge commits in history** — `main` will show "Merge branch 'wr/...' into
  main" entries if not squashed. (Our auto-merge always squashes, so this is
  largely invisible on `main`.)
- **Noisier PR diff** — The PR diff may include files changed in `main` since
  your branch started, making review harder.
- **Larger PRs** — The merge commit may carry unrelated changes from main into
  the PR's file list.

### Caveats

⚠️ **Resolve conflicts carefully** — Git marks conflicts with `<<<<<<` markers.
Read both sides before choosing. When in doubt, keep the `main` version and
re-apply your change on top.

⚠️ **Don't merge main into a branch that's already merged** — If your PR is
already closed/merged, there's nothing to update.

---

## 3. Method B — Rebase

### What happens

Your branch's commits are "replayed" on top of the latest `main`, as if you had
started from the current `main` instead of the old one.

```text
Before:
  main:       A -- B -- C -- D
  your-branch: A -- B -- X -- Y

After rebase:
  main:       A -- B -- C -- D
  your-branch:              D -- X' -- Y'
  (X and Y are rewritten as X' and Y')
```

### How to do it

```bash
git fetch origin main
git checkout wr/issue-N-your-title
git rebase origin/main
# Resolve any conflicts as they appear, then:
git rebase --continue   # repeat for each conflicting commit
git push --force-with-lease origin wr/issue-N-your-title
```

### ✅ Pros

- **Cleaner linear history** — No merge commits; easier to read `git log`.
- **PR diff is exact** — Shows only your changes, not `main`'s recent additions.
- **Easier cherry-pick** — Individual commits are self-contained.

### ❌ Cons

- **Rewrites commit SHAs** — All commits on your branch get new hashes. Anyone
  else with a local copy of the branch must reset: `git fetch && git reset --hard origin/<branch>`.
- **Force push required** — You cannot push without `--force` or `--force-with-lease`.
- **More conflicts** — Each commit is replayed individually; you may have to
  resolve the same type of conflict multiple times.
- **Harder to recover from mistakes** — If you mess up the rebase, recovery
  requires `git reflog` knowledge. Merge mistakes are easier to undo.
- **Breaks automation assumptions** — Some GitHub Actions assume the branch
  hasn't been force-pushed. CI may re-run unnecessarily.

### Caveats

⚠️ **Use `--force-with-lease` not `--force`** — `--force-with-lease` will refuse
to push if someone else has pushed to the branch since your last fetch, protecting
against accidental overwrites.

⚠️ **Never rebase `main` itself** — Only rebase on private feature/WR branches
that have no other contributors.

⚠️ **Coordinate with collaborators** — If another agent (Jules, OpenHands) is
working on the same branch, rebase will invalidate their local copy. Wait until
they're done or use merge instead.

⚠️ **Avoid on branches > 1 week old with many divergent commits** — The
more your branch and `main` have diverged, the worse a rebase gets. Merge is
safer when there are many conflicts.

---

## 4. When to Update vs. When to Wait

| Situation | Recommendation |
|-----------|---------------|
| GitHub shows "Update branch" (no conflicts) | Click the button — safe and fast |
| Your PR has conflicts | Update is required before merge can proceed |
| Your branch is 1–2 commits behind main, no conflicts | Optional — wait until you're ready to merge |
| Your branch is 50+ commits behind main | Update now — the longer you wait, the harder it gets |
| Two WRs touch the same file | Coordinate — one should merge first, then the other updates |
| Self-healing `update-main` added `auto-merge` to your PR | Verify the PR looks right before it merges |
| Your branch has automated commits (Jules) | Use merge, not rebase |

---

## 5. The `update-main` Self-Healing Process

The `update-main` job in `self-healing.yml` runs every 4 hours and:

1. Lists all open, non-draft PRs.
2. For each PR, checks:
   - At least 1 approving review.
   - All required CI checks are passing (green).
   - No `won't-merge` label.
3. For qualifying PRs, adds the `auto-merge` label.
4. `auto-merge.yml` picks up the label and enables GitHub's auto-merge (squash).

### ✅ What's good about it

- **Zero-click merges** — Approved+green PRs land on `main` without human action.
- **Clears backlogs** — After an outage or holiday, a sweep gets everything current.
- **Consistent squash** — Every merge is squash, keeping `main` history clean.
- **Respects safety signals** — Won't touch drafts, conflicted PRs, or PRs with
  `won't-merge`.

### ❌ What's risky about it

- **Merges things you forgot about** — If you approved a PR last week and never
  added `won't-merge`, the job will merge it. Keep PRs you're not ready to land
  labeled `won't-merge` or in draft.
- **Squash is irreversible** — Once squashed to `main`, the original branch
  commits are gone. If you needed that history, it's too late.
- **Can't fix conflicts** — If a PR is conflicted, the `auto-merge` label is added
  but GitHub won't merge until conflicts are resolved. You'll see the label on a
  PR that isn't merging; the issue comment will tell you why.
- **Admin token dependency** — Without `ADMIN_GITHUB_TOKEN`, the label addition
  uses `GITHUB_TOKEN` which may not cascade to `auto-merge.yml`.

---

## 6. Conflict Resolution Step-by-Step

When `git merge` or `git rebase` reports a conflict:

1. Open the conflicted file. Look for:

   ```text
   <<<<<<< HEAD (your branch)
   your change here
   =======
   main's change here
   >>>>>>> origin/main
   ```

2. Decide which version to keep (or combine both).

3. Remove the conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`).

4. Save the file.

5. Stage the resolved file:

   ```bash
   git add path/to/file.md
   ```

6. If merging: `git commit`  
   If rebasing: `git rebase --continue`

7. Repeat for each conflicted file.

8. Push when done.

### When conflicts are in auto-generated files

Some files (`dashboard-data.json`, `AUTOMATION-DOCTOR-REPORT.md`) are generated
by `npm test`. If these are conflicted:

1. Accept the `main` version (theirs).
2. Run `npm test` locally to regenerate.
3. Commit the freshly generated version.

---

## 7. Quick Decision Tree

```text
Is my branch conflicted with main?
  ├─ YES → Update branch is required before merge
  │         └─ Use: git merge origin/main (recommended)
  └─ NO
      ├─ Is main significantly ahead (>10 commits, touches same files)?
      │   └─ YES → Update preemptively (merge method)
      └─ NO → Skip update, open PR as-is
                └─ If PR is approved + green → auto-merge handles it
```

---

## 8. Safety Checklist Before Updating

- [ ] I know which method I'm using (merge vs. rebase).
- [ ] Nobody else is actively pushing to this branch right now.
- [ ] I have a local backup or the branch is pushed to GitHub.
- [ ] I understand which file changes are mine vs. main's.
- [ ] If rebasing, I know how to use `git reflog` in case I need to recover.
- [ ] The branch name starts with `wr/` or a recognized feature prefix (not `main`).

---

_Last updated: see git log. Part of the Dragnet WR playbook suite. Changes require a PR with the `docs:` prefix._
