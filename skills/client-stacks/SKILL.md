# Client Stacks — Polyglot Client-Engagement Lanes

Hook the fleet into ANY client stack ("we do C# / .NET", Java, Python, TS,
PHP, Go, Ruby…) and do paid contract work in the client's own idiom, running
the CLIENT'S tests — not ours.

This is the engagement kit from WR
`wr/pending/09-client-contract-fleet.md`. The full playbook (integration
tiers, remedial-work menu with pricing hooks, isolation rules, engagement
checklist) lives in [`docs/CLIENT_ENGAGEMENT_KIT.md`](../../docs/CLIENT_ENGAGEMENT_KIT.md).

## What's in this skill

| File | Purpose |
| --- | --- |
| `detect-stack.js` | Point at a client checkout → stack profile (language, framework, test runner, CI, package manager) + matched lane. Zero-dep, runs anywhere. |
| `stacks/<stack>.json` | Polyglot lane packs: idiomatic prompt pack + the client's verify commands + PR-style rules per stack. |
| `run-engagement.js` | Reference engagement runner (dry-run planner): detect → load lane → plan client-style PR → emit per-client action log (JSONL audit trail). |

## Run

```bash
# 1. Profile a client repo
node skills/client-stacks/detect-stack.js /path/to/client-checkout --json

# 2. Plan an engagement (dry-run; emits plan + audit log, executes nothing)
node skills/client-stacks/run-engagement.js \
  --repo /path/to/client-checkout \
  --task "Update NuGet dependencies with security patches" \
  --client acme-corp --json
```

The coding lane (openrouter-coder / agent workflow) then executes the plan:
it loads `prompt_pack` into context, does the task, runs the lane's `verify`
commands (the client's own build+test), and opens the client-style PR
described in `pr`.

## Rules the coding lane MUST follow

1. **Run the client's verify commands** from the lane pack — never our test
   suite — before opening a PR.
2. **Obey the lane's `prompt_pack.idioms` and `prompt_pack.never` lists**
   (e.g. never `composer update` on a PHP client, never regenerate lockfiles
   on a TS client unless that IS the task).
3. **Isolation**: client secrets NEVER enter this repo; tokens are
   per-client scoped; every action in a client system is appended to the
   per-client action log (`logs/client-engagements/<client>.jsonl`). See
   the contract-scoped security rules in `docs/CLIENT_ENGAGEMENT_KIT.md`.
4. **Unknown stack?** `detect-stack.js` reports `stack: "unknown"` with all
   scored candidates — add a lane pack under `stacks/` (copy an existing one)
   instead of winging it.

## Adding a new stack lane

Create `stacks/<stack>.json` with `language`, `package_manager`,
`test_runner`, `verify` (the client's real commands), and a `prompt_pack`
(`idioms`, `pr_style`, `never`), then add detection signals in
`detect-stack.js` (`PRIORITY` + a scoring block). `tests/client-stacks.test.js`
validates every lane pack's shape automatically.
