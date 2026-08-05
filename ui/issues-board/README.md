# Revvel Issues Dashboard

Interactive web-based dashboard for enhanced GitHub Issues UI management.

## Features

- **Real-time Statistics**: View open/closed issues, in-progress work, triage queue, and Jules-assigned issues
- **Advanced Filtering**: Filter by state, label, assignee, and sort by various criteria
- **Quick Actions**: Create issues, view documentation, access workflows, export data
- **Visual Issue Cards**: Click any issue card to open it in GitHub
- **Auto-refresh**: Dashboard updates every 60 seconds (respects GitHub API rate limits)
- **CSV Export**: Export all issues to CSV for analysis

## Usage

### Local Development

1. Open `index.html` in your browser:
   ```bash
   open ui/issues-board/index.html
   ```

### GitHub Pages Deployment

The dashboard is automatically deployed to:
```text
https://midnghtsapphire.github.io/revvel-standards/ui/issues-board/
```

### Customization

Edit the constants at the top of the `<script>` section:

```javascript
const REPO_OWNER = 'midnghtsapphire';
const REPO_NAME = 'revvel-standards';
```

## Features in Detail

### Statistics Cards

- **Open**: Count of open issues
- **Closed**: Count of closed issues  
- **In Progress**: Issues labeled with `in-progress` or `wip`
- **Needs Triage**: Issues labeled with `needs-triage` or `triage`
- **Jules Assigned**: Issues labeled with `jules`

### Filters

- **State**: All, Open, or Closed
- **Label**: Filter by specific labels (bug, enhancement, documentation, etc.)
- **Assignee**: Filter by assignee (@copilot, @jules, or unassigned)
- **Sort**: By created date, updated date, or comment count

### Quick Actions

- **New Issue**: Opens GitHub issue creation page
- **Documentation**: Opens the GitHub Issues UI Enhancements documentation
- **Workflows**: Opens GitHub Actions page
- **Export CSV**: Downloads all issues as a CSV file

### Issue Cards

Each issue card displays:
- Issue number and state (🟢 open / 🟣 closed)
- Title
- Labels (color-coded)
- Comment count
- Assignees
- Last updated date

Click any card to open the issue in GitHub.

## Integration

### With Other Tools

- **GitHub CLI**: Use alongside `scripts/issues/quick-actions.sh` for command-line management
- **MCP Server**: Integrate with `mcp-servers/github-issues/` for programmatic access
- **GitHub Actions**: Links to automated workflows

### API Rate Limits

The dashboard uses the GitHub REST API without authentication, which is subject to rate limits:
- 60 requests per hour for unauthenticated requests
- Auto-refresh is set to 60 seconds (60 requests per hour)
- This respects GitHub's rate limit without requiring authentication

To further reduce API calls:
1. Increase the refresh interval in `index.html` to 120 seconds or more
2. Add GitHub authentication (requires backend service or browser extension)
3. Implement exponential backoff when rate limits are hit

## Design Principles

Based on [Niki Tonsky's GitHub Redesign](https://tonsky.me/blog/github-redesign/):

1. **Flat hierarchy**: All information at one level, no nested navigation
2. **Minimal chrome**: Maximum content space, minimal UI elements
3. **Contextual actions**: Actions grouped with relevant content
4. **Clear status**: Obvious visual indicators for state
5. **No redundant icons**: Clean, text-based labels

## Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## License

MIT

## Related Documentation

- [GitHub Issues UI Enhancements](../../docs/GITHUB_ISSUES_UI_ENHANCEMENTS.md)
- [CLI Quick Actions](../../scripts/issues/quick-actions.sh)
- [MCP Server](../../mcp-servers/github-issues/)
