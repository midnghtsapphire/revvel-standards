# Find the full commit SHA of an Action release (needs the GitHub CLI, `gh`)
gh api repos/Platane/snk/commits/v3.5.0 --jq .sha
