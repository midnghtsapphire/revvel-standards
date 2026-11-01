"""Governed, database-driven Bitchslapper delivery; executed by Devin workflows."""
import asyncio
import json


REPO = "midnghtsapphire/revvel-standards"
BASE_BRANCH = "devin/1793555903-bitchslapper"
ROOT = "https://github.com/" + REPO
SESSION = "https://app.devin.ai/sessions/a54fa3608b1d4772be10f3683cfbc4bd"

RESULT = {
    "type": "object",
    "properties": {
        "branch": {"type": "string"},
        "commit": {"type": "string"},
        "summary": {"type": "string"},
        "artifacts": {"type": "array", "items": {"type": "string"}},
        "tests": {"type": "array", "items": {"type": "string"}},
        "blockers": {"type": "array", "items": {"type": "string"}},
        "contracts": {"type": "object"},
        "pr_url": {"type": "string"},
    },
    "required": ["branch", "commit", "summary", "artifacts", "tests", "blockers", "contracts"],
}

COMMON = """
You are a specialist in Audrey's approved six-agent Bitchslapper workflow.
Repository: midnghtsapphire/revvel-standards. Follow the OWNER RULE at the top
of AGENTS.md, VISITING_AGENTS.md, START_HERE_CALL_CHAIN.md, MASTER.md,
standards/PRESERVE_GOALS_AND_HISTORY.md, standards/COMMENT-DONT-DELETE.md,
standards/GREEN_MAIN_STANDARD.md, engines/CONTRACT.md, and applicable nested rules.
Read those and the actual existing code before editing. Do not create a second
pipeline: adapt existing engines, skills, labels, DB structures and local-model
routing. Prefer additive files/sections. NEVER DELETE or rewrite original work
wholesale. If you replace a block, retain the full original commented IN PLACE
with REVVEL-DISABLED metadata: date, agent/model, reason, WR/session reference,
replacement and detailed restoration instructions. Strict JSON originals must
remain intact; use additive migrations, not fake comments. No force pushes,
resets, cleans, history rewriting, merges into main, or unilateral service
cancellations. Never open a separate PR: the integration specialist opens one
combined draft PR. Commit/push early and report your branch and exact SHA.
Keep research, receipts, attribution and executable work in the repo, not /tmp.
Write only in your assigned scope to avoid integration conflicts; do not edit
shared root indexes, changelog, learnings or decision logs; integrator owns those.
No new files at repo root. Do not expose secrets or copy credentials into git.
No new purchases, credit topups, paid model calls or paid infrastructure creation.
Use existing authorized resources only. GitHub may be a git/PR API adapter, but
execution MUST NOT depend on GitHub Actions, artifacts, GHCR or its scheduler.
Do not retry hosted workflows to solve account billing. All acceptance checks
must run locally or on owned infrastructure. No browser/UI testing without the
parent obtaining approval; shell tests/API tests/builds are appropriate here.

Owner requirements (not optional): revvel-standards is the governing source;
Python preferred, CUDA optional and CPU functional; runtime state is DATABASE
DRIVEN (agents, skills, tools, providers, labels, routing, schedules, permissions,
jobs, receipts, costs, enabled=0/1). A new agent is a DB registration, not a new
per-agent file. Source code, schema migrations and governance documents remain
versioned files; they are not runtime inventory. Do not use JSON/YAML snapshots,
SQLite files, Python pickle/save scripts, or process-local dicts as production
state. Do not scatter duplicate registries. Prefer compatible reuse of the
existing SQL stack. Inspect the existing Drizzle/MySQL runner separately from
the monorepo's similarly named Next.js product; they are not the same app.

Emergency LOCAL_ONLY mode must deny paid egress, route to enabled, healthy,
capability-matched unpaid providers including LM Studio, and preserve/queue jobs
that truly require unavailable services. No fake success or false parity claims.
Every paid capability needs an explicit unpaid/FOSS alternative or honest gap;
self-hosted means no SaaS markup, not zero hardware/operating cost. Current
inventory dates/prices may be stale: verify, do not invent.

Preserve labels for manual operation. Labels should be DB-defined intent and
projection adapters, not a mandatory GitHub execution control plane. Record
transitions/idempotency. Switches must be auditable, tenant-scoped and effective
on the next job claim/dispatch; an already-running job needs explicit revoke or
drain semantics. DB roles, tenant boundaries, secrets references, bounded retries,
leases, capacity/backpressure and action allowlists are required, not decoration.

Visiting agents must receive active governance content and acknowledge its
version/hash BEFORE receiving effectful capabilities. A prompt alone cannot
force compliance; enforce admission, restricted workspaces, patch submission and
checks rejecting destructive replacements. New governance versions invalidate
old acknowledgments. Keep original history and do not claim acknowledgment proves
understanding. Owner asked this DB-backed admission path because agents destroy
whole modules. Preserve legacy BNAT implementation: parent's named imprint
returned known=false/imprinted=false because the default BIOME monitor feed only
contains sentinel/homeostat/medic/sheaf; consistency_check actually passed energy
0. Do not impersonate those workers, fabricate a healthy status, modify their
feed or relax epsilon. Surface this legacy incompatibility honestly. New DB
admission must be an explicit, tested addition, not a force-success flag.

User's product name is Bitchslapper. Octopus-style rich code reviews, architecture
graphs/trees/maps and WR/PR output matter more than a cosmetic name. Reuse real
upstream code where permitted. Octopus repository is github.com/octopusreview/
octopus, default branch master, Modified MIT, NOT plain MIT. Verified license:
retain copyright/permission; derivatives above 10,000 MAU OR USD100,000 monthly
revenue must prominently display 'Octopus Code Review' in their UI. Preserve
attribution and record pinned source commit. Do not assert closed-source vendor
code is available. Preserve favorite integrations: CircleCI, Jules, cubic, Bito,
Cursor, RecurseML and Octopus, among the canonical inventory. Treat 'prosection'
as adversarial prosecution review; identify 'deconstruct' if possible rather than
inventing a vendor. Distinguish marketing claims, code observations and measured
results. Enterprise SaaS/200-worker automation is a design goal; claim production
capacity only with actual evidence. Permissioned desktop/phone connectors must
be paired explicitly and default to no access; this VM is not Audrey's device.

Session/provenance: https://app.devin.ai/sessions/a54fa3608b1d4772be10f3683cfbc4bd
Use official docs before state-changing third-party API calls. Search relevant
skills before outward actions. Run applicable focused tests, lint, type checks
and diff checks. Preserve all baseline failures in reports; do not weaken gates.
"""

LANES = (
    {
        "label": "Octopus source and Bitchslapper review graphs",
        "suffix": "review",
        "scope": "products/bitchslapper/ and product-local tests/research only",
        "task": """Acquire the REAL Octopus source at a pinned SHA (use master, not
main). Read actual source/license and trace review, codebase retrieval, graphs,
trees/maps, WR/issue/PR rendering, providers and self-hosting paths. Base
Bitchslapper on that working code, not a 100-line imitation. Preserve untouched
upstream code, license and provenance in an additive product-local vendor/source
snapshot or robust pinned source acquisition arrangement; do not commit .git,
node_modules, secrets, binaries or generated caches. If vendoring, keep relevant
upstream source complete and documented, never strip attribution. Add Bitchslapper
branding/overlays while keeping original replaced blocks commented in place;
maintain native TypeScript UI instead of rewriting it just to satisfy Python
preference. Python integration adapters are preferred. Implement real review
graph/WR/PR exports and evidence-based prosecution (claims, location, supporting
evidence, counterargument/rebuttal, verdict), reusing products/merge-prosecutor
and skills/repo-audit where technically sound. Integrate the supplied contract
for DB-driven providers/enablement and governance acknowledgments. Paid calls
must remain disabled by default. Optional local model unavailable is a truthful
pending/failed state, not simulated intelligence. Include reproducible product
unit/API/build checks and source provenance. Explain remaining parity gaps and
verified versus inferred capabilities. Do not call paid inference or publish
the product publicly. Report exact source/license/UI graph paths and contract
adapter interface so the integrator can wire it without guessing.""",
    },
    {
        "label": "Database control and governance admission",
        "suffix": "control",
        "scope": "engines/owned-control/, its tests, and additive schemas/migrations in the contract's assigned control scope",
        "task": """Implement the architecture contract's real SQL-backed control
plane in Python. Reuse existing domain models/adapters rather than a second
independent product pipeline. Agents/tools/skills/providers/capabilities/routes/
labels/schedules/permissions/devices/governance acknowledgments/jobs/receipts/
audit events need relational persistence, tenant isolation and enabled 0/1
switches, with safe migration/install and no file-state fallback. Expose useful
authenticated HTTP, CLI and MCP interfaces over one implementation; validate
inputs and outputs. Registry changes should not require creating agent files
or redeploying code. Add transactional job claims/leases/idempotency, explicit
drain/revoke behavior and audit events. Enforce active-governance hash/content
acknowledgment before effectful dispatch, invalidation on governance change,
scoped credentials, permitted actions and patch admission that rejects deletions/
wholesale overwrites unless original code survives appropriately. Preserve the
legacy BNAT CLI unmodified; do not label its failed named imprint as passed.
Provide DB-backed admission independently with honest bootstrap documentation.
Secrets are references, never database plaintext logs. Tests must use a real
temporary/server SQL database when asserting transaction/concurrency semantics;
if none available report exactly that limitation, never substitute dict/SQLite
and claim real SQL verified. Include focused Python lint/type/unit/integration
checks. Write operational contracts in your own scope, not root docs.""",
    },
    {
        "label": "Local continuity, workers and device connectors",
        "suffix": "workers",
        "scope": "engines/owned-workers/, its tests and deployment assets only",
        "task": """Implement Python workers and adapters against the shared DB/
API contract (control lane owns SQL schema/API; do not change its files). Read
scripts/local_llm.py and scripts/llm-spend-gate.js and reuse proven protocol /
failure semantics instead of a new unrelated fallback chain. Resolve enabled
providers and endpoints dynamically from the control plane. LM Studio OpenAI-
compatible and Ollama local lanes need health checks, bounded retries, circuit
breakers, capability matching, context/resource checks and provenance. LOCAL_ONLY
must fail closed against cloud egress even if a cloud route is configured or
local providers fail. GPU/CUDA optional in Docker, not mandatory on CPU hosts.
Support durable claims, leases, heartbeats, cancellation/drain, restart recovery,
backpressure and quotas for multi-tenant multi-worker workloads. Provide generic
agent execution from DB registration, no new file per agent. Keep action runners
allowlisted: no arbitrary remote shell or untrusted-code execution in privileged
containers. Implement paired, authenticated, outbound-connecting desktop/device
bridge with narrow declared actions, signed/expiring capability requests and
explicit owner permissions; phone platform OS restrictions must be honest, no
claim of unrestricted iOS/Android control. Do not request/control Audrey's real
devices during development. Add owned Docker/Compose deployment and ordinary
non-GitHub execution; no GHCR required. Jobs requiring unavailable paid services
remain queued with reason. Test paid outage->local fallback, global local-only
egress denial, dynamic 0/1 disablement, revocation, cross-tenant denials and lease
recovery. Shell/simulated transport tests must not be described as a real phone
or GPU test. State scalability evidence versus architecture goals precisely.""",
    },
    {
        "label": "Tool capabilities, FOSS alternatives and bill-value gate",
        "suffix": "value",
        "scope": "engines/tool-value/, docs/tool-evaluation/, Library/tool-evaluation/, its tests, and skills/subscription-value-review/ only",
        "task": """Enumerate the real paid/trial tools from data/subscriptions.yml
and connected tools from config/connections.yml. Cover all subscription entries
plus CircleCI, Jules, cubic, Bito, Cursor, Octopus, RecurseML, n8n/Gumloop and
user's 'deconstruct' (identify from evidence or explicitly unresolved). Research
official current docs, actual public source/licenses, pricing/limits and privacy
terms. Produce a sourced capability matrix by task: adversarial/prosecution
review (not just marketing 'code review'), coding, repository context, graph/
tree/maps, tests, CI, fix verification, WR/PR feedback, API/CLI/MCP, local/selfhost,
GPU use, data egress and cost. Recommend what to use where; don't name one overall
winner or invent quantitative superiority without benchmark evidence. Distinguish
feature claims, implementation observations and tested results. Current inventory
dates/costs may be stale: label their provenance and verification date. Check
Qodo PR-Agent and other genuinely reusable sources; preserve license restrictions.
For each paid capability record unpaid/FOSS replacement, cutover action and gaps;
free hosted quotas are not a reliable emergency/local-only replacement. Base
operational inventory/assessments in the architecture's SQL contract, not another
JSON/YAML registry. Provide tested import/ingestion of the existing inventory
without silently changing statuses or canceling anything. Reuse scripts/
subscription-tracker.js deadline semantics and docs/standards/RUNNER_TARGETS.md
procurement rules. Implement automatic renewal/value-review preparation driven
by DB schedules: usage evidence, successful outcomes, regression/false-positive
rates, time saved, actual costs, hosting/maintenance/migration costs, alternatives,
recommendation, missing evidence and approval state. Missing data must return
needs_evidence, never pretend ROI or authorize charges. No purchases or automatic
cancellations. Export useful human-readable reports and a reusable governed skill.
No root index edits; integration specialist handles registration.""",
    },
)


async def specialist(lane, architecture):
    prompt = COMMON + "\nBASE AND CONTRACT:\n" + json.dumps(architecture, sort_keys=True)
    prompt += "\nFetch the architecture branch/commit and branch from that exact commit."
    prompt += "\nCreate task branch " + BASE_BRANCH + "-" + lane["suffix"] + "."
    prompt += "\nYour exclusive write scope: " + lane["scope"] + ".\n" + lane["task"]
    return await agent(
        prompt,
        phase="Parallel implementation",
        schema=RESULT,
        label=lane["label"],
        repos=[REPO],
        soft_time_limit_minutes=45,
    )


async def main():
    await register_workflow({
        "name": "Bitchslapper: governed database-driven autonomy",
        "description": "Architecture contract -> four source/implementation specialists -> integration and locally evidenced verification; preserves historical code and removes GitHub execution dependence.",
        "product": REPO + " / Bitchslapper and owned execution",
        "soft_time_limit_minutes": 35,
        "phases": [
            {"title": "Architecture contract", "labels": ["Enterprise architecture and admission contract"]},
            {"title": "Parallel implementation", "labels": [lane["label"] for lane in LANES]},
            {"title": "Integrate and verify", "labels": ["Governed integration and acceptance tests"]},
        ],
    })
    log("Architecture stage: establish SQL ownership, admission and shared adapter contracts before parallel writes.")
    architecture = await agent(
        COMMON + """
Your specialty is enterprise architecture and executable shared contracts. Start
from pushed branch devin/1793555903-bitchslapper, not a stale main snapshot, then
create devin/1793555903-bitchslapper-contract. Read actual engines/runner-
orchestrator, engine contract, runner targets, existing local LLM clients,
products/merge-prosecutor, data/subscriptions.yml, registry and skills. Inspect
midnghtsapphire/revvel-skill-runner if available to understand its actual SQL
schema (separate Drizzle/MySQL app); do not edit that repo or confuse it with the
monorepo Next.js product. Verify Octopus's actual upstream default branch master
and PostgreSQL/Qdrant stack. Select and justify a compatible SQL architecture,
one authoritative runtime inventory, explicit adapters to existing systems, no
blind duplicate orchestrator. No paid service provisioning or new secrets needed
to reason about this. Implement shared schemas/interfaces/database migrations
and executable contract-validation tests, not only prose. Provide exact HTTP/MCP/
worker/provider interfaces, package paths and ownership for the four lanes in
this workflow. Establish control-plane auth/governance bootstrap, tenant/workspace
identity, DB 0/1 switches with revoke/drain semantics, DB labels/manual mode,
LOCAL_ONLY paid-egress denial, provenance, capacity/backpressure and connector
pairing contracts. Define source-versus-runtime-data boundaries clearly.
Record how the owner-requested DB admission layer coexists with the legacy BNAT
static-monitor feed: do not mutate that feed or claim a passing named imprint.
No instruction-only gate; specify tests rejecting unacknowledged governance and
destructive patches. No hardcoded provider/agent inventories beyond data seed
migrations/imports. Python worker/control packages and CUDA optional; reused
Octopus UI remains native unless there is evidence a rewrite is required.
Write only docs/architecture/bitchslapper/, schemas/owned-execution/, and
contract-only tests under those scopes. Push early and report precise interfaces
and paths in the contracts result. Keep user scope traceability so nothing is
silently dropped: review graphs/WRs/PRs, paid-tool value/FOSS comparisons, offline
LM Studio operation, dynamic DB switches, multi-worker SaaS and local devices.
If a requirement cannot be safely resolved, return a concrete blocker rather
than inventing success. Later specialist prompts consume your structured result.
""",
        phase="Architecture contract",
        schema=RESULT,
        label="Enterprise architecture and admission contract",
        repos=[REPO],
        soft_time_limit_minutes=25,
    )
    if not architecture["branch"] or not architecture["commit"]:
        raise RuntimeError("Architecture produced no pushed contract; implementation aborted.")
    log("Contract pushed: " + architecture["commit"] + "; launching four independent scoped specialists.")
    # A barrier is required: the integration stage consumes every branch.
    contributions = await parallel([
        lambda lane=lane: specialist(lane, architecture) for lane in LANES
    ])
    for result in contributions:
        if not result["branch"] or not result["commit"]:
            raise RuntimeError("A specialist did not produce a durable branch: " + result["summary"])
    log("Four specialists finished. Integrating branches and verifying shared postconditions locally.")
    handoff = json.dumps({"architecture": architecture, "contributions": contributions}, sort_keys=True)
    integration = await agent(
        COMMON + "\nHANDOFF DATA:\n" + handoff + """
You own integration and verification, not a fresh independent rewrite. Fetch
all reported branches and verify their exact SHAs, start from the architecture
commit, and integrate each specialist's commits using targeted git operations.
Do not cherry-pick the shared architecture twice. If substantive conflicts arise,
report them; do not discard either contribution. Use final branch
devin/1793555903-bitchslapper-integrated. Check for and fix actual wiring gaps
among the SQL control plane, DB-driven workers, Bitchslapper source/graph/WR/PR
adapters and tool-value evaluation. Implement missing glue rather than leaving
disconnected demos. Preserve original modules commented with restoration details
if changing them. Keep enable/disable as DB controls, not per-agent files.
Wire existing orchestrator/registry/skills entry points additively and retain
old routes. Root CHANGELOG/learnings/decision logs/index registration belong to
you: append precise provenance, including this workflow and each contribution.
Do not change or expose Audrey's private ledger beyond these authorized repo
updates. Do not convert owner/governance sources into an external service.
Run focused tests/lint/type checks/builds, plus integration against an actual SQL
server when feasible. Acceptance: register a new agent without adding files;
0/1 disable blocks new dispatch; local-only rejects cloud even after local
failure; paid tool outage takes a capability-matched free lane or honestly
queues; tenant/device permissions deny unauthorized actions; governance-version
changes invalidate prior admissions; destructive patches rejected; jobs survive
worker restart/lease expiry; labels/manual intent maps to DB operations without
GitHub Actions; review produces real graph/tree/map plus WR/PR exports; value
report surfaces evidence gaps and alternatives without spending/canceling.
Exercise 200 concurrent worker/job claims if resources permit and distinguish a
claim/queue load test from real 200-user production readiness. GPU/phone/live
LM Studio not available means untested, not passed. Do not start a browser or
UI testing agent. No hosted CI retry; report billing limitations independently.
After pushing, follow skills and PR template to open ONE DRAFT PR into the
repo's correct governed base (inspect branch policy; never merge). Description
must be honest about delivered functionality, all remaining blockers, license
conditions, verified checks and untested hardware/devices. Return PR URL, exact
branch/SHA, artifacts, test evidence and precise gaps. Do not call the whole
enterprise system complete unless its postconditions genuinely hold.
""",
        phase="Integrate and verify",
        schema=RESULT,
        label="Governed integration and acceptance tests",
        repos=[REPO],
        soft_time_limit_minutes=50,
    )
    log("Integration result: " + integration["summary"])
    print(json.dumps({"architecture": architecture, "contributions": contributions,
                      "integration": integration}, sort_keys=True))


asyncio.run(main())
