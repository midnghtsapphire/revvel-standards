# Merge Prosecutor

## Live Deployment

▶️ **[Open the live app & test it](https://midnghtsapphire.github.io/revvel-standards/docs/merge-prosecutor/)**

## What It Is

Merge Prosecutor is a deterministic, mathematical GitHub Action that evaluates pull requests for merge quality. It guards against bad merges by:
1. Detecting unresolved Git conflict markers.
2. Using Levenshtein distance on **consecutive** added-line copies to detect keep-both merges (current and incoming kept back-to-back). A file-wide 2-line scan is not used — that false-failed PRs that reused an error-handling idiom or repeated test fixtures (see #17899 `prosecute`).
3. Running test suites to ensure the merge didn't break unintended functionality.
4. Scanning pull request comments for dismissive language (e.g., "not my error", "leave it", "out of scope") and automatically generating Work Request (WR) tickets when developers try to punt on bugs.

## Pricing (Polar.sh)

- **Free Tier:** Basic unresolved conflict detection.
- **Pro Tier ($29/month):** Advanced Levenshtein duplication detection, test stability prosecution, and WR generation for dismissive comments.
- **Enterprise Tier ($199/month):** Custom comment regex logic and self-hosted runners.

## Analytics Events

- `merge_prosecuted`: Triggered when an action run starts.
- `duplicate_blocks_found`: Triggered when bad merge duplications are found.
- `dismissive_comment_detected`: Triggered when a WR is auto-generated for a comment.

## Usage

The block below is the one wired on this repository. It is
`.github/workflows/merge-prosecutor.yml`. Copy that, not the retired example
under it. The Action opens a GitHub issue titled `[WR]` when it fails a pull
request. That issue is the Work Request. The markdown file it also writes
lives on the runner and is deleted with the job.

```yaml
name: Merge Prosecutor
on:
  pull_request:
    types: [opened, synchronize, reopened, ready_for_review]

permissions:
  contents: read
  pull-requests: write
  issues: write

jobs:
  prosecute:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1  # v7.0.1
        with:
          fetch-depth: 0
          persist-credentials: false
      - uses: ./products/merge-prosecutor
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          repository: ${{ github.repository }}
          pr-number: ${{ github.event.pull_request.number }}
          test-command: "node --test tests/prosecutor.test.js"
          workspace-dir: ${{ github.workspace }}/products/merge-prosecutor
```

### Retired example, 2026-11-06

Kept on the page so the bad snippet is still visible. Do not copy it.
It checks the repository out twice, then has a bare
`uses: midnghtsapphire/revvel-standards/products/merge-prosecutor@main`
with no `with:` block. That `@main` form is the self-reference issue #17893
closed. The `uses: ./products/merge-prosecutor` step under it is the local
action, and it is the one that belongs in a workflow.

```yaml
name: Prosecute Merge
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  prosecute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: midnghtsapphire/revvel-standards/products/merge-prosecutor@main
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683  # v4.2.2
      - uses: ./products/merge-prosecutor
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          repository: ${{ github.repository }}
          pr-number: ${{ github.event.pull_request.number }}
```
