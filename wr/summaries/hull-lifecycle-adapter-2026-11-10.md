# HULL lifecycle adapter MVI — 2026-11-10

## Context

Issues #18337 and #18339 have an optional SQLite lifecycle and an existing HULL command executor, but no connection between them.

## Feature

Connect lifecycle actions to explicit operator-approved HULL skills; persist receipt references and stop on rejected or failed control actions. Keep deployment behind recorded approval.

## Dependencies

Existing LangGraph and SQLite checkpoint packages; existing oaudrey HULL source, PyYAML and structlog. No new dependency, provider, model call, hosted workflow or service.

## Acceptance

Execute real benign subprocess skills through HULL, persist approval across SQLite reopen, reject changed manifests, stop after failed healing, honor retry limits and reject missing command mappings. Original #18337 production durability and #18339 measured healing-rate/time targets remain open.

## Out of scope

Production deployment, autonomous generated fixes, untrusted-code sandboxing, model management, new orchestration engine and issue closure.

## Files

scripts/wr_langgraph.py; tests/wr_langgraph_test.py; this document. Existing HULL source is reused without edits.

## Rollback

Stop invoking this opt-in adapter and retain SQLite/receipt evidence. Existing callback workflow remains available. No background service or production configuration is enabled.

## Usage and evidence

The adapter is opt-in; ordinary callback callers continue to work. Add the reviewed oaudrey `orchestrator` directory to your application's import path, instantiate its existing `SkillRouter`, call `discover()`, then construct `HullActions(router, mapping, policy_path=..., receipt_dir=...).actions()` as the actions argument of `persistent_workflow`. Map `build`, `test` and `deploy` to exact operator-approved skill names. `heal` is optional: an absent approved skill stops the run. Intake/research only checkpoint metadata and do not claim completed research.

Use the existing HULL policy generator for approved product commands. A lifecycle deployment mapping requires a separately reviewed policy entry; this change creates none and invokes no deployment. A successful ordinary test failure can enter bounded healing; rejection and timeout halt. Failed builds and failed/rejected healing halt. Receipt references persist in SQLite while full process evidence stays in HULL's local receipt directory. HULL policy and manifest validation remain authoritative; this adapter never interprets logs as commands or accepts arbitrary argv.

Run the external integration harness explicitly from the standards checkout in PowerShell:

```powershell
$env:HULL_SOURCE = (Resolve-Path ../oaudrey-hull-daily).Path
$env:PYTHONPATH = (Resolve-Path ../oaudrey-hull-daily/.venv/Lib/site-packages).Path
node scripts/run-python.js tests/wr_langgraph_hull_integration.py -v
node scripts/run-python.js -m unittest discover -s tests -p wr_langgraph_test.py -v
```

`HULL_SOURCE` identifies the reviewed existing source checkout; `PYTHONPATH` above supplies its existing Python dependencies. On POSIX use that environment's `lib/pythonX.Y/site-packages` directory or run an environment already containing the existing dependencies. This harness is separate from default unit discovery because it requires an explicit external source checkout; it has no skipped cases or fake executor.

Measured locally on 2026-11-10: combined lifecycle and actual HULL subprocess suite passed 11 tests in 6.127 seconds before splitting the harness into its explicit file. Tests cover real exit-code failure, deterministic healing, approval denial, SQLite reopen before approval and after failed test, changed manifest rejection, unknown/missing mapping, timeout, and retry exhaustion. Test commands only touch temporary fixture files. No paid provider, inference, product deployment or hosted CI was used.

External command effects remain at-least-once: a crash between subprocess completion and SQLite checkpoint commit can replay an action. Operators must use idempotent commands or separately reconcile receipts before recovery. HULL is a trusted operator runner, not an untrusted-code sandbox. No production wiring, distributed lease guarantee, healing-rate benchmark, token saving, or completed issue acceptance is claimed. Issues #18337 and #18339 remain open pending production acceptance evidence.

## Operator CLI

The existing module also exposes an explicit CLI. `node scripts/run-python.js scripts/wr_langgraph.py --help` lists required paths. Supply the reviewed HULL source, discovered skills directory, operator-owned JSON mapping, HULL policy, receipt directory, SQLite database and stable thread identifier. Mapping JSON has exact lifecycle keys `build`, `test`, `deploy`, and optionally `heal`, whose values are approved HULL skill names. The CLI adds no commands to that policy.

Start with `--issue 18337` and a fresh `--thread`. A duplicate thread start fails rather than replaying existing work. Use `--resume continue` for an ordinary unfinished checkpoint; use `--resume approve` or `--resume deny` only for a pending review interrupt. Approval is never inferred from a structured response or command result. The CLI validates that the imported router comes from the explicitly supplied source checkout. Its final stdout JSON includes local receipt references; discovery diagnostics go to stderr. Keep receipt/log files local because child tools may print sensitive data to their own log files.

The CLI integration test uses only temporary benign fixture commands, checks explicit resume requirements and denies deployment. Production policy review and human approval are still required before configuring an actual deployment skill.
