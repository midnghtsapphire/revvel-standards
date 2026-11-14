# Amazon Deal → Lemon8 — hourly revenue workflow

**Owner:** Audrey Evans (@midnghtsapphire)
**Source of truth for code:** [`midnghtsapphire/manus/automation/amazon-lemon8`](https://github.com/midnghtsapphire/manus/tree/main/automation/amazon-lemon8)
**Schedule:** hourly (see `schedule.md`)
**Tracking ID:** `meetaudreyevans00-20` (Amazon Associates, verified 2026-11-13)

## Purpose

Find one genuinely discounted Amazon item under the price cap, attach the meetaudreyevans Associates tracking ID, and publish a search-optimized Lemon8 post. Every published post carries the Associates disclosure. This is a revenue workflow: Lemon8 traffic converts through the affiliate link.

## Architecture

```
n8n Schedule (hourly)
  └─ Execute Command: python3 run.py --tag $AMAZON_TAG --publish
       ├─ Playwright profile (amazon.com + lemon8-app.com sessions)
       ├─ scrape Today's Deals → filter price/discount → pick best
       ├─ build https://www.amazon.com/dp/<ASIN>?tag=<TAG>&linkCode=ll1
       ├─ compose post + render 1080×1350 cover
       └─ publish via Lemon8 web creator, else stage and exit 3
  └─ IF exitCode == 0 → Slack/Telegram success notice
     ELSE → Slack/Telegram "needs human" notice with staged paths
```

## Why browser automation

Lemon8 has no public posting API and no native post sync with TikTok. A persistent, authorized browser profile is the approved path (see `manus/AGENT.md` §5). Amazon scraping also runs through the same browser to avoid bot blocks.

## Setup on a runner

```bash
git clone https://github.com/midnghtsapphire/manus
cd manus/automation/amazon-lemon8
python3 -m venv .venv && . .venv/bin/activate
pip install playwright pillow && playwright install chromium
python run.py --login   # one-time sign-in to Amazon and Lemon8
```

Environment: `AMAZON_TAG=meetaudreyevans00-20`, `MAX_PRICE=25`, `MIN_DISCOUNT=40`.

## Failure handling

| Exit | Meaning | Action |
|---|---|---|
| 0 | published or staged (non-publish mode) | log + continue |
| 2 | no qualifying deal | skip cycle, no post |
| 3 | Lemon8 session unavailable | notify owner; staged files in `out/` |

Never post an expired price: the runner re-reads the price at scrape time and stamps the post date.
