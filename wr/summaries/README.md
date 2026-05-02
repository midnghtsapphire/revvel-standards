# Daily WR & PR Summaries

This directory contains automatically generated daily summary reports tracking:

- **New Issues** created each day
- **New Pull Requests** opened each day
- **Vercel Deployment URLs** mentioned in PRs
- **Repositories Affected** by the day's activity

## Files

- `YYYY-MM-DD.md` — Markdown version of the daily summary
- `YYYY-MM-DD.html` — HTML version of the daily summary (viewable in browser)
- `index.html` — Index page listing all summaries

## Viewing Summaries

### Local Viewing
Open any `YYYY-MM-DD.html` file directly in your browser.

### GitHub Pages
If GitHub Pages is enabled for this repository, summaries are available at:
```
https://midnghtsapphire.github.io/revvel-standards/wr/summaries/YYYY-MM-DD.html
```

### Raw GitHub Content
View summaries directly via:
```
https://raw.githubusercontent.com/midnghtsapphire/revvel-standards/main/wr/summaries/YYYY-MM-DD.html
```

## Generation

Summaries are automatically generated daily at 23:00 UTC by the `.github/workflows/daily-wr-summary.yml` workflow.

### Manual Generation
To manually generate a summary for today:

```bash
# Install dependencies first
npm install --no-save @octokit/rest

# Set GitHub token
export GITHUB_TOKEN=your_token_here

# Run the script
node scripts/generate-daily-summary.js
```

Or trigger the workflow manually via GitHub Actions:
1. Go to **Actions** → **Daily WR & PR Summary**
2. Click **Run workflow**
3. Select the branch and click **Run workflow**

## Structure

Each daily summary includes:

### 1. Summary Statistics
- Total issues created
- Total PRs opened

### 2. Issues Created Today
Table with:
- Issue number and link
- Title
- Author
- Created timestamp
- Labels

### 3. Pull Requests Opened Today
Table with:
- PR number and link
- Title
- Author
- Created timestamp
- Status (Open/Merged/Closed)

### 4. Vercel Deployment URLs
List of all Vercel URLs found in PR descriptions and comments.

### 5. Repositories Affected
List of all repository references found in PR descriptions and comments.

## Technical Details

- **Script:** `scripts/generate-daily-summary.js`
- **Workflow:** `.github/workflows/daily-wr-summary.yml`
- **Schedule:** Daily at 23:00 UTC
- **Dependencies:** `@octokit/rest` (installed temporarily during workflow run)

## Notes

- The script runs at 23:00 UTC and looks for activity created since yesterday at 00:00 UTC
- This captures approximately 47 hours of activity (yesterday 00:00 to today 23:00)
- Vercel URLs are extracted using pattern matching from PR bodies and comments
- Repository references are extracted using pattern matching (owner/repo format)
- HTML reports use inline CSS for standalone viewing without external dependencies
- All user-controlled content is HTML-escaped to prevent XSS vulnerabilities

## Support

For issues or questions about the daily summary system, please open an issue in this repository with the label `wr-summary`.
