# Changelog

## 2026-11-11 — MarketShipper — front page for oaudrey.com

- Added `products/oaudrey-home/` for the oaudrey.com root. The hero is a client-side demo of plan, act, check, and ship. The page links to `affiliate-hub.oaudrey.com`, `ai-video-toolkit.oaudrey.com`, and `screen-recorder-finder.oaudrey.com`, and to the GOAP console and deck. The image reuses `packages/static-stripe-server`. `deploy_on_push` stays false. No DigitalOcean deploy job was added. No live URL and no payment.
- Added `GET /api/team` and `GET /api/hub`, the GitCandyland world (GitAloha is the other skin), the mascot, and the theme-song link. Quotes are copied from GitHub. A missing token leaves the feed empty.
- Hold fixes: issue events, check runs, and commit statuses are sorted as separate streams. A 403 is a permission error unless the rate-limit signals are present. A partial board is not cached as connected. One in-flight build and the rate-limit reset are shared. The sales deck is `application/pdf`. A saved GitAloha skin updates the maze title on load.
