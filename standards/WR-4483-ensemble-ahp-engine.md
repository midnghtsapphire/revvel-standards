# WR-4483 — Heterogeneous-Ensemble AHP Decision Engine

- **Band:** 44xx (product build spec)
- **Status:** DRAFT rev 0
- **Depends:** WR-4380 (Self-Healer), WR-4470 (Validation Gate), WR-4480 (Multi-Model Routing), WR-4481 (Lane Failover), WR-4482 (Evidence-First Directive)
- **Origin:** Teardown of SSRN 5069656 (Svoboda & Lande, LLM-automated AHP). This WR fixes its five fatal/serious flaws and productizes the result.

## One-line root problem
Automated multi-criteria decision analysis exists but produces fake consensus (one model in seven costumes) with no validity checks — build the version with honest diversity and error bars.

## Prior-art flaws → requirements
| # | Prior-art flaw | Requirement |
|---|---|---|
| F1 | 7 personas, 1 model = correlated judgments | R1: judges MUST be distinct model FAMILIES (OpenRouter lanes per WR-4480) |
| F2 | Circular validation (matched training-data consensus) | R2: benchmark mode vs. human panel / held-out ground truth; report divergence |
| F3 | Consistency (CR<0.1) treated as correctness | R3: report CR AND inter-judge dispersion AND sensitivity analysis separately |
| F4 | Nonsense top criterion went unflagged | R4: face-validity critic gate before output |
| F5 | Cost claim ignored validation labor | R5: report full cost incl. critic + benchmark passes |

## Pipeline (Mode 1 = MCP tool)
```text
input: goal statement, optional criteria/alternatives
  1. STRUCTURE   -> guide model proposes tree depth, k judges (default 5), n criteria (default 7)
  2. GENERATE    -> each judge (distinct model family) proposes criteria + alternatives
  3. VOTE        -> score 1-9, aggregate: S_i = sum_k s_ik ; keep top-n
  4. COMPARE     -> each judge builds pairwise matrices (1/9..9)
  5. AGGREGATE   -> geometric mean: A(i,j) = (prod_k A_k(i,j))^(1/k)
  6. SOLVE       -> normalize columns; priority vector w_i = mean of normalized rows
  7. CHECK       -> CI = (lambda_max - n)/(n-1); CR = CI/RI; PLUS per-cell coefficient of variation across judges
  8. CRITIC GATE -> independent model attacks top-2 weighted criteria for face validity; failures loop to step 2 with critique injected (max 2 loops)
  9. SENSITIVITY -> perturb top-3 weights +/-20%; report rank stability of alternatives
 10. REPORT      -> best alternative = max over alternatives of sum_i (priority_i x alt_priority_given_i) + confidence label + full audit trail (JSONL)
output: ranked alternatives, weights, CR, dispersion, sensitivity, critique log, cost
```

## Architecture bindings
- Python MCP server (FastMCP); mcp-builder patterns
- Model routing: OpenRouter multi-lane (WR-4480); keyless failover 402/429 (WR-4481)
- Audit: JSONL ledger, hash-chained (Ed25519 / Merkle per audit-chain pattern); FAILURE-LEDGER compatible
- Discipline: WR-4380 act-not-announce; WR-4470 validation gate pre-release
- Append-only: no deletions; revisions as dated patches

## Milestones (one upward rev each)
- M1: MCP tool, 3 judges, steps 1-7 + report (skeleton) — STOP HERE, await approval
- M2: critic gate + dispersion + sensitivity (differentiator)
- M3: REST API wrapper; pricing decision AFTER 10 real runs of cost data
- M4: PDF report generator (client deliverable)
- M5: benchmark vs. published human AHP studies; publish divergence table (marketing asset)

## Validation gate (must pass before ship)
- [ ] 2+ distinct model families actually invoked (assert in ledger)
- [ ] CR < 0.1 AND dispersion reported (not hidden)
- [ ] Critic gate fires and logs on a seeded nonsense criterion (test fixture)
- [ ] Sensitivity table present; rank-stable flag correct on fixture
- [ ] Full cost line in report
- [ ] No fabricated numbers in template text

## Commercial note
Lead buyer-first: consultants, grant writers, security teams doing vendor selection. Marketplace (Claw Mart / Gumroad) is distribution, not demand. Confidence: MEDIUM — buyer profiles unvalidated; validate with 3 discovery conversations before M3.

## Implementing-agent checklist
1. Read this WR + WR-4482
2. Scaffold MCP server (M1 only) — do not expand scope
3. Log every judge call to FAILURE-LEDGER-compatible JSONL
4. Human merge required (directive-band policy)
5. Stop at M1; await upward-rev approval
