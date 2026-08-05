# WR: Bar-Chart-Race Infographic Engine (RisingInfographics)

**WR ID:** RIS-001
**Type:** product
**Status:** 🟢 Ready
**Out of Scope of:** OZ-OS-001 (intelligence layer)

## Source
LinkedIn post by @world_of_infographics — bar chart race showing people without
electricity access by country, 1990–2025.

## Stack

- **Data:** World Bank WDI indicators `EG.ELC.ACCS.ZS` (access to electricity, % of population) and `SP.POP.TOTL` (population total)
- **Calculation:** `people_without_electricity = population_total * (100 - access_to_electricity_percent) / 100`
- **Render:** Flourish Studio (easy path) OR Python `bar_chart_race` library (full control)
- **Polish:** CapCut or similar, vertical 1080x1920 for LinkedIn / TikTok / Reels

## Deliverables
1. `scripts/wdi-fetch.py` — pulls WDI indicators, joins datasets, computes access gap
2. `scripts/render-race.py` — outputs MP4 bar-chart-race animation
3. `data/anomaly-report.md` — flags missing, estimated, interpolated, or projected values (required because LinkedIn commenter caught India anomaly in the source)

## Requirements
- Show top 10 countries per year from 1990 to 2025
- Animate year-by-year as a bar chart race
- Use country flags beside names
- Display exact numbers with commas
- Title: "Number of People Without Access to Electricity by Country (1990–2025)"
- Subtitle: "A 35-year reality check on global electrification"
- Clean white background, bold readable labels, high-contrast bars
- Export vertical 1080x1920
- Source footer: "Source: World Bank WDI"
- Flag any missing, estimated, interpolated, or projected values
- Do not hide countries due to missing data without noting it

## Anti-Goal
Do NOT hide countries with missing data without an explicit footnote.
Do NOT use fabricated or interpolated data without marking it clearly.

## Agentic Version (future — see RIS-002)
Act as a data journalist + visualization engineer. Pull public World Bank data, clean it,
calculate the access gap, verify anomalies, create a bar chart race, write the LinkedIn
post copy, alt text, metadata, hashtags, and a 3-sentence fact-check note.

## Acceptance
- MP4 renders and plays
- Data matches World Bank source
- Anomaly report present and honest
- India discrepancy specifically investigated and documented
- No raw tokens or bracket-placeholders
