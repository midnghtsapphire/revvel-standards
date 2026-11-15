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

## Owned local execution — 2026-11-10

The earlier Action example remains historical. The owned path invokes the same
prosecutor detectors without GitHub execution, Apps, an API token or a model:

```sh
node products/merge-prosecutor/action/run-prosecutor.mjs --local --policy /absolute/operator-policy.json --packet /absolute/local-packet.json
```

Omit `--packet` to read the JSON packet from stdin through the existing HULL
SkillRouter. Its manifest is `skills/merge-prosecutor/SKILL.md`; HULL's separate
operator policy binds the manifest digest and exact CLI argv. A packet contains
`head` (revision identity), `diff` (nonempty unified diff with file/hunk headers)
and optional `comments`. Packet fields cannot select commands or paths.

The prosecution policy is operator-controlled, separate from event data:

```json
{
  "version": 1,
  "workspace": "/absolute/checkout",
  "receipts": "/absolute/local-receipts",
  "checks": [{
    "name": "prosecutor-regressions",
    "argv": ["/absolute/node", "--test", "products/merge-prosecutor/tests/prosecutor.test.js"],
    "cwd": ".",
    "timeout_ms": 60000
  }]
}
```

Use native absolute paths on Windows and Node plus npm-cli.js for npm commands.
Checks run without a shell, with an OS-only environment, bounded timeouts and
process-tree cleanup. They run trusted checkout code with operator permissions;
this is not an OS sandbox. Each result has an exclusive JSON receipt, measured
check exit codes/output hashes and capped local diagnostic logs (1 MiB per
check). Raw output stays in the local log, outside JSON stdout.

Conflict/duplicate findings and actual failing checks return exit 1. Reviewer
snippets remain advisory. Missing diff, no configured checks, malformed policy
and overlap fail closed. Stable `repair-requests` JSON names deduplicate recurring
findings across heads; receipts remain per execution. The exclusive lock records
its owner and is retained under the run ID when released. A crashed process can
leave a lock: inspect its PID and owner before manually recovering it.

This CLI does not install a schedule, deploy, merge, close issues or contact any
provider. Daily/event invocation belongs to the existing owned scheduler after
operator command review. Run the product and local adapter regression tests with:

```sh
node --test products/merge-prosecutor/tests/prosecutor.test.js products/merge-prosecutor/tests/local-prosecution.test.js
```
