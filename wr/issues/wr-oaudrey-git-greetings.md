# WR: deploy github app git-greetings

## Issue Context

User requested a new GitHub App/Action named `git-greetings`. It is intended to give repositories extra "umph" when developers interact with them. It is designated to have an `oaudrey` prefix (so `oaudrey-git-greetings`). The request required defining what the "umph" means and implementing the deployment as a PR that creates this action.

## Background & Motivation

Standard GitHub repositories can feel impersonal when contributors interact with them. Adding an automated greeting on new issues and PRs builds community and gives the repository more personality (the "extra umph").

## Scope

- Create a GitHub Action `oaudrey-git-greetings` in the `products/` directory.
- Implement a Node.js script without external dependencies (to maintain security and groundedness) that interacts with the GitHub API.
- The action will automatically post a comment on new issues or PRs, providing a personalized greeting based on the user's past contribution history.
- Set up a demo workflow in `.github/workflows/` to test it.
- Create standard product documentation (`README.md`, `landing.md`, `launch.md`).

## Approach

- Use a composite GitHub action that sets up Node.js 22 and runs a local `index.js` script.
- The script uses the native `https` module to query the GitHub REST API (`api.github.com/search/issues` and `api.github.com/repos/.../issues/.../comments`).
- It parses the incoming event context to determine the author and the type of interaction (issue vs PR).
- It crafts a custom "umph" greeting based on whether this is the author's first contribution.

## Acceptance Criteria

- [ ] Change delivers the described behavior end-to-end
- [ ] Tests updated / added where applicable
- [ ] Docs updated where applicable
- [ ] No regressions in related workflows

## Risks & Mitigations

- **API Rate Limits:** The script makes multiple API calls (one to search contributions, one to post). Mitigation: Uses the provided GitHub Token, which has sufficient quota for standard repository interactions.
- **Security:** Avoided using any external npm dependencies. Everything uses Node.js standard libraries.

## Competitor & Pricing Intelligence

N/A — This is an internal technical fix

## Learnings — What & Why

N/A — The action logic is fully implemented and tested without any additional findings.
