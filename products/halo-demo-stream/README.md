# halo-demo-stream

An AG-UI streaming and persistent-session demo kit for the REVVEL products.
Work request: [#18342](https://github.com/midnghtsapphire/revvel-standards/issues/18342).

- **AG-UI.** The agent's answer streams to the browser as Server-Sent Events
  carrying events from the open [AG-UI event standard](https://docs.ag-ui.com/concepts/events)
  (`RUN_STARTED`, `STATE_SNAPSHOT`, `TEXT_MESSAGE_START/CONTENT/END`,
  `STATE_DELTA`, `RUN_FINISHED`, `RUN_ERROR`). No custom protocol.
- **Session resume (the WR's "A2UI" half).** Every session is a JSON file keyed
  by session id. A new client with the same id (a second device, a reload, a
  restarted server) is handed the last committed state as its opening
  `STATE_SNAPSHOT`.
- **Real product code.** The `affiliate-hub` adapter calls the product's own
  catalogue and filter/sort module
  (`products/affiliate-hub/app/lib/programs.mjs`, the same module
  `app/page.tsx` renders from). It is a rule-based agent, not an LLM. Nothing
  is canned.
- **Zero dependencies.** Node built-ins only, so there is nothing to pin or
  audit beyond the Node version (22.11 or newer). No bots, no SaaS, no network
  access beyond `127.0.0.1`.

## Naming note on A2UI

The WR defines A2UI as "persistent state sync". The public A2UI project
([a2ui.org](https://a2ui.org)) is something different: a declarative
generative-UI format (`createSurface`, `updateComponents`, `updateDataModel`,
`deleteSurface`) that AG-UI can carry. This kit implements what the WR
describes (state persistence and resume, using AG-UI's own state events). It
does not emit public A2UI messages. See the PR description for the open
question.

## Run it (manual, no bots)

```bash
cd products/halo-demo-stream
npm start                       # http://127.0.0.1:4180/
```

Open the URL, pick a filter, press **Run agent**. The page shows the streamed
answer, the saved session state and the raw event names. To try "second
device": copy the resume link under *Session*, open it in another browser
profile or phone on the same network (set `HOST=0.0.0.0` first, see below),
and the saved state loads before you run anything.

Environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `PORT` | `4180` | listen port |
| `HOST` | `127.0.0.1` | bind address. Leave local unless you are on a trusted network; there is no auth |
| `DEMO_DATA_DIR` | `./data/sessions` (gitignored) | where session files are stored |
| `STREAM_DELAY_MS` | `60` | pause between streamed events so the stream is visible |

## Try it with curl

```bash
curl -N -X POST http://127.0.0.1:4180/agui -H 'content-type: application/json' \
  -d '{"threadId":"my-session-01","runId":"r1","forwardedProps":{"deviceId":"phone","query":{"filterType":"recurring","sortBy":"name"}}}'
curl http://127.0.0.1:4180/a2ui/sessions/my-session-01     # resume lookup
```

## Test it

```bash
cd products/halo-demo-stream
npm test
```

15 tests, about one second, offline:

- stream event order (`RUN_STARTED, STATE_SNAPSHOT, TEXT_MESSAGE_START, CONTENT+, TEXT_MESSAGE_END, STATE_DELTA, RUN_FINISHED`);
- events are delivered progressively, not buffered;
- results equal what the real `filterAndSortPrograms` returns for the same query;
- second device (new client, same session id) gets the first device's committed state, also across a server restart;
- two devices at once are serialised (no lost update);
- bad session ids, bad JSON and unknown products are rejected;
- demo page loads in under 2 s including a cold server start;
- every text/background colour pair in the page is at least 7:1, and the page makes no third-party requests.

CI runs the same tests in CircleCI (`demo-kit-test` job in `.circleci/config.yml`).

## Layout

```text
src/agui.js                  AG-UI events, SSE encode/parse, JSON Patch (shared with the browser)
src/session-store.js         file-backed sessions, atomic writes, per-session lock
src/server.js                POST /agui, GET /a2ui/sessions/:id, /health, page
src/adapters/affiliate-hub.js  agent backed by affiliate-hub's real code
public/index.html            plain HTML demo page, no external assets
tests/                       node:test suites
```

## What is not done here

- `ai-video-toolkit` and `screen-recorder-finder` have no adapter yet. Their
  filter logic is still inline in each `app/page.tsx`; the same extract-and-wire
  step as affiliate-hub applies (adapter template: `src/adapters/affiliate-hub.js`).
- The demo is not deployed and not on a public URL. Deploying needs
  DigitalOcean, DNS and Stripe (WRs #18330 to #18332), which are Audrey's.
- No auth on the endpoints. Fine for local runs; add it before any public deploy.
