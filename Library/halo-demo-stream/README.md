# halo-demo-stream evidence (WR #18342)

Evidence for the AG-UI + session-resume demo kit at
[`products/halo-demo-stream`](../../products/halo-demo-stream/README.md).

| Claim | How it was checked | Result |
| --- | --- | --- |
| Events follow AG-UI order over SSE | `tests/stream.test.js` | pass |
| Results come from real affiliate-hub code | `tests/stream.test.js` compares to `filterAndSortPrograms` | pass |
| Second device resumes first device's state | `tests/resume.test.js` (new client, same session id; also after server restart) | pass |
| Page loads in under 2 s | `tests/page.test.js`, cold start included | about 25 ms locally |
| Text contrast at least 7:1 | `tests/page.test.js` | lowest 10.03:1 |
| Works in a real browser | headless Chrome over DevTools, resume then run | pass (local only) |
| Product build still passes | `next build` in `products/affiliate-hub` after moving the catalogue | pass |

Not verified: anything on a live URL (products are not deployed), the public
A2UI generative-UI format (not implemented), an LLM-backed agent.
Play-by-play: [`products/halo-demo-stream/LEDGER.md`](../../products/halo-demo-stream/LEDGER.md).
