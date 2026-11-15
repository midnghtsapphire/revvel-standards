# oAudrey front page

Static page for `oaudrey.com` and `www.oaudrey.com`. It shows a browser demo of
an agent loop (plan, act, check, ship), the split between METAL's deterministic
GitHub checks and agentic planning, cards for the three product subdomains, and
the GOAP console plus its sales deck.

No analytics. No affiliate code. The loop does not call a model. The deck's
case study stays proof pending.

Serve the files locally:

```sh
python3 -m http.server 8080 -d products/oaudrey-home/public
```

The deck PDF is copied into the image from
`products/goap-swarm-console/public/goap-agent-sales-deck.pdf`. A local static
server of `public/` does not include that PDF until the image build copies it.

Image and health check: `Dockerfile` and `deploy/README.md`.
Spec: `.do/app.yaml`. `deploy_on_push` is false.

## Live GitHub board

`GET /api/team` and `GET /api/hub` read GitHub with `GITHUB_READ_TOKEN`.
Set that name in App Platform as a SECRET. The spec lists the name and does
not store a value. Without the token the page says the live feed is not
connected and the hub is closed for the night. Nothing is invented in its place.

The team payload keeps an allowlist: PR number, title, author login, check
name, check state, and a short quote copied from GitHub. It does not return
email addresses, review bodies in full, or branch names. Quotes are the check
title plus the first sentences of `output.summary`, the first sentence of a
review, or a commit subject. A check that is still running shows `thinking...`.
GitHub Actions is reported as `skipped (billing)` and is not counted as a failure.

`GET /api/hub` reads `hub-sources.json`. Bodies are off unless a source sets
`showBodies` to true. The shipped file leaves that false. Titles, author
logins, comment counts, and times still pass through a redaction step.

Both responses are cached in memory for five minutes. A low GitHub rate limit
stops further requests.

The world skin defaults to GitCandyland. GitAloha is the other skin, switched
in the page. The theme song credit links to Audrey Evans's recording. If
`public/audio/candyland-song.mp3` is added later, the play button uses that
file and does not load it until a visitor presses play. There is no autoplay.
