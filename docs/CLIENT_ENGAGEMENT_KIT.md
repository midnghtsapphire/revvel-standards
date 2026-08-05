# Client Engagement Kit — Contract Fleet Playbook

How the fleet plugs into a paying client's stack and does the work. The
client says "we do C# / .NET" (or Java, Python, TS, PHP, Go, Ruby…) and this
kit gets us from signed contract to client-style PR with a full audit trail.

Tooling lives in [`skills/client-stacks/`](../skills/client-stacks/SKILL.md):
`detect-stack.js` (stack profiler), `stacks/*.json` (polyglot lane packs),
`run-engagement.js` (reference engagement runner + action log).
Source WR: `wr/pending/09-client-contract-fleet.md`.

## 1. Stack detection

Point `detect-stack.js` at the client checkout (or backend export) and get a
stack profile: language, framework, test runner, CI system, package manager,
plus the matched lane pack.

```bash
node skills/client-stacks/detect-stack.js /path/to/client-checkout --json
```

Ambiguous repos list every scored candidate (`all_scores`) so a human can
pick the lane. Unknown stacks fail loudly — add a lane pack before engaging.

## 2. Polyglot lanes

Each `skills/client-stacks/stacks/<stack>.json` lane pack tells the coding
lane how to be a good guest in the client's codebase:

- **`prompt_pack.idioms`** — emit idiomatic code in THEIR style (detect
  their test framework, package manager, module style; never impose ours).
- **`verify`** — the CLIENT'S build + test commands. The lane runs their
  tests, not ours, before any PR opens.
- **`prompt_pack.pr_style` / `never`** — client-convention PR titles and the
  hard "do not do this in a client repo" list (no lockfile churn, no
  surprise dependency bumps, no new linters).

Shipped lanes: `dotnet`, `java`, `python`, `typescript`, `php`, `go`, `ruby`.

## 3. Integration tiers (cheapest first)

| Tier | What it is | Access we need | Typical work |
| --- | --- | --- | --- |
| **(a) API-only** | We call the client's REST/Graph APIs; no code access. E.g. Microsoft Graph for mailbox cleanup. | One scoped API token/app registration in THEIR tenant | Email triage/cleanup, data hygiene, report generation |
| **(b) Repo-level** | Fork/branch + PR into their GitHub / Azure DevOps. Their CI is the gate. | Read + PR permission on the target repo(s) only | Dependency updates, bug fixes, test-coverage lifts, backlog grooming |
| **(c) Fleet-in-their-infra** | Our workflow pack deployed inside their org with THEIR scoped tokens; nothing routes through our infra. | They install the pack; tokens never leave their org | Continuous automation: triage bots, self-healing, scheduled hygiene |

Always start at the cheapest tier that can deliver the contract; escalate a
tier only when the work demands it (and re-price).

## 4. Remedial-work menu (productized WRs + pricing hooks)

Each menu item is filed as a standard WR (`wr/WR_TEMPLATE_BASIC.md`) with the
client name, tier, and price attached; payment collection rides the
ship-to-market payment rails (issue #15508 — Polar.sh checkout links per
engagement).

| Menu item | Tier | Unit | Pricing hook |
| --- | --- | --- | --- |
| Email triage & mailbox cleanup (Graph API) | a | per mailbox / month | flat monthly, Polar subscription |
| Data hygiene (dedupe, normalize, validate exports) | a | per dataset | fixed quote after profiling |
| Backlog grooming (label, dedupe, close-stale, prioritize) | a/b | per 100 issues | flat batch price |
| Dependency updates + security patches | b | per repo / month | monthly retainer, Polar subscription |
| Test-suite repair / flaky-test cleanup | b | per repo | fixed quote after `verify` baseline run |
| Workflow-pack install + care (self-healing in their org) | c | per org / month | retainer, highest tier |

WR title convention: `[WR] [CLIENT:<name>] [TIER:<a|b|c>] <menu item>` — the
`CLIENT:` tag keeps client work visually and searchably separate from
internal WRs.

## 5. Isolation rules (contract-scoped security — non-negotiable)

1. **Client secrets NEVER enter this repo.** No client tokens, connection
   strings, or data in code, WRs, issues, logs, or commit messages. Client
   credentials live only in the client's own secret store (tier c) or in a
   per-client environment outside this repo (tiers a/b).
2. **Per-client secret scope.** One token per client per engagement, minimum
   permissions for the tier (see table above). No shared or org-wide tokens
   across clients. Revoke at contract end — revocation is a checklist item.
3. **Audit log of every action.** Every action taken in a client system is
   appended to `logs/client-engagements/<client>.jsonl` by
   `run-engagement.js` (and by the coding lane during execution): timestamp,
   actor, mode (dry-run/live), stack, action, detail. The log records
   what/where/when — never secrets, never client file contents. It is
   handed to the client on request and purged per contract terms.
4. **Dry-run before live.** `run-engagement.js` only plans; a human (or the
   review lane) approves the plan before the coding lane executes against a
   client system.
5. **Client code stays client-side.** Work happens in a fork/branch of THEIR
   repo; nothing from a client checkout is committed here. This repo holds
   only the generic lane packs and the (secret-free) action logs.

## 6. Engagement checklist

- [ ] Contract signed; tier (a/b/c) and menu items agreed; Polar pricing
      hook created (#15508 rails)
- [ ] Per-client scoped token issued by the client (minimum permissions for
      the tier); recorded WHERE it lives, never the value
- [ ] Stack detected: `detect-stack.js <checkout> --json` profile attached
      to the engagement WR
- [ ] Lane pack exists for the stack (else add one under
      `skills/client-stacks/stacks/` first)
- [ ] Dry-run plan generated: `run-engagement.js --repo … --task … --client …`
      and reviewed
- [ ] Task executed by the coding lane following the lane's `prompt_pack`
- [ ] Client's `verify` commands pass (their build + their tests)
- [ ] Client-style PR opened per the plan's `pr` spec
- [ ] Action log (`logs/client-engagements/<client>.jsonl`) complete and
      secret-free
- [ ] On contract end: token revoked, log handed over/purged per contract

## Reference engagement (Definition of Done)

The end-to-end reference run against a sample .NET repo is automated in
`tests/client-stacks.test.js`: it builds a minimal .NET repo (csproj + C# +
GitHub Actions CI), detects the stack (`dotnet`, aspnetcore-aware), plans a
dependency-update task, asserts the client's `dotnet restore/build/test`
verify chain and client-style PR spec, and checks the emitted action log.

```bash
node --test tests/client-stacks.test.js
```
