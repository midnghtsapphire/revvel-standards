# WR: [WR] state engine failing

**Issue:** #13555  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Research Date:** 2026-05-18  
**Researcher:** GitHub Copilot + existing repo automation findings  
**WR Status:** ✅ Complete

---

## Executive Summary

The merge-blocking pain around the state engine is not just the `🎛️ PR State Orchestrator`; the immediate WR automation path was also creating a blank WR PR before deep research had finished, then skipping reprocessing once research labels and packets arrived. That produced a placeholder-only PR for issue #13555 and created extra workflow noise when PR comments retriggered `.github/workflows/wr-pr-creation.yml` as if the PR number were an issue number.

The safest fix is to treat deep research as the default gate for WR PR creation: only create the WR PR after `wr:complete` or `research:complete` (or a research-ready comment), import the research packet when no direct findings comment exists, and mirror the deep-research/research-lane labels onto the generated PR so the blank-template path and the "wordy WR" path share the same automation state.

**Sources:**

- Issue #13555 labels and comments, including the owner's PR feedback and research-engine review request.
- `.github/workflows/wr-pr-creation.yml`
- `.github/workflows/weekly-research.yml`
- `docs/WEEKLY_RESEARCH_PROCESS.md`
- Workflow run `26061851461` failure log (GitHub API rate-limit failure on a PR comment)

---

## Step 1: Repository Discovery

### Repository Metadata

| Property | Value |
| ---------- | ------- |
| Repository | [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards) |
| Created | 2026-02-20 |
| Last Updated | 2026-05-18 |
| Primary Language | JavaScript |
| Stars | 1 |
| Open Issues | 6,339 |
| Description | Single source of truth for all Revvel and MIDNGHTSAPPHIRE standards, processes, and specifications. |
| Private | False |
| Archived | False |

### Current Status

- **Active Development:** Yes — workflows, docs, and automation are being updated continuously.
- **Current WR Issue:** #13555 is open and already carries `weekly-research`, `deep-research`, `research-engine`, and `research:*` labels.
- **Current PR:** #13556 was generated too early and contains a template-heavy WR instead of a research-backed one.
- **Relevant Failure:** `WR PR Creation` run `26061851461` failed after a PR comment retriggered the workflow and exhausted the GitHub App installation core quota while fetching `issues/13556`.
- **Deployment Status:** Repository homepage is `https://revvel-standards.vercel.app`; this WR itself is internal automation work, not a new deployable product.

### Repository Structure Relevant to This WR

```text
.github/workflows/pr-state-orchestrator.yml
.github/workflows/weekly-research.yml
.github/workflows/wr-pr-creation.yml
docs/WEEKLY_RESEARCH_PROCESS.md
docs/RESEARCH_ENGINE_STANDARD.md
scripts/research-engine.js
tests/work-request-form-sync.test.js
```

### Key Technologies

- **Workflow runtime:** GitHub Actions
- **API integration:** `actions/github-script` (GitHub REST + GraphQL)
- **Repository mutation:** `actions/checkout`
- **Research synthesis:** `scripts/research-engine.js` + OpenRouter-backed lane orchestration
- **Validation:** repository Node.js test harness plus workflow validation checks

**Sources:**

- Repository metadata from GitHub repository search for `midnghtsapphire/revvel-standards`
- `.github/workflows/pr-state-orchestrator.yml`
- `.github/workflows/wr-pr-creation.yml`
- `.github/workflows/research-engine.yml`

---

## Step 2: Deep Research

### Market Opportunity Analysis

This is an internal DevOps/workflow reliability WR, so the market lens is operational leverage rather than direct paid acquisition. The sellable angle is reusable PR-state orchestration and WR-research automation that prevents merge stalls, label drift, and manual triage.

GitHub documents a **5,000 requests/hour** REST core limit per installation for standard GitHub App traffic, with rate-limit headers and backoff handling expected for integrations. That matters here because workflow noise and duplicate API calls can turn a labeling/research convenience into a merge blocker or review bottleneck when multiple automations are firing at once.

**Sources:**

- GitHub Docs: REST API rate limits and GitHub App rate limits
- Workflow run `26061851461` log showing `x-ratelimit-remaining: 0`

### Target Audience & Trigger Events

| Audience Segment | Trigger Event | Intent Level | Value of Fix |
| ----------------- | --------------- | -------------- | -------------- |
| Repo owner / operators | Merge blocked, labels drift, blank WR created | High | Immediate unblock and less manual cleanup |
| Review agents / coding agents | Research packet exists but PR lacks findings/labels | High | Cleaner downstream review routing |
| Future repos adopting standards | Need a reusable WR pipeline | Medium | Turns this repo into a workflow-hardening reference |

### SEO & Keyword Research

This WR is for internal automation, so public SEO volumes are not the decision driver. The right high-intent keywords to anchor documentation, searchability, and future productization are:

| Keyword | Intent | Why It Matters |
| --------- | -------- | ---------------- |
| GitHub Actions rate limit | Transactional / debugging | Directly matches the failure mode seen in run `26061851461` |
| PR state orchestrator | Navigational / implementation | Matches the user-reported failing engine |
| GitHub merge automation | Commercial / comparative | Useful if Revvel turns this hardening work into reusable automation |
| research packet workflow | Informational | Matches the repository's research-engine handoff model |
| GitHub workflow reprocessing | Informational / debugging | Exactly describes the blank-template rerun problem |

### Bill of Materials (BOM) — APIs & Tools

| Category | Tool / Option | Cost | Signal | Best For | Verdict |
| ---------- | --------------- | ------ | -------- | ---------- | --------- |
| GitHub workflow scripting | `actions/github-script` | $0 incremental | 4,953 GitHub stars | Labeling, comments, repo-content fetches, GraphQL helpers | ⭐ Recommended |
| Repository checkout | `actions/checkout` | $0 incremental | 7,903 GitHub stars | Branch/file mutation inside Actions jobs | ⭐ Recommended |
| Native merge orchestration | GitHub PR events + checks + auto-merge | Included in GitHub plan | First-party platform capability | Lowest-friction state machine inside the repo | ⭐ Recommended |
| General automation benchmark | `renovatebot/renovate` | OSS / self-hostable | 21,549 GitHub stars | Reference point for resilient PR automation patterns | ✅ Useful reference |

**BOM Decision:**

- Keep the stack GitHub-native.
- Use the existing research-engine packet as the handoff artifact instead of inventing a second research output format.
- Reduce wasteful API calls by filtering PR comments and only creating WR PRs after research completion signals exist.

**ROI Check:**
A single prevented blank-WR or merge-block incident pays back the infrastructure cost immediately because the incremental runtime cost is effectively zero; the real cost is lost operator time and queue delay.

### How the Industry Works — Mechanics

Reliable PR-state automation generally uses three rules:

1. **Use event filters aggressively.** Workflows should ignore events they cannot safely process, especially `issue_comment` events attached to pull requests.
2. **Prefer completion signals over optimistic early creation.** If a downstream document requires research, the creation workflow should wait for research-ready labels/comments instead of generating a placeholder and hoping another agent fixes it later.
3. **Mirror routing state onto the artifact that reviewers actually inspect.** If the issue is `deep-research` and `research:complete`, the generated PR must inherit those labels so reviewers and automation can find it without re-deriving state.

### Competitors & Alternatives

| Option | Type | Strengths | Weaknesses | Gap vs. Needed Fix |
| ------- | ------ | ----------- | ------------ | -------------------- |
| Current repo-native WR flow | First-party automation | No extra vendor cost, fully editable | Created blank PR before research was ready | Needs stricter creation gate + packet import |
| GitHub merge queue / native gating | Platform capability | Excellent for merge serialization | Does not solve WR research handoff by itself | Complement, not replacement |
| External merge bots (e.g. Mergify class tools) | SaaS automation | Rich policy controls | Extra dependency and pricing layer | Overkill for this specific WR bug |
| Renovate-style resilient automation patterns | OSS reference | Battle-tested rate-limit/backoff patterns | Not a direct WR engine | Good reference for hardening behavior |

### Community Chatter / Operator Signals

For this WR, the most important chatter is from the operator and the automation itself:

1. **"state engine failing cannot merge"** — the user-facing symptom on issue #13555.
2. **"the blank template WR needs to get deepresearched"** — direct feedback on PR #13556 showing the placeholder path is unacceptable.
3. Repeated issue comments advertised deep research and research review readiness, but the generated PR did not carry that state into the document or labels.
4. The failed workflow log shows the automation tried to process a PR comment as an issue and ran into a hard API quota wall instead of exiting early.

### Domain Name Strategy

Not applicable. This WR fixes internal workflow behavior in `revvel-standards`; no new product/domain is needed.

### Monetization Opportunities

- **Internal value:** faster merges, less manual cleanup, and fewer stuck automation states.
- **Externalizable value:** this can become a reusable "GitHub workflow hardening" pattern, template, or consulting playbook for repos that rely on research-gated PR automation.
- **Documentation value:** the resulting fix improves the credibility of `revvel-standards` as a source of battle-tested automation standards.

**Sources for Step 2:**

- Owner issue text and PR review comment
- GitHub Docs on REST API and GitHub App rate limits
- `docs/WEEKLY_RESEARCH_PROCESS.md`
- Search results for `actions/github-script`, `actions/checkout`, and `renovatebot/renovate`

---

## Step 3: Requirements from revvel-standards

### Prime Directive Alignment

This WR should end in working, tested workflow code, not another placeholder document. A WR PR that claims deep research is complete while shipping a blank template violates the repository's anti-scaffolding and instruction-resilience rules.

### Research Process Alignment

`docs/WEEKLY_RESEARCH_PROCESS.md` already says WR tasks receive automated deep-research treatment, and the repository memories confirm that every WR requires BOM, SEO/marketing signals, community chatter, monetization, and citations. That means the workflow behavior must match the documented standard: deep research is the default, not an optional second pass.

### Security / Compliance Surface

- No new third-party dependencies are required.
- The change stays within GitHub-native APIs and existing official actions.
- Ignoring PR comments in `wr-pr-creation.yml` reduces unnecessary API calls and lowers exposure to rate-limit exhaustion.
- Loading an existing research packet from the repository is safer than scraping arbitrary comment blobs because the packet is versioned content under repo control.

### Acceptance Gates

1. `wr-pr-creation.yml` ignores PR comment events.
2. WR PR creation waits for `wr:complete`, `research:complete`, manual dispatch, or a research-ready comment.
3. The workflow can import a research-engine packet when no direct findings comment exists.
4. Generated WR PRs inherit deep-research and `research:*` labels.
5. Tests covering WR workflow text/behavior expectations pass.

---

## Step 4: Technical Findings

### Finding 1 — The workflow created the PR before research was ready

The previous `detect-completion` logic set `should_create_pr` to true on issue open/reopen, so a WR PR could be created before the research engine finished. That is why PR #13556 contained a template with placeholders instead of research-backed content.

### Finding 2 — The workflow only recognized direct findings comments

The issue already had research-engine completion signals:

- `research:complete`
- `research:review-needed`
- `research:*` lane labels
- comments with `## Research Engine Review Request`

But the workflow only looked for comments containing `Research Findings:` / `## Research Findings` / `Executive Summary`, so it missed the research packet handoff that actually existed.

### Finding 3 — PR comments retriggered WR issue logic

`issue_comment` also fires for pull requests. Because the workflow did not guard against `github.event.issue.pull_request`, the comment on PR #13556 retriggered WR issue logic. The failed run then called `GET /repos/midnghtsapphire/revvel-standards/issues/13556` and exhausted the installation's core quota instead of exiting immediately.

### Finding 4 — The generated PR lost the issue's research state

Issue #13555 carried `deep-research`, `research-engine`, and multiple `research:*` labels, but PR #13556 only received a smaller label subset. That broke the parity between the blank-template path and the wordy, fully researched WR path.

### Recommended Fix

- Gate WR PR creation on research completion, not issue open.
- Treat research packet review comments as valid readiness signals.
- Import the research packet from the repository's default branch when direct findings comments are absent.
- Mirror deep-research and research-lane labels from the issue onto the generated PR.
- Keep the fix surgical: update the workflow and the targeted workflow tests only.

---

## Step 5: Implementation Plan

### Code Changes to Ship

1. **`wr-pr-creation.yml`**
   - Ignore PR comment events.
   - Require `wr:complete`, `research:complete`, workflow dispatch, or a research-ready comment.
   - Pull research packet content into `research-findings.md` when needed.
   - Copy research/deep-research labels from the issue onto the generated PR.

2. **`tests/work-request-form-sync.test.js`**
   - Assert that the workflow ignores PR comments.
   - Assert that `research:complete` and research packet comments are accepted signals.
   - Assert that generated PRs inherit deep-research and `research:*` labels.

### Non-Goals

- This WR does **not** redesign `pr-state-orchestrator.yml` itself.
- This WR does **not** introduce a new vendor service.
- This WR does **not** relax the deep-research requirement; it enforces it earlier in the pipeline.

---

## Step 6: Validation

### Targeted Validation to Run

- `node tests/workflow-yaml-validation.test.js`
- `node tests/work-request-form-sync.test.js`
- `npm run workflows:validate`

### Expected Outcome

- The YAML remains valid.
- The workflow script blocks still compile after expression substitution.
- The WR pipeline no longer creates placeholder PRs before research is ready.
- Future WR PRs inherit the same research/deep-research labeling that the issue already earned.

---

## Sources & Citations

1. Issue #13555 — title, labels, and comments (owner report plus research-engine review request).
2. PR #13556 comment from @midnghtsapphire: the blank-template WR must be reprocessed with deep research by default.
3. `.github/workflows/wr-pr-creation.yml` — previous early-create logic and PR labeling behavior.
4. `.github/workflows/weekly-research.yml` — deep-research labeling defaults for WR issues.
5. `docs/WEEKLY_RESEARCH_PROCESS.md` — WR flow, research requirements, and deep research expectations.
6. Workflow run `26061851461` failed job log — GitHub API rate-limit exhaustion after a PR comment retrigger.
7. GitHub Docs — REST API rate limits and GitHub App rate limits.
8. GitHub repository metadata/search results for:
   - `midnghtsapphire/revvel-standards`
   - `actions/github-script`
   - `actions/checkout`
   - `renovatebot/renovate`

---

**WR Status:** ✅ Complete  
**Recommended Next Action:** Merge the workflow hardening fix, then let future WR PRs generate only after deep-research completion signals exist.
