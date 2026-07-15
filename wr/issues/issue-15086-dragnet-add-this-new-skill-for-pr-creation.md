# Dragnet Skill: PR Creation

## Overview
This skill enables automated pull request creation with proper reviewer assignment based on CODEOWNERS configuration.

## Reviewer Assignment

Reviewers are assigned dynamically based on the repository's `CODEOWNERS` file. This ensures:
- Proper load distribution across the team
- No single point of failure
- Automatic rotation based on file ownership
- Compliance with repository governance

### Implementation

The skill reads the `CODEOWNERS` file from one of these standard locations:
- `.github/CODEOWNERS`
- `CODEOWNERS`
- `docs/CODEOWNERS`

For each changed file in the PR, the skill:
1. Matches the file path against CODEOWNERS patterns
2. Collects all matching owners (users and teams)
3. Deduplicates the reviewer list
4. Assigns reviewers via the GitHub API

### Example CODEOWNERS Pattern Matching

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
# Global fallback
*                    @org/platform-team

# Path-specific ownership
/wr/                 @org/wr-team
/skills/             @org/skills-team
*.md                 @org/docs-team
```

### Reviewer Resolution Algorithm

```python
def resolve_reviewers(changed_files, codeowners_rules):
    reviewers = set()
    for file_path in changed_files:
        for pattern, owners in reversed(codeowners_rules):
            if matches(pattern, file_path):
                reviewers.update(owners)
                break  # Last matching rule wins
    return list(reviewers)
```

## PR Creation Flow

1. Detect changed files in the branch
2. Parse CODEOWNERS file
3. Resolve reviewers dynamically (see algorithm above)
4. Create pull request via GitHub API
5. Request reviews from resolved reviewers
6. Apply appropriate labels based on file paths

## Configuration

No hardcoded reviewer names are permitted in this skill. All reviewer
assignments MUST come from the CODEOWNERS file to ensure:

- ✅ Team scaling without code changes
- ✅ Proper rotation and load balancing
- ✅ Single source of truth for ownership
- ✅ Compliance with repository governance policies

## Fallback Behavior

If no CODEOWNERS file exists or no patterns match the changed files:
1. Log a warning
2. Fall back to the repository default reviewers (configured at repo level)
3. Do NOT hardcode any specific username

## Testing

Test cases must verify:
- Multiple reviewers are correctly resolved from CODEOWNERS
- Reviewer rotation works across different file paths
- Team-based assignments are honored
- No hardcoded usernames appear in the resolved reviewer list

## References

- [GitHub CODEOWNERS documentation](https://docs.github.com/en/repositories/managing-your-repositories-settings-and-features/customizing-your-repository/about-code-owners)
- Related issue: #16060
- Original PR: #15089
## Testing
- Unit test `resolve_codeowners` with multiple patterns and last-match semantics.
- Integration test: open a PR touching files owned by different teams and confirm all owners are requested.
- Regression test: assert no test fixture or config contains a hardcoded reviewer username.

## Change Log
- Removed hardcoded `midnghtsapphire` reviewer assignment.
- Reviewer resolution is now driven exclusively by CODEOWNERS with a team-based fallback.
