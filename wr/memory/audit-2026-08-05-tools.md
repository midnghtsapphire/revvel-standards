# Audit 2026-08-05 — toolchain & method memory

Per `skills/repo-audit/SKILL.md` output contract item 2: durable notes on
*how* this audit found what it found, for the next audit to reuse or
improve on.

## What worked well

1. **`gh run list --workflow=<file>.yml --json conclusion,createdAt` is the
   single highest-signal command in this whole audit.** Static repo analysis
   (grep for script references, workflow triggers, dependency diffs) finds
   *wiring* gaps but is blind to *silently-failing-despite-being-wired*
   gaps. `update-project-dashboard.yml` (WR-02) looked perfectly healthy
   from static analysis alone — real cron trigger, real script, real
   `git push` — and was in fact failing 100% of the time for 15+ days. Any
   future audit should run this command against every `schedule:`-triggered
   workflow, not just the ones that look suspicious from the YAML alone.
2. **`gh api repos/<repo>/actions/jobs/<id>/logs` (raw log, not `gh run view
   --log-failed`)** was necessary to get the actual git/GH013 error text —
   `--log-failed` returned nothing useful for this failure shape (the
   failing step's own stdout still had the error, but the CLI's failed-step
   filter didn't surface it cleanly). `grep -n -i "push\|error\|fatal" <log>`
   over the raw log found it immediately.
3. **`gh api repos/<repo>/rulesets` + `gh api repos/<repo>/rulesets/<id>`**
   confirmed the exact rule types and bypass actors — turns "push was
   rejected" into "push was rejected *because of this specific rule*, and
   *this specific actor type* would have bypassed it," which is what made
   the `ADMIN_GITHUB_TOKEN` fix concrete instead of speculative.
4. **`git blame -L <range> -- <file>`** on a small suspicious range (not the
   whole file) is cheap and immediately separates "this looks wrong" from
   "this looks wrong *and here's exactly when and in what commit it broke*"
   — used for both WR-02 (branch ruleset context) and WR-04 (duplicate JSON
   key, pinpointed to a same-day commit).
5. **Cross-referencing a script's own header-comment promises** (named test
   files, named companion workflows) against what actually exists on disk
   is a cheap, mechanical way to find WR-01/WR-06/WR-07-shaped gaps — greп
   for `tests/*.test.js` and `.github/workflows/*.yml` filenames mentioned
   inside `scripts/**` docstrings and `skills/**/SKILL.md`, then `test -f`
   each one.
6. **Always re-run `npm ci` (not just `npm install`) at least once per
   audit** — `npm install` silently tolerates and "fixes" lockfile drift
   that `npm ci` (what CI actually uses) will hard-fail on. This audit found
   a real `npm ci`-breaking lockfile drift (WR-04) purely because `npm ci`
   was tried first and failed before falling back to `npm install`.

## False leads this audit ruled out (don't re-flag without new evidence)

- "`@octokit`, `tar`, `unzipper` are undeclared dependencies" — false
  positive from a regex that matched comment text and scoped-package
  syntax; all three are correctly declared in `devDependencies`.
- "`ship-to-market.yml` references a missing `scripts/record.js`" — real,
  but guarded by `if [[ -f ... ]]` so it fails safe (see WR-05); don't
  re-flag this as an active break, only as an unimplemented-feature note.
- "42 workflows are `workflow_dispatch`-only, therefore broken" — most of
  these are the deliberate, owner-requested 2026-07-25 "quiet mode" change
  (PR #16805, ~80 machine PRs/day and ~$400/week OpenRouter cost). **Do not
  recommend re-enabling schedules on these without explicitly flagging the
  cost/volume tradeoff to the owner** — check `git log -1 --format=%ad -- 
  <file>` against 2026-07-25 first; if the commit date matches the
  quiet-mode PR, it's very likely intentional, not a fresh finding.

## Suggested next audit's starting point

- Re-run `gh run list --workflow=<file>.yml --json conclusion,createdAt
  --limit 100` for every `schedule:`-triggered workflow in the repo (189+
  files as of this audit) — this audit only checked the ones already under
  suspicion from other angles (state.json staleness). A full sweep would
  very likely find more `update-project-dashboard.yml`-shaped gaps (real
  trigger, silent 100%-failure push rejection) that static analysis alone
  cannot see.
- Follow up on WR-08's proposed "auto-file `wr/pending/**/*.md` as issues"
  workflow once the owner has reviewed/archived the stale portion of the
  current backlog.
- Check whether `automation-doctor.js`'s duplicate-JSON-key and
  named-test-file-must-exist checks (proposed as vaccines in WR-04 and
  WR-01/WR-06) got implemented; if not, they remain open follow-ups.
