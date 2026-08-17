# WR Markdown Lint Playbook — requirements, roadmap, and self-heal guide

**Why this exists:** the CircleCI changed-Markdown gate (`markdownlint-cli2`)
was failing on nearly every generated WR PR (issue #15604 — "fails everyday").
The failures always come from the same place: `wr-pr-creation.yml` stitches the
WR template together with the raw issue body and imported research packets, and
that pasted content carries markdown that violates repo lint rules. This
document is the permanent record of the error classes, their root causes, the
automated fix, and what to do when the gate still goes red.

## The recurring error classes (what not to do)

| Rule | Finding | Root cause in generated WRs | Automated fix |
| --- | --- | --- | --- |
| MD012 | Multiple consecutive blank lines | Header/findings blocks are concatenated with `echo ""` padding, and pasted issue bodies keep their own blank runs | Collapse runs of 2+ blank lines to one |
| MD025 | Multiple top-level headings | Imported research packets ship their own `# WR-Ready Research Packet: ...` H1 below the WR's `# WR: <title>` H1 | Demote every H1 after the first to an H2 |
| MD049 | Emphasis style (expected underscore, got asterisk) | WR templates establish underscore emphasis first (`_No response_`), then pasted packet text uses `*asterisks*` — MD049 enforces per-file consistency | Rewrite single-asterisk emphasis to underscore (strong `**bold**` untouched) |
| MD047 | File must end with a single newline | Concatenation leaves trailing blank padding | Trim to exactly one trailing newline |

## Requirements (the standing rules)

1. **Never hand-fix a generated WR for these findings and stop there.** The
   generator produces a new dirty file the next day. Fix the pipeline, not the
   artifact.
2. **Every writer of `wr/issues/*.md` must sanitize before committing.** The
   canonical sanitizer is `wr/scripts/sanitize-wr-markdown.mjs`. It is wired
   into:
   - `.github/workflows/wr-pr-creation.yml` — "Sanitize WR markdown" step,
     after "Generate WR document" and before validation/commit.
   - `wr/scripts/generate-wr.sh` — runs right before its `wr-lint.mjs` hard
     gate.
   If you add a new workflow or script that writes WR markdown, wire the
   sanitizer in the same way.
3. **The sanitizer must stay conservative.** It only rewrites prose *outside*
   fenced code blocks and inline code spans. Pasted logs, YAML, and source
   packets belong in fenced code blocks (see the existing wr-lint rule for
   bracket placeholders) — fence them, don't fight the linter.
4. **Lint config is the single source of truth.** `.markdownlint.jsonc` +
   `.markdownlintignore` define "clean". Do not add per-file rule disables to
   generated WRs; fix the generator or the config instead.
5. **A red gate on main is a stop sign** (`standards/GREEN_MAIN_STANDARD.md`).
   Do not stack WR work on top of a red changed-Markdown gate.

## Self-heal playbook (when the gate goes red anyway)

1. Read the CircleCI/wr-lint output — each finding is one line:
   `path.md:LINE error MDxxx/rule-name Description`.
2. If the finding is MD012/MD025/MD047/MD049 in a generated `wr/issues/*.md`
   file, run the sanitizer locally and commit the result:

   ```bash
   node wr/scripts/sanitize-wr-markdown.mjs wr/issues/<file>.md
   ```

   Then find out **why** the sanitizer didn't run in the pipeline that produced
   the file (missing step, new writer path) and wire it in — that's the actual
   fix.
3. If the finding is another rule (e.g. MD032 lists, MD040 fence language),
   auto-fix the changed file:

   ```bash
   npx markdownlint-cli2 --fix wr/issues/<file>.md
   ```

4. If the content is a raw pasted log or source packet, wrap it in a fenced
   code block instead of editing it line by line.
5. Verify locally exactly like CI before pushing:

   ```bash
   BASE="$(git merge-base origin/main HEAD)"
   FILES="$(git diff --name-only --diff-filter=d "$BASE" HEAD -- '*.md')"
   [ -n "$FILES" ] && npx markdownlint-cli2 $FILES || echo "no changed md"
   ```

## Roadmap

- [x] **Phase 1 — stop the daily failure at the source.** Ship
  `wr/scripts/sanitize-wr-markdown.mjs` and wire it into `wr-pr-creation.yml`
  and `generate-wr.sh` (this playbook's companion change).
- [ ] **Phase 2 — cover remaining writers.** Audit any other workflow/script
  that commits `wr/issues/*.md` (e.g. batch generators, research importers) and
  route them through the sanitizer.
- [ ] **Phase 3 — self-heal integration.** Teach the self-heal loop
  (`self-healing.yml` / `repo-self-healer.yml`) to recognize
  `MD012|MD025|MD047|MD049` findings on `wr/issues/*.md` in failed runs and
  auto-run the sanitizer + push the fix instead of filing a manual issue.
- [ ] **Phase 4 — shrink the backlog.** Use `scripts/fix-markdown-backlog.js`
  sweeps so the whole-repo `npm run lint` backlog trends toward zero and the
  changed-file scoping becomes unnecessary.

## CI gate (GitHub Actions)

`.github/workflows/lint-md.yml` runs
`nosborn/github-action-markdown-cli` (tag `v3.5.0`, full commit SHA pin) with:

- `files: .`
- `config_file: .markdownlint.yaml` (YAML mirror of `.markdownlint.jsonc`)
- `dot: true`
- `ignore_path: .markdownlintignore`

Local agents should keep using `npm run lint` / `npm run lint:fix`
(markdownlint-cli2 + `.markdownlint.jsonc`). When changing rules, update
**both** `.markdownlint.yaml` and `.markdownlint.jsonc`. Regression coverage:
`tests/lint-md-workflow.test.js` (WR #16267).

## References

- Sanitizer: `wr/scripts/sanitize-wr-markdown.mjs` (tests:
  `tests/sanitize-wr-markdown.test.js`)
- WR structural lint: `wr/scripts/wr-lint.mjs`
- Whole-repo backlog sweeper: `scripts/fix-markdown-backlog.js`
- Lint rules: `.markdownlint.yaml` + `.markdownlint.jsonc`, ignores:
  `.markdownlintignore`
- CI workflow: `.github/workflows/lint-md.yml`
  (`nosborn/github-action-markdown-cli@v3.5.0`)
- Green-main rule: `standards/GREEN_MAIN_STANDARD.md`
- Originating failure: issue #15604 (MD012/MD025/MD049 on
  `wr/issues/issue-15600-...md`)
- Action integration WR: #16267 /
  `wr/issues/issue-16267-add-markdownlint-cli-github-action.md`
