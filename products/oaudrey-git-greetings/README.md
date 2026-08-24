# oAudrey Git Greetings

## Problem

Repositories can often feel impersonal and cold to new contributors. When someone takes the time to open their first issue or pull request, they usually just see automated CI checks and silence until a maintainer can respond. This lack of immediate, welcoming interaction misses an opportunity to build community and add that "extra umph" to the repository experience.

## Solution

`oaudrey-git-greetings` is a GitHub Action that automatically detects when a user opens a new issue or pull request and immediately posts a welcoming comment. It uses the GitHub REST API to determine if this is the user's first contribution to the repository, tailoring the message to either celebrate their first interaction or welcome them back for continued contributions, providing that missing "umph".

## Pricing

N/A — This is an internal technical fix

## Analytics Events

- `greeting_posted`: Triggered when the action successfully posts a greeting comment on an issue or pull request.
- `first_time_contributor_greeted`: Triggered when the action identifies and greets a first-time contributor.

## Usage

Create a workflow file (e.g., `.github/workflows/git-greetings.yml`) with the following content:

```yaml
name: oAudrey Git Greetings
on:
  issues:
    types: [opened]
  pull_request:
    types: [opened]

jobs:
  greet:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683 # v4.2.2
      - uses: midnghtsapphire/revvel-standards/products/oaudrey-git-greetings@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          greeting-message: "We are thrilled to have you here. Please make sure to check out our CONTRIBUTING.md guide!"
```
