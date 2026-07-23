# AGENTS.md — Retro Review & Proposed Improvements

**Version:** 1.0.0  
**Date:** 2026-05-01  
**Author:** Goap / Copilot  
**Status:** Proposed — Awaiting Audrey Review  

---

## Why This Document Exists

The `oAudrey retro — 2026-04-30` issue (and every identical retro issue before it) flags the same two failures every week:

- `oaudrey.com` is not responding (HTTP 000)
- `fieldwork.oaudrey.com` is not responding

**These issues never get closed.** The retro workflow keeps running, keeps finding the same problems, and keeps opening new issues. Agents read the issues, acknowledge them, propose steps, and nothing changes. This document:

1. Diagnoses **why** the loop is stuck  
2. Reviews the current AGENTS.md for the specific gaps that perpetuate it  
3. Proposes concrete changes with rationale, comparison to current text, and why each change will succeed  

---

## Root Cause Analysis — Why "It Never Gets Fixed

### The actual blocker is infrastructure, not code

`HTTP 000` from curl means the DNS never resolved and/or no app was ever deployed to DigitalOcean App Platform. Fixing it requires **exactly two human-only actions**:

| Action | Why an Agent Cannot Do It |
|--------|---------------------------|
| Set `DIGITALOCEAN_API_TOKEN` GitHub secret | Requires authenticated access to GitHub repo settings → only a human (or an admin PAT) can write secrets |
| Point `oaudrey.com` nameservers to DigitalOcean in Namecheap (`ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com`) | Requires logging into Namecheap with the `uprisinghope` credentials — an agent has no way to do this autonomously |

No amount of re-running workflows, adding retries, or improving code changes the fact that **the credential and DNS setup must happen once by a human**.

### Why agents keep creating new issues instead of fixing this

Current AGENTS.md tells agents:

> **"Never stop at blockers. Do NOT escalate immediately. DO research solutions autonomously. DO implement fixes immediately."**

This is the right philosophy for **code blockers** (missing dependencies, broken workflows, bad config). It is the **wrong philosophy for infrastructure-credential blockers** where the human must act. Agents read the retro issue, see the instructions, and try to "fix" it by:

1. Writing more documentation (which already exists)
2. Creating another issue (adding noise)
3. Running the retro again (produces the same result)
4. Proposing the same steps (which are already documented)

### Why the retro workflow compounds the problem

The retro workflow runs on a **weekly cron** regardless of whether last week's issue was addressed. When DNS is not configured, every Monday at 06:00 UTC opens a fresh issue with the same title. No deduplication, no backoff, no escalation after N consecutive failures. The result is a growing pile of unresolved clones.

---

## Current AGENTS.md — Gap Analysis

### Gap 1 — No distinction between "code blockers" and "infrastructure blockers

**Current text (Autonomy Mandate, rule #1):**

> Never stop at blockers. When you encounter an error, missing dependency, unclear requirement, or failed process: Do NOT escalate immediately … DO research solutions autonomously … DO implement fixes immediately.

**Problem:** This rule makes no distinction between:

- **Code/config blocker** — agent CAN fix (wrong env var name, missing file, broken workflow YAML)  
- **Infrastructure/credential blocker** — agent CANNOT fix (secret not set in GitHub, DNS not pointed, live DigitalOcean app does not exist)

Agents apply the same "try to fix it yourself" logic to both categories. For infrastructure blockers this produces an endless loop of failed attempts without ever escalating to the human who holds the credentials.

---

### Gap 2 — Escalation threshold is too high and too vague

**Current text (Escalation Guidelines):**

> Escalate only when:  
> - You've tried 3+ different approaches and all have failed  
> - The decision requires spending money, deleting data, or changing auth/permissions  
> - **You need access to credentials you don't have**  

The third bullet IS correct — "credentials you don't have" should trigger escalation. But in practice agents do not recognize `DIGITALOCEAN_API_TOKEN not set` as "credentials I don't have." They treat it as a solvable technical problem (maybe the secret name is wrong? maybe the Doppler sync failed?). The text needs to be explicit that **missing GitHub repo secrets and live DNS/registrar access are always infrastructure blockers requiring human escalation**, regardless of how many approaches are tried.

---

### Gap 3 — No "infrastructure pending" state concept

**Current text (SHIP_STATUS.md and deploy checklist):** The deploy checklist lists `oaudrey.com returns HTTP 200` as a required check, but gives agents no way to record "this is blocked on human infrastructure action." The only states available are "done" or "still broken." There is no vocabulary for **"blocked on human-only action — not an agent failure."**

Without this concept, the retro workflow treats HTTP 000 identically whether:  
(a) the app was deployed but DNS is broken — fixable by agent  
(b) the app was never deployed and the secret doesn't exist — requires human  

Both produce the same `⚠️ Needs Work` output in the retro report.

---

### Gap 4 — No deduplication rule for repeating automated issues

**Current text:** There is no instruction preventing agents or workflows from creating duplicate issues for the same recurring, unresolved failure.

**Effect:** Each weekly retro run creates a new issue. After 4 weeks there are 4 identical open issues. Agents searching for "what needs doing" now see 4 signals for the same problem. This is noise, not signal.

---

### Gap 5 — oAudrey-specific "pending infrastructure" state not recorded in SYSTEM_STATE.md

`SYSTEM_STATE.md` currently lists `DNS` and `Production server` as `❌ Not deployed (standards repo)`. The note `(standards repo)` implies this is expected/normal and not actionable. But the oAudrey infrastructure IS intended to be deployed — it just hasn't been provisioned yet. This ambiguity lets the HTTP 000 retro failures appear "expected" rather than "pending human action."

---

## Proposed Changes

### Change 1 — Add "Infrastructure Blocker Protocol" section to AGENTS.md

**Where to insert:** After the "Escalation Guidelines" section.

**Proposed new text:**

```markdown
### Infrastructure Blocker Protocol

Not all blockers are equal. Before attempting a fix, classify the blocker:

| Blocker Type | Examples | Agent Action |
|---|---|---|
| **Code/config blocker** | Wrong env var name, missing file, broken YAML, bad import | Fix autonomously |
| **Infrastructure blocker** | GitHub secret not set, DNS not pointed, live app does not exist, registrar login required | Escalate immediately — do NOT retry in a loop |

**Infrastructure blocker = a human must act.** No code change, no workflow retry, no documentation update can substitute for a human setting a GitHub secret or clicking a DNS configuration in a registrar dashboard.

#### How to Handle an Infrastructure Blocker

1. **Identify it clearly.** Check: is this a code problem or a "someone needs to log in somewhere" problem?
2. **Document the exact human actions required** — specific, numbered, no vagueness:
   - "Set secret `DIGITALOCEAN_API_TOKEN` in GitHub repo settings → Secrets and variables → Actions"
   - "Log into Namecheap as `uprisinghope` → Domain List → oaudrey.com → Nameservers → Custom DNS → set ns1-3.digitalocean.com"
3. **Update SYSTEM_STATE.md** with status `⏳ Pending human action` and the exact steps.
4. **Do NOT re-run the failing workflow or create duplicate issues.** One clear, specific issue with exact steps is worth more than 10 repeat reports.
5. **Tag the issue** `infrastructure-pending` + `needs-human` so it stands out from code bugs.

#### Recognizing Infrastructure Blockers

You have an infrastructure blocker when ANY of these are true:
- A GitHub Actions secret is not set (check: `gh secret list --repo <owner>/<repo>`)
- A DNS record does not resolve (`dig +short <domain>` returns empty)
- A live cloud app/service does not exist and has never been deployed
- The fix requires logging into a registrar, cloud dashboard, or 3rd-party UI with credentials the agent does not have
- The Credential Gatekeeper reports `⚠️ missing in Doppler` for a required secret
```

**Why this will succeed:** It creates an explicit, named category — "infrastructure blocker" — with clear identification criteria and a distinct response protocol. Agents reading this will classify HTTP 000 + missing `DIGITALOCEAN_API_TOKEN` as an infrastructure blocker immediately, stop the retry loop, and escalate with specific human-readable steps instead of creating noise.

---

### Change 2 — Fix the retro workflow to deduplicate issues

**File:** `.github/workflows/oaudrey-retro.yml`

**Problem:** The script always creates a new issue if `gaps.length > 0 || needsWork.length > 0`. With a weekly cron and persistent HTTP 000, this opens a new issue every Monday forever.

**Proposed fix:** Before creating a new issue, search for open issues with label `retro` + label `oaudrey`. If one exists, add a comment to the existing issue instead of opening a new one.

**Why this will succeed:** Issue deduplication is a well-established pattern in GitHub Actions (using `github.rest.search.issuesAndPullRequests`). A single persistent issue that accumulates weekly status updates is far more actionable than 20 clones. The human sees one issue, sees it is still open, and knows the infra action is still pending.

---

### Change 3 — Update SYSTEM_STATE.md oAudrey entry to use "pending human action" state

**Current state entry:**
```text
| Production server | ❌ | Not deployed (standards repo) |
| DNS | ❌ | Not deployed (standards repo) |
```

The comment `(standards repo)` implies this is expected — this repo is a standards repo, not a product. But `oaudrey.com` IS a product being deployed from this repo. The ❌ entries should be relabeled as `⏳` with a clear note.

**Proposed entry:**
```text
| oAudrey App Platform app | ⏳ | Pending: set DIGITALOCEAN_API_TOKEN secret → run deploy-oaudrey.yml |
| oAudrey DNS (oaudrey.com) | ⏳ | Pending: point oaudrey.com NS to ns1-3.digitalocean.com in Namecheap (uprisinghope) |
```

**Why this will succeed:** When agents read SYSTEM_STATE.md (step 4 in the required file read order), they will immediately see `⏳ Pending human action` for the oAudrey entries with exact steps. This prevents them from treating the HTTP 000 as a mystery or as a fixable code problem.

---

### Change 4 — Add "Pending Infrastructure" label to learnings.md

When recurring infrastructure blockers are identified, add a learnings.md entry so agents in future sessions know to look for SYSTEM_STATE.md `⏳` entries first before investigating.

---

### Change 5 — Add oAudrey context to AGENTS.md "Project-Specific Context" section

**Current:** The "Project-Specific Context" section describes a "Sessiono" session musician platform — this is generic template content that was never updated for this repo.

**Proposed:** Replace or augment it with oAudrey-specific context:

```markdown
### Project: oAudrey Hub (oaudrey.com)

**Status:** Infrastructure pending human provisioning  
**Blocker:** `DIGITALOCEAN_API_TOKEN` secret not set; DNS not pointed to DigitalOcean  
**Do not:** Run `deploy-oaudrey.yml` without the secret set — it will skip silently  
**Do:** If the retro reports HTTP 000, check SYSTEM_STATE.md first — if marked ⏳, this is an infrastructure blocker, not a code bug  
**Human actions required:**
1. Set `DIGITALOCEAN_API_TOKEN` in GitHub repo secrets (DO Dashboard → API → Personal Access Tokens)
2. In Namecheap (`uprisinghope`): set oaudrey.com nameservers to `ns1.digitalocean.com`, `ns2.digitalocean.com`, `ns3.digitalocean.com`
3. In DigitalOcean: add oaudrey.com + fieldwork.oaudrey.com as custom domains on the App Platform app
4. Re-run `oaudrey-retro.yml` to confirm HTTP 200
```

---

## Summary — What Changes, What Is Kept, and Why

| # | What Changes | What Is Kept | Why |
|---|---|---|---|
| 1 | New "Infrastructure Blocker Protocol" section in AGENTS.md | All existing autonomy/self-healing rules | Adds a named classification that stops the "retry everything" loop for human-only actions without weakening agent autonomy for code problems |
| 2 | `oaudrey-retro.yml` deduplication: comment on existing open issue instead of creating a new one | All existing health-check and gap-analysis logic | Stops issue spam; makes the persistent issue the single source of truth for the deployment status |
| 3 | SYSTEM_STATE.md: `⏳` entries for oAudrey infrastructure | All other status entries | Makes the pending human action visible at step 4 of the required reading order — before agents do any work |
| 4 | Project-specific context in AGENTS.md updated to reflect oAudrey instead of "Sessiono" | All other context | Correct context = correct decisions from agents on first read |
| 5 | `learnings.md` entry for the "infrastructure blocker" pattern | All existing learnings | Persistent memory: future agents apply this lesson immediately |

---

## Why These Changes Will Be "120% Successful

The changes target the **four structural failure modes** in the current loop:

1. **Classification failure** → Fixed by Gap 1/Change 1 (infrastructure vs. code)
2. **Escalation failure** → Fixed by Gap 2/Change 1 (clear "you need credentials you don't have" escalation path)
3. **State representation failure** → Fixed by Gap 3/Change 3 (SYSTEM_STATE.md ⏳ state)
4. **Noise accumulation failure** → Fixed by Gap 4/Change 2 (deduplication in retro workflow)

After these changes:
- An agent starting a new session reads GOAP.md → GOAL.md → learnings.md → SYSTEM_STATE.md in order
- SYSTEM_STATE.md shows `⏳ Pending human action` for oAudrey DNS and app platform
- The agent reads the exact human steps and creates ONE clear escalation issue with those steps
- The retro workflow adds a weekly comment to the SAME issue (not 52 new issues per year)
- The human (Audrey) sees one clean issue with exact steps, not a pile of noise
- Once she sets the secret and DNS, the retro closes the issue automatically on next run

The "120%" is the difference between agents that keep failing the same way and a system that **learns its own failure pattern and routes it correctly from session one forward**.

---

## Related Files

- `docs/AGENTS.md` — file being reviewed/improved
- `standards/OAUDREY_DEPLOYMENT_STANDARD.md` — full deployment guide (already complete)
- `.github/workflows/oaudrey-retro.yml` — workflow being patched (deduplication)
- `SYSTEM_STATE.md` — being updated with `⏳` entries
- `learnings.md` — being updated with infrastructure blocker lesson
