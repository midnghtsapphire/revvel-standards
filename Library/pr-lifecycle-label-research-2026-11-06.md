# PR lifecycle labels: billing-independent execution and community research

Date: 2026-11-06. Researcher: Codex community-research sub-agent, ChatGPT Work Mode.
Scope: evidence and alternatives for Audrey's lifecycle-label request. This file is
an additive research record; it does not activate automation or change labels.
The coordinating agent owns implementation, changelog, ledger, and draft PR.

## Recommendation

Keep one deterministic lifecycle decision engine and run it through an existing
external runner or a small command-line reconciler. Use GitHub's REST API for
label changes. An alternative marketplace Action still requires GitHub Actions;
it does not remove that service dependency. Reuse the owner's existing
`revvel-dark-run` route if its execution contract fits. The deploy specialist
must verify that route before claiming it is running.

Use only the label differences actually required, retain unrelated labels, and
avoid model calls for state that GitHub already supplies. Audit consumers before
retiring any labels. Preserve old workflow text through the owner's approved
comment-out or non-workflow-extension procedure, with dated documentation.

## Evidence method and limits

Official documentation and upstream repository files are primary technical
sources. Community posts are individual experiences, not a representative poll.
Sources were retrieved on 2026-11-06. Search crawl/publication estimates are not
substitutes for dates visible in a post. No billing records or failing workflow
logs were available to this research task, so billing as the specific cause of
an outage remains to be established by the implementation/deployment inspection.

GitHub API public repository listing was read with `per_page=100&sort=updated`:
page 1 had 100 repositories, page 2 had 100, page 3 had 4, and page 4 was empty.
This covers 204 publicly listed repositories at retrieval, not private repositories,
installed Apps, starred projects, or code hidden under unrelated repository names.
Name/description matching is discovery, not a claim that every code file was audited.

## Current technical facts

| Finding | Evidence | Grade and implication |
| --- | --- | --- |
| Standard GitHub-hosted Actions in public repositories and self-hosted runners are currently described as free. | <https://docs.github.com/en/actions/concepts/billing-and-usage> and <https://docs.github.com/en/billing/concepts/product-billing/github-actions> | A1: official documentation. Free usage does not establish why a particular account's run is blocked. |
| PR labels can be managed through the REST Issues labels endpoints. GitHub App tokens and fine-grained PATs are supported. | <https://docs.github.com/en/rest/issues/labels> | A1: official endpoint documentation. External execution need not invoke Actions. |
| Probot supports standalone and serverless deployment as a GitHub App. | <https://probot.github.io/docs/deployment/> | A1: official framework documentation. Hosting and credentials still need provisioning. |
| Probot is ISC licensed. | <https://github.com/probot/probot> | A2: upstream repository. Suitable FOSS foundation if webhook operation is needed. |
| PR Triage models draft, review, approval, and merge state. The repository was archived on 2024-07-21. | <https://github.com/pr-triage/app> | A2: upstream README/archive notice. Apache-2.0 reference implementation; do not assume an actively maintained hosted service. |
| Probot Auto Labeler maps changed paths to labels and supports self-deployment. | <https://github.com/mithro/autolabeler> | A2: upstream repository, ISC license. Useful for path classification, not a direct lifecycle replacement. |

The cost conclusion is architectural: code run outside Actions makes no Actions
runner request. External compute, network availability, API rate limits, and token
maintenance still exist. Do not describe an unspecified hosted service as free.

## What the owner's public repositories already contain

Inventory endpoints:

- <https://api.github.com/users/midnghtsapphire/repos?per_page=100&sort=updated&page=1>
- <https://api.github.com/users/midnghtsapphire/repos?per_page=100&sort=updated&page=2>
- <https://api.github.com/users/midnghtsapphire/repos?per_page=100&sort=updated&page=3>
- <https://api.github.com/users/midnghtsapphire/repos?per_page=100&sort=updated&page=4>

| Repository | API observation | Relevance |
| --- | --- | --- |
| <https://github.com/midnghtsapphire/revvel-dark-run> | Public, not a fork; updated_at 2026-08-27T19:18:58Z. Description: Twin/trio runner that does not use GitHub Actions; intended for Actions billing locks. | Inspect and reuse its external execution path before adding another runner. Description alone is not proof of deployment. |
| <https://github.com/midnghtsapphire/revvel-market-scout-gha> | Public, not a fork; updated_at 2026-08-27T18:50:42Z. Marketplace evaluation system. | Existing discovery work may contain reusable comparisons; not itself proof of a lifecycle service. |
| <https://github.com/midnghtsapphire/babysitter> | Public fork; updated_at 2026-07-15T19:27:51Z. Description mentions deterministic, resumable orchestration. | General orchestration option, considerably broader than label reconciliation. No label capability established in this research pass. |

No dedicated label/triage/Probot fork was found by public name/description search.
GitHub repository search with `user:midnghtsapphire label fork:true` returned only
the unrelated music-label project `revvel-music-studio`; `triage` and `probot`
returned zero. This is not evidence that Audrey has no such code or private repo.

Local existing material in `revvel-standards` was also inspected:

- `templates/cicd/pr-labels.yml`: uses `joerick/pr-labels-action@v1.0.9` to read
  PR labels and expose outputs/environment variables. It includes multiple
  conditional reminder jobs. Reading labels is distinct from lifecycle ownership.
- `templates/cicd/labels-as-parameters.yml`: label-to-parameter adapter; retain
  until dependent consumers are understood.
- `templates/cicd/sync-labels.yml`: deterministic canonical label creation/update,
  explicitly preserves existing labels; currently packaged as an Action workflow.
- `templates/cicd/mergify-merge-queue-labels-copier.yml`: copies selected labels to
  Mergify queue PRs. It is conditional integration glue, not a lifecycle engine.
- `START_HERE_CALL_CHAIN.md`: identifies `pr-state-orchestrator.yml` as the
  lifecycle owner in the merge path.
- `MASTER.md`: says form fields take precedence over labels for routing.

## Community chatter: useful signals and friction

| Observation | Source and date | Evidence limit | Practical response |
| --- | --- | --- | --- |
| Labels help people filter and prioritize large PR queues. | <https://www.reddit.com/r/SideProject/comments/1ni5v85> (September 2025 search-index text) | One author's extension announcement; direct page retrieval unavailable. Not adoption statistics. | Keep labels that answer an actual queue/filter question. |
| Adding/removing labels to retrigger workflows becomes noisy and can increase cost. | <https://www.reddit.com/r/github/comments/1lyoyrq> (2025-07-13 comment) | Individual experience retrieved from indexed text. | Avoid labels as transient trigger switches; write only state changes. |
| Automatic label updates can reset updated_at and destabilize stale-state transitions. | <https://github.com/actions/stale/issues/1301> (opened 2025-10-29; corroborating comment 2025-11-14) | User report with example configuration; not independently reproduced here. | If age labels are required, measure substantive activity explicitly rather than raw updated_at. |
| Users dislike posting dummy comments to prevent closure while still waiting for maintainers. | <https://github.com/actions/stale/issues/995> (opened 2023-04-19) | Primary user feedback; maintainer acknowledged the request. | Separate inactivity observation from closure; exclude bot noise from meaningful activity. |
| High-volume bot/app messages make PR conversations harder to read. | <https://github.com/orgs/community/discussions/205499> (search-index result; exact post date not verified) | Indexed excerpt only; direct retrieval failed. Supplemental evidence, not a firm prevalence claim. | Prefer quiet label reconciliation and logs; avoid posting a new comment each cycle. |

These comments support simplification, not deleting all labels. Labels remain
useful when they carry a stable meaning and power a real view or consumer.

## Options and tradeoffs

| Option | Actions-independent? | Useful fit | Tradeoff |
| --- | --- | --- | --- |
| Existing deterministic lifecycle code plus external CLI/timer | Yes, when launched by the OS or existing external runner | Best first choice for this repository; small dependency surface | Polling latency; needs a durable machine and credentials |
| Custom Probot GitHub App | Yes, when hosted externally | Immediate event-driven operation across many repositories | App registration, webhook deployment, delivery recovery, dependency upkeep |
| Adopt/fork archived PR Triage | Potentially | Reference for lifecycle state modeling | Archived code needs maintenance and policy adaptation |
| Another GitHub Action or self-hosted Actions runner | No service independence | May reduce billed hosted minutes | Still schedules through Actions and may retain the account blockage |
| Hosted third-party label app | Usually, for execution | Low operational setup | Pricing, service availability, permissions and lifecycle semantics require separate verification |

## Deterministic simplification candidates

1. One lifecycle state calculation, independent of transport, shared by the
   existing integration and the external runner.
2. Explicit managed-label ownership; calculate a set difference against live
   labels and preserve manual/unrelated labels.
3. No label write for identical state; no recurring comment for identical state.
4. Keep label catalog synchronization separate from per-PR reconciliation.
5. Verify whether native draft/closed/merged filters replace redundant labels
   before changing their production behavior; existing downstream consumers win.
6. Keep form-driven routing authoritative per `MASTER.md`; do not create a new
   label-driven execution system while fixing label display.
7. Review broad `labeled`/`unlabeled` triggers for avoidable feedback loops. An
   external App token can trigger other workflows, so migrating the runner alone
   does not eliminate downstream Actions invocations.
8. Preserve every retired implementation and document rollback, tests, and exact
   deployment status. A local test is not a live label-update receipt.

## Validation criteria and remaining unknowns

Validate terminal/draft/review/failure/pending/unknown cases, repeated no-op runs,
manual label preservation, pagination, partial API failures, and rerun recovery.
Check downstream consumers and live workflow triggers before activation. Verify
billing failures from actual runs, identify the external host, and record a real
execution receipt before claiming the migration is active.

Research confidence: high for REST/API and deployment architecture; moderate
for the proposed reuse path until the existing runner is inspected; limited for
community prevalence because the examples are qualitative and self-selected.

## Follow-up: badges, Cubic, CircleCI, and OpenHands

Added 2026-11-06 after Audrey's follow-up. A badge displays status; lifecycle
labels classify a particular PR. Neither needs an LLM when the source state is
already available. AI review and code repair are separate capabilities.

| Component | Appropriate role | Existing repository evidence | Execution and cost distinction |
| --- | --- | --- | --- |
| Cubic | AI review; optional coding-agent fixes where the account supports them | `config/review-fleet-personas.yml` catalogs Cubic; `standards/REVVEL_CODE_REVIEW_FLEET.md` describes it as a candidate App; `scripts/auditor-controller.js` credits Cubic with identifying a fix. These records do not prove current installation/authentication. | Marketplace describes a GitHub App and background agents. Its own plan applies; it is not a generic free LLM endpoint. |
| CircleCI | Deterministic lint/tests; optional executor for an externally dispatched task | `.circleci/config.yml` explicitly owns lint and tests. Its header says an older OpenRouter review job duplicated review elsewhere and was removed previously. No such removal is performed by this research. | Execution is outside GitHub Actions, but CircleCI has its own credits/usage policy. A job invoking an LLM also needs that provider's configuration and usage budget. |
| OpenHands | Coding and repair using configured models | `scripts/call-openhands-api.sh` already calls the cloud service; `.github/workflows/agent-fallback.yml` invokes it. | The current caller remains Actions-triggered. Moving dispatch to the existing external host removes that Actions launch dependency; it does not establish cloud credentials or free inference. |
| Lifecycle reconciler and status badges | Deterministic state calculation and presentation | Existing lifecycle logic and the replacement under this task | Keep these operations free of LLM calls; attach an execution timestamp/source so old status is recognizable. |

Primary sources inspected for this follow-up:

- Cubic product/pricing: <https://www.cubic.dev/pricing-plans>.
- Cubic Marketplace App: <https://github.com/marketplace/cubic-ai-code-reviews>.
  These pages disagree about the free review quota at retrieval, so no fixed
  free quota is promised here. Confirm the account's actual plan before sizing
  recurring work. An open-source plan is not proof that every feature is free.
- CircleCI credits: <https://circleci.com/docs/guides/plans-pricing/credits/>.
  Credits apply to its hosted plans; open-source allowances have distinct rules.
  This is independence from GitHub Actions billing, not independence from all
  hosting costs.
- OpenHands CLI: <https://github.com/OpenHands/OpenHands-CLI/blob/main/README.md>.
  Its current README says the CLI is no longer actively maintained and directs
  users to Agent Canvas. Existing headless CLI deployments must follow their
  pinned version's environment override behavior (`--override-with-envs`);
  do not silently migrate existing workers or assume an old invocation still
  selects the intended model.
- OpenHands pricing: <https://www.openhands.dev/pricing/>. The current page
  identifies Agent Canvas as MIT/open source and free to self-host on a laptop
  or VM with a single user/shared identity and the user's own LLM key. Free
  software does not supply free model inference.

Recommended division of work: Cubic handles review, OpenHands handles coding or
fixes, CircleCI handles deterministic checks, and an existing external host
launches lifecycle reconciliation and any selected coding tasks. Verify installed
Apps, credentials, and a real execution receipt before claiming this division is
active. This research adds no installs, model calls, deployments, or account changes.
