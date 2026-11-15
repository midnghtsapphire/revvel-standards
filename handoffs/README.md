# handoffs/

Daily bot handoffs. The rule is **S1 to S7 in [`AGENTS.md`](../AGENTS.md)**.

- Every bot, including visiting agents, reads the newest `handoffs/<bot>/YYYY-MM-DD.md` in its own repo before any work. A bot with no repo uses `handoffs/<bot>/` here in `revvel-standards`.
- Every bot writes one at the end of each work day, from [`TEMPLATE.md`](TEMPLATE.md). Dates are America/Denver.
- Append-only. A correction is a new dated section. Nothing is edited or deleted.
- Audrey's words are quoted exactly, with the date. No secrets, private emails or personal addresses.

Added 2026-11-14 at Audrey's request (t421u). Nothing in this repo was overwritten to add it.

| Bot | Newest handoff |
| --- | --- |
| Proofy | [`proofy/2026-11-14.md`](proofy/2026-11-14.md) (seed, built from Proofy's transcript) |
| TriageChief | [`triagechief/2026-11-14.md`](triagechief/2026-11-14.md) (written by the TriageChief executor) |

## Enforcement (S7)

`scripts/check_handoff.sh` runs in the CircleCI `lint-and-test` job. A PR from a branch whose prefix is listed in [`bots.conf`](bots.conf) fails when it changes anything outside `handoffs/` and `handoffs/<bot>/` has no file dated today or yesterday (America/Denver). Any other branch only gets a warning. To add a bot, append `<branch-prefix> <bot>` to `bots.conf`. Run it by hand with `bash scripts/check_handoff.sh`. Tests: `tests/check-handoff.test.js`.
