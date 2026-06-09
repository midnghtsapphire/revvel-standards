# WR: [WR] create a job for GetNewsFirst or better name

**Issue:** #14437  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-06-07  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** ✅ Complete

---

## Issue Context

The goal is to implement an automated daily news briefing pipeline via GitHub Actions. The pipeline fetches top headlines using NewsAPI, caches the results to avoid unnecessary API calls, and processes the news for downstream usage.

### Proposed Workflow Configuration
```yaml
name: News with Cache
on:
  schedule:
    - cron: '0 */6 *' # every 6h
jobs:
  fetch:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Restore cached news
        id: cache-news
        uses: actions/cache@v4
        with:
          path: news-cache.json
          key: news-${{ hashFiles('scripts/fetch_news.py') }}-${{ steps.date.outputs.today }}
          restore-keys: news-${{ hashFiles('scripts/fetch_news.py') }}-

      - name: Get today's date
        id: date
        run: echo "today=$(date +%Y-%m-%d)" >> $GITHUB_OUTPUT

      - name: Fetch news (only if cache miss)
        if: steps.cache-news.outputs.cache-hit != 'true'
        run: python scripts/fetch_news.py > news-cache.json

      - name: Process news
        run: python scripts/process_news.py news-cache.json

      - name: Cache news
        uses: actions/cache@v4
        with:
          path: news-cache.json
          key: news-v2-${{ steps.date.outputs.today }} # change v2 → v3 to force refresh
```

## Repository Metadata
| Property | Value |
| --- | --- |
| Stars | N/A |
| Open Issues | N/A |
| Private | N/A |
| Archived | N/A |

## Research Checklist
<!-- Mark [x] ONLY when the matching section below is actually filled. Otherwise [ ] or "N/A — reason". -->
- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis
- [x] Domain strategy
- [x] Monetization

## Executive Summary
This Work Request outlines the implementation of an automated news aggregation system ("GetNewsFirst"). The system relies on GitHub Actions scheduling to retrieve top headlines from NewsAPI, leverages GitHub Actions cache to prevent duplicate fetches within the same day, and processes the structured output via Python scripts. It provides a robust, zero-cost (using free tier actions) pipeline for a daily news digest that can be monetized or integrated into broader OSINT tooling.

## Step 1A — Product/Output Selections
- **Product Name:** GetNewsFirst (or Daily News Briefing)
- **Output Type:** `production-app` (Data Pipeline & Automation)
- **Core Components:**
  1. `fetch_news.py`: Calls NewsAPI and outputs raw JSON.
  2. `process_news.py`: Parses, formats, and distributes the news.
  3. `getnewsfirst.yml`: The orchestrating GitHub Actions workflow.

## Step 2 — Deep Web Research

#### Deep Market Research
News aggregation is highly saturated, but automated, niche-specific curation pipelines have significant value for specialized audiences (e.g., industry professionals, researchers). Implementing this as an automated GitHub Action minimizes infrastructure overhead.

#### Community Chatter
Developers often seek reliable, low-maintenance ways to aggregate daily content without spinning up dedicated servers. Using GitHub Actions cache for rate-limit management on free APIs is a heavily recommended best practice in the serverless community.

#### Competitor Analysis
Alternatives like Zapier or Make.com offer visual builders but can quickly become expensive for frequent polling. A code-first GitHub Actions approach provides maximum flexibility and version control at zero marginal cost.

#### Domain Strategy
By modularizing `fetch_news.py` and `process_news.py`, the system can easily be extended to support multiple news sources, custom keyword filtering, or diverse output formats (e.g., Slack/Discord webhooks, email digests, or markdown generation).

## Step 3 — Requirements
- **Action Triggers:** Cron schedule (`0 */6 *` for 6-hour intervals) and optional `workflow_dispatch`.
- **API Integration:** Retrieve data from `newsapi.org`.
- **Caching Mechanism:** Cache `news-cache.json` using `actions/cache@v4`, keyed by date and script hash, to avoid hitting API rate limits.
- **Processing Logic:** `process_news.py` must handle formatting and any downstream API integrations.
- **Dependencies:** The GitHub Actions runner must have Python installed and any required pip packages (e.g., `requests`).

## Recommendations
#### BOM (Bill of Materials)
- `.github/workflows/getnewsfirst.yml`: Primary GitHub Action orchestrator.
- `scripts/fetch_news.py`: Script to safely call NewsAPI with secrets handling.
- `scripts/process_news.py`: Script to process the cached JSON output.
- `requirements.txt`: Python dependencies (e.g., `requests`).

#### Monetization
- **Sponsorships/Ads:** Inject sponsored content directly into the generated digest.
- **Premium Feeds:** Offer customized, industry-specific feeds for paid subscribers.
- **Affiliate Links:** Integrate relevant affiliate links within the processed news output.

#### Implementation Steps
1. Create `scripts/fetch_news.py` to handle the NewsAPI request and print JSON to stdout.
2. Create `scripts/process_news.py` to read `news-cache.json` and generate the final format.
3. Add `.github/workflows/getnewsfirst.yml` using the workflow structure defined in the Issue Context.
4. Configure the `NEWS_API_KEY` secret in the repository settings.

## Risks
- **API Rate Limiting:** NewsAPI free tier has strict limits. The caching mechanism is critical and must not fail open.
- **Cache Invalidation:** If the caching key strategy fails (e.g., script hashes change frequently without intent), it could trigger redundant API calls.
- **Workflow Failures:** Network issues fetching the API could cause workflow runs to fail. Implementation must include proper error handling and retries.
