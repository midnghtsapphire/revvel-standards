# WR: Create a job for GetNewsFirst

**Issue:** #14437
**Repository:** midnghtsapphire/revvel-standards
**Created:** 2026-06-10
**Researcher:** Jules (Google) + OpenRouter
**Research Date:** 2026-06-10
**WR Status:** ✅ Complete

## Issue Context

The goal is to create automated GitHub Actions workflows to fetch and process daily news headlines using the News API. The output should include two distinct workflows: one for a daily news briefing (running once a day) and another for fetching news with a caching mechanism (running every 6 hours) to avoid hitting API rate limits unnecessarily.

## Repository Metadata

| Property    | Value |
| ----------- | ----- |
| Stars       | N/A   |
| Open Issues | N/A   |
| Private     | N/A   |
| Archived    | N/A   |

## Research Checklist

- [x] Deep market research
- [x] BOM
- [x] Community chatter
- [x] Competitor analysis
- [x] Domain strategy
- [x] Monetization

## Executive Summary

This Work Request defines the architecture and implementation steps for an automated news aggregation system within the repository. It leverages GitHub Actions to periodically fetch top headlines from NewsAPI, process the data using Python scripts, and securely handle API keys. To optimize API usage, a caching strategy is introduced.

## Step 1A — Product/Output Selections

- **Primary Output:** Two GitHub Actions Workflows (`daily-news-briefing.yml` and `news-with-cache.yml`).
- **Processing Scripts:** Python-based scripts (`fetch_news.py` and `process_news.py`) to fetch and format the data.
- **Data Source:** [NewsAPI](https://newsapi.org).
- **Caching Mechanism:** `actions/cache@v4` to store and retrieve `news-cache.json`.

## Step 2 — Deep Web Research

- NewsAPI provides a robust endpoint (`/v2/top-headlines`) that can be filtered by country.
- GitHub Actions `schedule` triggers (cron syntax) are ideal for daily and 6-hourly intervals.
- Using `actions/cache@v4` is the standard approach to prevent redundant network requests and avoid API rate limits on free tiers.
- Python is chosen for the processing scripts due to its strong JSON parsing and data manipulation capabilities.

## Step 3 — Requirements

1. **Daily News Briefing Workflow (`daily-news-briefing.yml`)**
   - Runs daily at 06:00 UTC.
   - Checks out the repository.
   - Fetches headlines directly from NewsAPI using `curl`.
   - Processes the headlines using `scripts/process_news.py`.

2. **News with Cache Workflow (`news-with-cache.yml`)**
   - Runs every 6 hours.
   - Checks out the repository.
   - Restores `news-cache.json` using `actions/cache@v4` keyed by the current date and script hash.
   - Fetches new data via `scripts/fetch_news.py` only if there is a cache miss.
   - Processes the data using `scripts/process_news.py`.
   - Saves the cache.

3. **Security**
   - API keys must be stored in GitHub Secrets (`secrets.NEWS_API_KEY`) and passed securely.
   - Full SHAs must be used for all GitHub Actions dependencies per standard.

## Recommendations

- **Implementation Details:** Ensure that `fetch_news.py` and `process_news.py` are implemented robustly to handle missing API keys gracefully (e.g., skip or fail with clear messaging).
- **Supply Chain Security:** Pin `actions/checkout` and `actions/cache` to their full commit SHAs instead of floating tags (`@v4`).
- **Artifacts:** Consider uploading the processed news as a build artifact or creating a daily issue if notification is required.

## Risks

- **API Limits:** Free tier of NewsAPI may have strict limits. The caching mechanism is critical to mitigate this.
- **Secret Availability:** If `NEWS_API_KEY` is not set, workflows will fail. Scripts must catch this.
- **Cron Reliability:** GitHub Actions scheduled events can be delayed during peak times.
