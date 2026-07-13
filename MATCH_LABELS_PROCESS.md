# Match Labels — Process & Reference

**Issue reference:** *"Add Match Labels Action"* — the workflow now performs the match inline with `actions/github-script` after the third-party action audit retired stale `binowork/match-labels@v0.1.1` in WR #14884.

Implementation: [`.github/workflows/match-labels.yml`](../.github/workflows/match-labels.yml).

---

## TL;DR

1. Every pull request event that can change the label set triggers the **Match Labels** workflow.
2. The workflow matches the current PR labels against a curated list of **merge-control / routing** labels:
   - `auto-merge`, `won't-merge`, `blocked`
   - `auto-fix`, `openrouter`, `copilot`, `needs-human`
3. The matched labels are exposed as three job outputs (`matched_labels`, `matched_labels_array`, `matched_labels_count`) that downstream jobs and reusable workflows can gate on.
4. The match is read-only; label creation and fallback triage remain the job of [`arsc-labels.yml`](../.github/workflows/arsc-labels.yml).

---

## Why this workflow

This workflow answers one question: *"which of the labels I care about are attached to this PR?"* It returns a comma-separated string, a JSON array, and a count, which makes it easy to write `if:` guards such as:

```yaml
if: ${{ needs.match-labels.outputs.matched_labels_count == '1' }}
```

This is a cleaner pattern than scraping `github.event.pull_request.labels.*.name` in each consumer workflow, but without depending on an abandoned node16 third-party action.

> **Note:** The implementation only reads the GitHub event payload's `pull_request` object, so this workflow is intentionally scoped to `pull_request` events only. Issues are handled by [`arsc-labels.yml`](../.github/workflows/arsc-labels.yml) and [`issue-automation.yml`](../.github/workflows/issue-automation.yml).

---

## Inputs

| Input | Description | Default in this workflow |
|---|---|---|
| `match_labels` | Newline-separated list of labels to look for on the PR. | Revvel merge-control + routing labels |

## Outputs

| Output | Type | Description |
|---|---|---|
| `matched_labels` | string | Comma-separated matched labels |
| `matched_labels_array` | JSON array | Array of matched labels |
| `matched_labels_count` | number | Count of matched labels |

These are re-exported from the `match-labels` job so downstream workflows can reference them with `needs.match-labels.outputs.<name>`.

---

## Consuming the outputs

Example — only run auto-merge when exactly one merge-control label is set:

```yaml
needs: [match-labels]
if: ${{ needs.match-labels.outputs.matched_labels_count == '1' && contains(needs.match-labels.outputs.matched_labels, 'auto-merge') }}
```

Example — short-circuit CI when the PR is explicitly blocked:

```yaml
needs: [match-labels]
if: ${{ !contains(needs.match-labels.outputs.matched_labels, 'blocked') && !contains(needs.match-labels.outputs.matched_labels, 'won''t-merge') }}
```

---

## Extending the filter list

Edit the `match_labels:` block in [`.github/workflows/match-labels.yml`](../.github/workflows/match-labels.yml). Any label you add should also exist in [`.github/labels.yml`](../.github/labels.yml) so the [`sync-labels.yml`](../.github/workflows/sync-labels.yml) workflow keeps it provisioned across repos.

Common extensions:

- **Semver release routing:** add `major`, `minor`, `patch` to drive release automation (the canonical example from the upstream README).
- **Security gating:** add `security` to force a dedicated security review job.
- **Design review:** add `design` to route PRs that touch brand / design assets.

---

## Related workflows

- [`arsc-labels.yml`](../.github/workflows/arsc-labels.yml) — the **write** side: adds/removes/sets/clears labels (including the `triage` fallback this workflow relies on).
- [`sync-labels.yml`](../.github/workflows/sync-labels.yml) — keeps the canonical label set provisioned.
- [`auto-merge.yml`](../.github/workflows/auto-merge.yml) — typical consumer of the `auto-merge` match output.
- [`openrouter-assignee.yml`](../.github/workflows/openrouter-assignee.yml) — owner of the `openrouter`, `auto-fix`, `copilot` routing labels.
