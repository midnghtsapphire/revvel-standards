# Formal Verification → Auto Work Request (Human Review)

**Status:** ACTIVE · **Updated:** 2026-08-05  
**Implements:** dual-path XOR formal verifier (`boolean_xor_dual_path`) → automatic WR + draft PR  
**Hard rule:** Agents create the problem statement, solution, code, and docs. **You** review in GitHub. No autonomous merge.

## What formal verification is here

From the Grok Build sandbox pack (`disaster-recovery/grok-build-2026-08-05/formal/`):

- **Dual-path evaluation** of merge/conflict resolutions (path A vs path B)  
- Predicate bits (grounding, secrets, CI, standards, structural integrity, …)  
- **XOR** of bits → agreement_bps, risk_score, verdict  
- Verdicts: `pass` | `fail` | `needs_reaudit` | `structural_conflict` | `duplicate_risk`  
- Agent judgement scoring (was stance correct vs formal winner)

## When auto-WR fires

| Verdict | Action |
| --- | --- |
| `pass` | Label `formal:pass`; Project Formal Verdict=pass; no WR |
| `fail` | Label `formal:fail` + open WR + draft fix PR |
| `needs_reaudit` | Label `formal:reaudit` + open WR for re-evaluation |
| `structural_conflict` | WR with priority:p1 + needs-human |
| `duplicate_risk` | WR to dedupe / link canonical |

## Auto-WR contents (BASIC template)

Title: `[WR] Formal: <verdict> on <repo>#<pr> — <short title>`

Body must include:

- Formal report JSON summary (verdict, agreement_bps, xor_bits, rationale)  
- Predicates that differed between paths  
- Suggested fix steps (concrete files)  
- Labels: `wr`, `formal:auto-wr`, `human-review-required`, `priority:pN`  
- Link to full report artifact  

## Auto-PR contents

- Branch: `formal/auto-wr-<pr_number>-<ts>`  
- Commits: minimal failing repro or doc fix if known; else WR file under `wr/pending/formal/`  
- Never merge  
- Request review from CODEOWNERS / midnghtsapphire  

## Implementation files in this pack

| Path | Role |
| --- | --- |
| `scripts/formal-auto-wr.mjs` | Build WR markdown + gh issue/PR payloads from formal-report.json |
| `.github/workflows/formal-auto-wr.yml` | Schedule + workflow_dispatch + on report artifact |
| `disaster-recovery/.../formal/*` | Snapshot of verifier sources from sandbox |

## Integration with existing fleet

- Complements Ralph Loop / self-heal — formal is **truth about merge quality**, not just CI green  
- Scorecard: formal accuracy metric per agent  
- Gatekeeper: missing secrets → do not pretend formal pass  

## Human review contract

You asked for this explicitly: agents may create the whole problem and solution, but **you still review in GitHub**.  
This standard forbids:

- Auto-merge of formal fix PRs  
- Auto-close of human issues without comment  
- Suppressing fail verdicts
