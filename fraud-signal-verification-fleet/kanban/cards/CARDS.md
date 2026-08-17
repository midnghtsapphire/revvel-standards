# Cards

## FSV-01 — Calibrated scorer (DONE)
As an analyst I want every claim capped by source tier AND adjudication stage so
weak/early claims can't read as proven.
AC: tier cap + stage ceiling + corroboration/contradiction; deterministic; unit-tested.

## FSV-02 — Refusal gate (DONE)
As a publisher I want fraud-verdict requests on named people hard-refused.
AC: regex + claim flag → score 0, REFUSED, standing rationale; tested.

## FSV-03 — Fleet + judge (DONE)
5 agent role-contracts + judge that merges and writes verdict language.
AC: manifest renders; judge cannot raise a scorer band.

## FSV-04 — Master prompt (DONE)
Parallel fan-out + sequential chaining; raw-source decomposition path.
AC: documented run examples; output contract JSON.

## FSV-05 — Live dashboard (DONE)
Evidence-ledger HTML reading dashboard-data.json; refusals in lockout state.
AC: auto-refresh; confidence meters; source table; disclaimer banner.

## FSV-06 — Seed dataset (DONE)
Newsom DOJ-2026 claims from NY Post/BBC/C-SPAN; C5 fraud claim refused.
AC: schema validates; pipeline runs; integrity stays < 0.55.

## FSV-07 — Docs (DONE)
Framework, methodology, provenance, agent specs, roadmap.

## FSV-08 — CI + sanitizer (DONE)
GitHub Actions tests + smoke; prompt-injection ingest sanitizer.

## FSV-09 — Live retrieval (BACKLOG)
Wire agent-primary-source/financial to CourtListener, FEC, ProPublica.
AC: rate-limited, cached, every fact carries a URL.

## FSV-10 — Human review queue (BACKLOG)
No non-seed claim publishes without a reviewer approving its tier/stage.

## FSV-11 — Calibration backtest (BACKLOG)
Score resolved historical cases; plot predicted band vs actual outcome.

## FSV-12 — Entity graph (BACKLOG)
People/orgs/money nodes across cases; prevent cross-person imputation by design.

## FSV-13 — Signed snapshots (BACKLOG)
Hash + sign each published ledger; tamper-evident audit log.
