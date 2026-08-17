# PR Status Badge Integration

Add dynamic PR status badges to your repository README to show review status at a glance.

## Badge Examples

### Static Badge (Manual)

Add this to your README.md to show current PR review status:

```markdown
## Pull Requests

![Awaiting Approval](https://img.shields.io/badge/PRs-awaiting_approval-yellow?style=for-the-badge)
![Changes Requested](https://img.shields.io/badge/PRs-changes_requested-red?style=for-the-badge)
![Approved](https://img.shields.io/badge/PRs-approved-green?style=for-the-badge)
```

### Dynamic Badge (Shields.io)

For dynamic PR status based on GitHub API:

```markdown
<!-- Open PRs count -->
![Open PRs](https://img.shields.io/github/issues-pr/midnghtsapphire/REPO_NAME?label=Open%20PRs&style=for-the-badge)

<!-- Closed PRs count -->
![Closed PRs](https://img.shields.io/github/issues-pr-closed/midnghtsapphire/REPO_NAME?label=Merged%20PRs&style=for-the-badge&color=purple)
```

Replace `REPO_NAME` with your repository name.

## Badge Styles

Shields.io supports multiple badge styles:

- `flat` — Flat badge (default)
- `flat-square` — Flat badge with square edges
- `for-the-badge` — Large badge (recommended for headers)
- `plastic` — Plastic-styled badge
- `social` — Social media style badge

Example:
```markdown
![Status](https://img.shields.io/badge/status-approved-green?style=flat-square)
```

## Custom Badge Generator

Use this template to create custom badges:

```text
https://img.shields.io/badge/{LABEL}-{MESSAGE}-{COLOR}?style={STYLE}
```

Parameters:
- `{LABEL}` — Left side text (e.g., "Status", "Review", "PR")
- `{MESSAGE}` — Right side text (e.g., "approved", "pending", "changes_requested")
- `{COLOR}` — Color name or hex code (without #)
- `{STYLE}` — Badge style (optional)

### Color Options

| Status | Color Code | Hex |
|--------|------------|-----|
| Success/Approved | `green` | `0e8a16` |
| Warning/Awaiting | `yellow` | `fbca04` |
| Error/Changes | `red` | `d93f0b` |
| Info/Review | `blue` | `0075ca` |
| Inactive | `gray` | `6c757d` |

## Integration with GitHub Actions

The `pr-review-status.yml` workflow automatically posts status badges in PR comments. These badges update in real-time based on review state.

### Workflow-Generated Badges

The workflow uses these badge URLs:

```yaml
# Awaiting Approval
https://img.shields.io/badge/status-awaiting_approval-yellow?style=for-the-badge

# Review Started
https://img.shields.io/badge/status-review_started-blue?style=for-the-badge

# Changes Requested
https://img.shields.io/badge/status-changes_requested-red?style=for-the-badge

# Approved
https://img.shields.io/badge/status-approved-green?style=for-the-badge
```

## README Template

Here's a complete README section template with PR badges:

```markdown
## 🚀 Contributing

### Pull Request Status

![Open PRs](https://img.shields.io/github/issues-pr/midnghtsapphire/REPO_NAME?style=for-the-badge)
![PR Success Rate](https://img.shields.io/badge/PR_Success_Rate-95%25-green?style=for-the-badge)

#### Current Review States

We use automated labels to track PR review status:

- ![Awaiting Approval](https://img.shields.io/badge/-awaiting_approval-yellow) — PR needs review
- ![Review Started](https://img.shields.io/badge/-review_started-blue) — Review in progress
- ![Changes Requested](https://img.shields.io/badge/-changes_requested-red) — Modifications needed
- ![Approved](https://img.shields.io/badge/-approved-green) — Ready to merge

### How to Contribute

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to your branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
6. Wait for review (status will update automatically)
7. Address any requested changes
8. Merge when approved ✅
```

## Advanced: Dynamic Badge API

For more advanced badge generation, use GitHub's API:

```bash
# Get PR count by label
curl -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/midnghtsapphire/REPO_NAME/pulls?state=open&labels=awaiting-approval

# Count results and generate badge URL
COUNT=$(curl -s ... | jq 'length')
BADGE_URL="https://img.shields.io/badge/Awaiting_Approval-${COUNT}-yellow?style=for-the-badge"
```

## GitHub Status Checks Badge

Show CI/CD status:

```markdown
![CI Status](https://img.shields.io/github/actions/workflow/status/midnghtsapphire/REPO_NAME/ci.yml?branch=main&style=for-the-badge&label=CI)
```

## Combined Example

Full status board in README:

```markdown
## 📊 Repository Status

### Build & Tests
![CI](https://img.shields.io/github/actions/workflow/status/midnghtsapphire/REPO_NAME/ci.yml?label=CI&style=for-the-badge)
![Tests](https://img.shields.io/badge/tests-passing-green?style=for-the-badge)
![Coverage](https://img.shields.io/badge/coverage-85%25-yellowgreen?style=for-the-badge)

### Pull Requests
![Open PRs](https://img.shields.io/github/issues-pr/midnghtsapphire/REPO_NAME?style=for-the-badge)
![Awaiting Review](https://img.shields.io/badge/awaiting_review-3-yellow?style=for-the-badge)
![Approved](https://img.shields.io/badge/approved-2-green?style=for-the-badge)

### Issues
![Open Issues](https://img.shields.io/github/issues/midnghtsapphire/REPO_NAME?style=for-the-badge)
![Closed Issues](https://img.shields.io/github/issues-closed/midnghtsapphire/REPO_NAME?style=for-the-badge&color=purple)
```

## Troubleshooting

### Badge Not Updating

- GitHub API caches badge data for ~5 minutes
- Use `?cache=none` parameter to force refresh (not recommended for production)
- Check if the API endpoint is accessible

### Custom Colors Not Showing

- Use hex codes without the `#` prefix
- Some older browsers may not support all color formats
- Stick to named colors (red, blue, green, etc.) for compatibility

### Badge URL Encoding

Spaces in badge text need encoding:
- Space → `%20` or `_`
- Example: `Review Started` → `Review_Started`

## Resources

- [Shields.io Documentation](https://shields.io/)
- [GitHub Badges Guide](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/adding-a-workflow-status-badge)
- [Simple Icons](https://simpleicons.org/) — For adding logos to badges
- [Badge Generator Tool](https://shields.io/)

## License

Badge configurations in this guide are provided as examples for use in any project.
