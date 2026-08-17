# Memory snapshot — 2026-08-05

## Facts
- SSOT repo: midnghtsapphire/revvel-standards  
- User wants human review on all agent WR/PR output  
- Formal method: boolean_xor_dual_path, 78h window seed  
- MODEL_CONFIG: Claude Sonnet denylisted; Opus twins + Fable 5 reasoning  
- PRIME DIRECTIVE: $10k/mo → $10M in 3 years  
- Orchestrator must delegate + record provenance (AGENTS.md)  
- learnings.md is append-only; whole-file write tools forbidden on it  
- 301 labels as of snapshot (see labels-snapshot-2026-08-05.txt)

## Sandbox formal agents (from formal-report.json)
| login | accuracy_bps |
| --- | ---: |
| openrouter | 10000 |
| Copilot | 10000 |
| midnghtsapphire | 8000 |
| devin-ai-integration[bot] | 5000 |
| github-actions[bot] | 0 |
| dependabot[bot] | 0 |

## Files preserved under formal/
- bootstrap.ts, xor-verifier.ts, dashboard-api.ts, seed-78h.ts  
- formal-verify.mjs, 0002_formal_verification.sql, formal-report.json  

## Constraints remembered
- No autonomous merge, launch, spend, IP filing  
- COMMENT-DONT-DELETE culture  
- Prefer automation wiring over label soup  
