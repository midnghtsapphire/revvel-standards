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
