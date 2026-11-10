# Local CI gate repair — 2026-11-10

The authoritative CircleCI baseline had stale inline-script tests after its
Scripts-as-CI extraction, a Linux-only shell assumption after CARESSE moved to
Windows, and a Markdown test measuring the obsolete full-repository gate.

Tests now follow the actual imported script sources and retain aggregation,
authentication propagation, API-rate-limit guard, token, and pacing assertions.
The status handler is also executed with fake GitHub responses to verify a
green suite cannot override failing combined status and auth failures propagate.
Windows-only shells require an explicit Windows runner label per job; Linux,
generic self-hosted, mixed, and quoted-job-name regression cases still fail
when inappropriate. Legacy workflow invokers have accurate Windows labels.

The Markdown test uses CircleCI's merge-base changed-file scope and its exact
ignore globs and linter invocation. It neither widens the ignore list nor
turns the historical Markdown backlog into a second merge blocker. See
`learnings.md` TM-0008 for the original gate-scope decision.

The newly introduced six-hour PR-state GitHub Actions schedule is commented
out in place under #18313. The existing four-run/day allowance is unchanged.
No GitHub Actions runs or local scheduled-task installation occurred.

## Local drift repair

The existing imported script remains manually callable from an authorized
shell with `GH_TOKEN` set; no runner or app is necessary to execute it:

```text
node scripts/ci/pr-state-orchestrator.js resync --owner midnghtsapphire --repo revvel-standards
```

It still accesses GitHub's repository API to repair GitHub labels; it is not a
GitHub-independent product runtime. The reviewed GIT-FLEET local scheduler
already invokes `node runner/fleet.mjs tick` from its own checkout and settings.
No automatic schedule is installed here. The HULL local bridge in oaudrey is
the product command execution path; this repair does not add a second scheduler.
