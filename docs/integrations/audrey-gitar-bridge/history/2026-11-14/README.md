# Original task artifacts — 2026-11-14 UTC

The original standalone bundle and researched source notes are preserved without rewriting. Use `../../README.md` for the currently confirmed repository integration; older unconfirmed-target statements are historical.

| Archive | Bytes | SHA-256 |
| --- | --- | --- |
| `audrey-gitar-facebook-bridge.zip` | 49,225 | `68064be2e5387da70ac5e6511c1716e309b381fc5deebda1fa3c18d221ce1298` |
| `integration-research.zip` | 12,033 | `5d13f229299fc1a5c4d4d87a560d4a76c91a9e0f18a100d301a7626c2d20b1bd` |

The first archive contains all 20 originally delivered script, workflow, test, configuration-template and documentation files. Its original implementation passed 26 offline tests. The research archive contains `research-notes.md`, `facebook_integration_research.md` and supplied governance snapshots. It contains no account token, signing key or webhook secret.

The standalone publisher used GitHub's newer `queue: max`. The integrated publisher deliberately uses the existing repository-compatible queue behavior; no lint guard or exclusion was weakened. Historical code is preserved, not represented as the active installed configuration.
