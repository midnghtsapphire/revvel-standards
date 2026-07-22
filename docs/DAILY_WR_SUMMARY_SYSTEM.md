# Daily WR & PR Summary System

## Overview

An automated daily summary system that tracks and reports on repository activity, including:

- New issues created
- New pull requests opened
- Vercel deployment URLs mentioned in PRs
- Repositories affected by the day's work

## Components

### 1. GitHub Actions Workflow
**File:** `.github/workflows/daily-wr-summary.yml`

**Schedule:** Runs daily at 23:00 UTC (end of day)

**Permissions:**
- `contents: write` — to commit generated summaries
- `issues: read` — to fetch issue data
- `pull-requests: read` — to fetch PR data

**Manual Trigger:** Can be triggered manually via `workflow_dispatch`

### 2. Summary Generator Script
**File:** `scripts/generate-daily-summary.js`

**Language:** Node.js

**Dependencies:** `@octokit/rest` (installed temporarily during workflow run)

**Outputs:**
- `wr/summaries/YYYY-MM-DD.md` — Markdown version
- `wr/summaries/YYYY-MM-DD.html` — HTML version (standalone, viewable in browser)

### 3. Summary Storage
**Directory:** `wr/summaries/`

**Files:**
- `YYYY-MM-DD.md` — Daily markdown summaries
- `YYYY-MM-DD.html` — Daily HTML summaries
- `index.html` — Index page listing all summaries
- `README.md` — Documentation for the summaries directory

## Report Structure

Each daily summary includes:

### Summary Statistics
- Total issues created
- Total PRs opened

### Issues Created Today
Table with:
- Issue number and link
- Title
- Author
- Created timestamp
- Labels

### Pull Requests Opened Today
Table with:
- PR number and link
- Title
- Author
- Created timestamp
- Status (Open/Merged/Closed)

### Vercel Deployment URLs
List of all Vercel URLs found in:
- PR descriptions
- PR comments

Pattern matched: `https://*.vercel.app`

### Repositories Affected
List of repository references found in:
- PR descriptions  
- PR comments

Pattern matched: `owner/repo` format

## Viewing Summaries

### Option 1: Local Browser
Open any `YYYY-MM-DD.html` file directly in your browser.

### Option 2: GitHub Pages
If GitHub Pages is enabled:
```text
https://midnghtsapphire.github.io/revvel-standards/wr/summaries/YYYY-MM-DD.html
```

### Option 3: Index Page
View all summaries via the index:
```text
https://midnghtsapphire.github.io/revvel-standards/wr/summaries/index.html
```

## Manual Generation

### Via Script
```bash
# Install dependencies
npm install --no-save @octokit/rest

# Set GitHub token
export GITHUB_TOKEN=your_token_here

# Run script
node scripts/generate-daily-summary.js
```

### Via GitHub Actions
1. Go to **Actions** → **Daily WR & PR Summary**
2. Click **Run workflow**
3. Select branch
4. Click **Run workflow**

## Technical Details

### Data Collection
- Uses GitHub REST API via `@octokit/rest`
- Fetches issues created since yesterday
- Fetches PRs created since yesterday
- Scans PR bodies and comments for Vercel URLs and repo references

### Report Generation
- Markdown report generated first
- HTML report generated from markdown with:
  - Inline CSS (no external dependencies)
  - Responsive design
  - Modern, attractive styling
  - Gradient background
  - Clean table layouts

### Automation
- Workflow runs at 23:00 UTC daily
- Commits generated files to `wr/summaries/`
- Updates index.html automatically
- Creates GitHub Actions step summary for visibility

## Files Modified

This implementation adds/modifies:

1. `.github/workflows/daily-wr-summary.yml` — Workflow definition
2. `.github/workflows/secrets-health-check.yml` — Fixed duplicate keys
3. `scripts/generate-daily-summary.js` — Summary generator script
4. `wr/summaries/README.md` — Summaries directory documentation
5. `docs/DAILY_WR_SUMMARY_SYSTEM.md` — This file (system documentation)

## Integration with Existing Systems

This system complements existing automation:
- **oaudrey-retro.yml** — Post-deployment retrospectives
- **ai-weekly-changelog.yml** — Weekly changelog generation
- **panda-ops.yml** — PR review automation

Unlike those systems, this one:
- Runs daily (not weekly)
- Focuses on activity tracking (not code changes)
- Generates both markdown and HTML (for easy viewing)
- Automatically extracts deployment URLs and affected repos

## Maintenance

### Adding New Data Points
To track additional information:
1. Update `scripts/generate-daily-summary.js`
2. Add new data extraction functions
3. Update markdown/HTML generation
4. Test locally before deploying

### Modifying HTML Styling
Edit the CSS in the `generateHTMLReport()` function in `scripts/generate-daily-summary.js`.

### Changing Schedule
Edit the `cron` expression in `.github/workflows/daily-wr-summary.yml`:
```yaml
schedule:
  - cron: '0 23 * * *'  # Currently 23:00 UTC daily
```

## Troubleshooting

### Workflow Fails with "No changes to commit
This is normal when there are no new issues or PRs. The workflow will exit successfully with an info message.

### GitHub API Rate Limiting
The workflow uses `GITHUB_TOKEN` which has higher rate limits. If rate limiting occurs:
- Check if other workflows are running simultaneously
- Consider spacing out workflow schedules

### Missing Vercel URLs
Vercel URLs are extracted via pattern matching. If URLs are not detected:
- Verify the URL format matches `https://*.vercel.app`
- Check if URLs are in PR bodies or comments (not in files)

### HTML Not Rendering Properly
- Ensure the file is opened directly (not via GitHub's preview)
- Try viewing via GitHub Pages or open the file locally in your browser
- Check browser console for errors

## Support

For issues or questions about the daily summary system:
1. Check this documentation
2. Check `wr/summaries/README.md`
3. Open an issue with label `weekly-research`

## License

All Rights Reserved — Audrey Evans / GlowStarLabs

Part of the revvel-standards repository automation suite.
