# PR lifecycle independence — session record

Date: 2026-11-06, America/Denver. Requested by Audrey Evans.

## Request and scope

Audrey requested a lifecycle-label workaround independent of GitHub Actions billing, review of existing work in `midnghtsapphire/revvel-standards` and related repositories, FOSS alternatives, community feedback, deterministic code, and preservation of every existing file. Her instruction permits retiring files by commenting or changing their extension with documentation. This task implements a label-only external reconciler; existing workflows remain intact pending a verified external host and an owner-reviewed draft PR.

## Actors and permissions

| Actor | Platform and role | Model identity |
| --- | --- | --- |
| `/root` | ChatGPT Work Mode, Codex orchestration and final review | Exact runtime model identifier not exposed in this record |
| `/root/repo_audit` | Same platform, repository and standards audit | Inherited parent model; no override requested |
| `/root/community_research` | Same platform, official sources and community evidence | Inherited parent model; no override requested |
| `/root/implementation` | Same platform, deterministic CLI and offline tests | Inherited parent model; no override requested |
| `/root/deployment` | Same platform, external-runner integration and cutover documentation | Inherited parent model; no override requested |
| `/root/records` | Same platform, additive handoff and decision records | Inherited parent model; no override requested |

Public Git clone/read access is verified. Local files can be edited. GitHub write access is **not verified and currently unavailable**: connector calls return `Unknown tool`, and `git push --dry-run` reports `could not read Username for 'https://github.com': No such device or address`. The plugin directory reports GitHub installed, so this is not evidence that Audrey omitted installation. No token values were printed or committed.

Audrey controls repository/app grants, account connections, and supplied task authorization. Tool availability, runtime network restrictions, and connector errors are platform/runtime properties; agents cannot change them by editing repository rules. No app permission change was made. No remote commit, draft PR, workflow disablement, timer activation, or production label mutation is claimed by this record.

## Reading and diagnostics

The team read the root and visiting-agent instructions, call-chain and governance entrypoints, applicable directory instructions, and task-relevant workflow, label, preservation, testing, deployment, and recording standards. This is a scoped audit, **not a claim that every one of the repository's roughly 4,761 checked-out files was read**. The repository audit describes the specific lifecycle files inspected.

The imprint check returned `known=false`, `imprinted=false`, `globalEnergy=0`, `h1ApproxZero=true`, and no obstructions for newly named visiting agents. Unknown identity is recorded, not represented as a successful imprint. Work remains additive code/tests/docs; no high-impact production cutover has been performed.

## Work products and evidence

- `scripts/pr-lifecycle-labels.mjs`: deterministic standalone lifecycle reconciler.
- `tests/pr-lifecycle-labels.test.js`: offline behavior/API tests.
- `docs/automation/pr-lifecycle-labels.md`: host setup, operation, cutover, and rollback.
- `config/systemd/pr-lifecycle-labels.service` and `.timer`: external scheduler configuration.
- `docs/research/pr-lifecycle-billing-2026-11-06.md`: repository audit and simplification findings.
- `Library/pr-lifecycle-label-research-2026-11-06.md`: sourced FOSS and community findings.
- `wr/pending/WR-pr-lifecycle-independent-2026-11-06.md`: work-request acceptance record.

These paths name the coordinated work products; test completion and final file presence must be verified by the root agent before publication. This record makes no passing-test claim. Production validation remains outstanding until authenticated reads/writes and the deployed timer are exercised.

## Decisions and handoff

Use ordinary deterministic code against GitHub's label APIs, independent of Actions execution. Keep the existing seven lifecycle label names initially because consumers already depend on them. Compute a desired state and mutate only managed-label differences; preserve unrelated labels. Separate label state from auto-merge, badge comments, issue closing, and LLM decisions.

The audit found overlapping lifecycle writers, including the self-healer; merely installing a replacement would allow competing writes. Cutover therefore requires retiring the specific old writers with preserved contents and dated notes, after the new runner is verified. The runbook owns the exact procedure. Rollback stops the external timer before restoring archived workflow names and the commented lifecycle call sites, preventing two writers from running concurrently.

The public repository `midnghtsapphire/revvel-dark-run` describes an existing runner outside GitHub Actions. Its suitability is being checked before suggesting another hosted pipeline. No server purchase or billable hosted service was authorized or provisioned.

Next owner: `/root` completes test review, final commit, and a draft PR when write access works. The GitHub and host-access limitations must remain visible in the delivery summary. Do not infer that an account billing error was inspected; the user reported the billing limitation, while this session directly verified code and public documentation only.

## Validation receipt — 2026-11-06

Root reports `node --test tests/pr-lifecycle-labels.test.js` passed 12/12 tests on Node 24.22.1. This is an offline test receipt; independent review is ongoing and it does not establish live API or timer operation. Prepared branch: `codex/pr-lifecycle-independent-2026-11-06`, based on `f969a2c1cc663a5a0c01382ab58f6bb4b9e5c94b`. The public inventory examined 204 repositories and found no dedicated label fork; `revvel-dark-run` is the existing external-runner integration target.

## Final local validation receipt — 2026-11-06

Root verified `node --test tests/pr-lifecycle-labels.test.js`: **19/19 passing** on Node 24.22.1; `node --check`: exit 0; `systemd-analyze verify` for the supplied units: exit 0; `git diff --check`: clean. The earlier 12-test result above is retained as an intermediate receipt. The optional hourly timer defaults to dry-run, and reconciliation includes a seven-day closed-PR sweep. Remote GitHub state remains unchanged and no host deployment is verified.

## Owner steering and independent review — 2026-11-06

Audrey clarified that the existing lifecycle badges should be preserved and asked about the roles of Cubic, CircleCI, and OpenHands. This supersedes the earlier proposal to omit badge updates: the requested behavior is deterministic preservation/update of the existing marked lifecycle badge, with explicit author selection. The implementation and revised validation receipt are pending at this entry; the preceding 19-test receipt predates this steering.

Independent reviewer `/root/review` (identity `codex-lifecycle-review`, ChatGPT Work Mode Codex; exact runtime model not recorded) read the entrypoint instructions, script/tests, and deployment documentation. Its imprint returned unknown identity, `imprinted=false`, zero energy, and no obstructions. It independently reported 19/19 tests and systemd unit verification passing before the badge addition. Its review recorded fixes for closed-PR sweeping, review timestamp ordering, per-PR continuation, resource-specific quota floors, and partial-mutation receipts. The reviewer performed no file edits or live writes.

Audrey also requested an OpenHands SQLite fix afterward. The repository-audit agent is searching for the actual error in read-only mode. No SQLite cause, fix, migration, or successful production recovery has been established by this entry.

## Badge-preservation validation — 2026-11-06

Following Audrey's clarification, the implementation now supports optional deterministic marked lifecycle badge updates with `--badges` and explicit `--badge-author` selection. Existing badge behavior is preserved through this opt-in path; no auto-merge behavior is added. Root reports **24/24 tests passing**, `node --check` passing, and `git diff --check` clean after the badge extension. Earlier 12- and 19-test receipts remain intermediate history. No live credentials, authenticated label/comment mutation, host deployment, or OpenHands SQLite recovery has been verified.

## Definitive local validation and SQLite handoff — 2026-11-06

Root's final run passed **25/25 tests**, including the badge concurrent-edit fingerprint regression. Syntax checking, systemd unit verification, and `git diff --check` all exited 0. This supersedes the earlier test counts as the latest local validation receipt; those earlier entries remain preserved as intermediate history. No live GitHub or host deployment receipt is available.

OpenHands SQLite investigation is recorded at `docs/research/openhands-sqlite-investigation-2026-11-06.md`. No attributable error was found in the inspected material. An exact traceback or affected task link is required to identify the failure; no SQLite fix is claimed.
