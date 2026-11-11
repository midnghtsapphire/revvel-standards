# LEDGER: halo-demo-stream

Play-by-play record per `standards/LEDGER_STANDARD.md`. Append-only.

## 2026-11-11: AG-UI + session-resume kit, first product wired (QuickWinBuilder)

**Who:** QuickWinBuilder (MoneyCrew Builder), for Audrey (midnghtsapphire).
**Work request:** revvel-standards #18342. **Branch:** `wr18342-ag-ui-a2ui-demo-kit`.

**Decisions:**

1. Built a small reusable kit instead of three one-off demos. Products plug in through an adapter (`src/adapters/`).
2. AG-UI is implemented as the open standard (event names, SSE `data:` frames, JSON Patch for `STATE_DELTA`), not a custom protocol, per the WR's out-of-scope line.
3. The WR calls A2UI "persistent state sync". The public A2UI project is a declarative generative-UI format. Built what the WR describes (session persistence and resume over AG-UI state events) and flagged the naming mismatch rather than guessing. Open question in the PR.
4. Zero dependencies: nothing to pin beyond Node >= 22.11. Sessions are JSON files with atomic writes (SQLite is not usable on the CI Node without a flag; Postgres is optional and unneeded for a local slice).
5. Real code, not canned output: moved affiliate-hub's catalogue and filter/sort into `app/lib/programs.mjs`; `page.tsx` and the kit both import it. The agent is rule-based, not an LLM. Stated plainly in the README.
6. Commit before telling the client: the session file is written before `STATE_DELTA` is sent, so no client is ever ahead of what the next client resumes from.

**Verified (MEASURED, local, 2026-11-11):**

- `npm test` in `products/halo-demo-stream`: 15 pass, 0 fail.
- Mutation check: making the opening snapshot ignore stored state makes the second-device test fail, as it should.
- `next build` in `products/affiliate-hub` passes after the move (it first failed on a missed import, caught and fixed).
- Real Chrome (headless, driven over DevTools): opened `?session=...` from a second "device", saw the saved state load before any run, ran the agent, and the streamed answer, state (`runs` 2, `lastDevice` laptop) and status rendered.
- Cold server start plus page plus script: about 25 ms (limit 2000 ms).
- Contrast: lowest pair 10.03:1 (limit 7:1).

**Not done / blocked:**

- ai-video-toolkit and screen-recorder-finder adapters (same extract-and-wire step; not started).
- Anything on live URLs: products are not deployed (#18330 to #18332 need DigitalOcean, DNS and Stripe, Audrey's). The "state persists across device switches" criterion is shown locally, not on a live URL.
- Demo pages under 2 s are measured locally only.
- LLM-backed agent: not built.
