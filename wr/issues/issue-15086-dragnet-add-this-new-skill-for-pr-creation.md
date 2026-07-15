# Skill: Dragnet PR Creation

## Overview
This skill defines the automated process for creating pull requests via the Dragnet system. It ensures consistent PR metadata, proper reviewer assignment, and compliance with repository standards.

## Purpose
Standardize PR creation across the organization while respecting per-repository governance rules (CODEOWNERS, branch protections, labels).

## Reviewer Assignment Policy

**Authoritative source:** The `CODEOWNERS` file at the repository root (or `.github/CODEOWNERS`) is the single source of truth for reviewer assignment. The skill MUST NOT hardcode individual reviewer usernames.

### Resolution Algorithm
1. Load `CODEOWNERS` from the target repository's default branch.
2. For each file path in the PR diff, match against CODEOWNERS patterns (last matching pattern wins, per GitHub semantics).
3. Collect the union of owners (users and teams) across all changed files.
4. Request review from the resolved set via the GitHub API (`POST /repos/{owner}/{repo}/pulls/{pull_number}/requested_reviewers`).
5. If no CODEOWNERS entry matches, fall back to the repository's default review team defined in repository settings — NOT a hardcoded username.
6. Respect team-level round-robin / load-balancing configured in the team's review settings.

### Prohibited
- Hardcoding any specific GitHub username (e.g., `midnghtsapphire`) as a reviewer in skill logic.
- Bypassing CODEOWNERS by injecting a static reviewer list at PR creation time.

## Skill Instructions

### Inputs
- `repo`: target repository (owner/name)
- `base_branch`: base branch for the PR
- `head_branch`: source branch for the PR
- `title`: PR title
- `body`: PR body (markdown)
- `labels`: optional list of labels

### Steps

1. **Validate branches** — Ensure `head_branch` exists and has commits ahead of `base_branch`.
2. **Create the PR** via GitHub API.
3. **Apply labels** if provided.
4. **Resolve reviewers from CODEOWNERS** (see Reviewer Assignment Policy above).
   - Fetch CODEOWNERS from `base_branch`.
   - Compute owners for the changed file set.
   - Request reviews from the resolved owners.
5. **Post PR link** back to the initiating context.

### Pseudocode

```python
def create_pr(repo, base_branch, head_branch, title, body, labels=None):
    pr = gh.create_pull(repo, base=base_branch, head=head_branch, title=title, body=body)
    if labels:
        gh.add_labels(repo, pr.number, labels)

    # Reviewer assignment — CODEOWNERS ONLY. Do not hardcode usernames.
    codeowners = gh.get_file(repo, ".github/CODEOWNERS", ref=base_branch) \
        or gh.get_file(repo, "CODEOWNERS", ref=base_branch)
    reviewers, team_reviewers = resolve_codeowners(codeowners, pr.changed_files)

    if reviewers or team_reviewers:
        gh.request_reviewers(repo, pr.number,
                             reviewers=reviewers,
                             team_reviewers=team_reviewers)
    else:
        # Fall back to repository default review team from settings,
        # NOT a hardcoded individual.
        default_team = gh.get_repo_setting(repo, "default_review_team")
        if default_team:
            gh.request_reviewers(repo, pr.number, team_reviewers=[default_team])

    return pr
```

## Testing
- Unit test `resolve_codeowners` with multiple patterns and last-match semantics.
- Integration test: open a PR touching files owned by different teams and confirm all owners are requested.
- Regression test: assert no test fixture or config contains a hardcoded reviewer username.

## Change Log
- Removed hardcoded `midnghtsapphire` reviewer assignment.
- Reviewer resolution is now driven exclusively by CODEOWNERS with a team-based fallback.
