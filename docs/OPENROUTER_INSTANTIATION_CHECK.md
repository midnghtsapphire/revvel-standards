# OpenRouter Instantiation Check

**Issue reference:** *"There should be a routine to check if OpenRouter instantiated — even a thumbs up — and if not, capture why and use a Ralph loop to call in the heavy hitters if it cannot be resolved in a day."*

This document describes the automated routine that verifies OpenRouter is live and gives you at-a-glance visibility into where it is in the instantiation process.

---

## TL;DR

1. A scheduled workflow ([`openrouter-instantiation-check.yml`](../.github/workflows/openrouter-instantiation-check.yml)) probes OpenRouter once per day (and on demand).
2. It maintains a **single tracking issue** titled `OpenRouter Instantiation Status`.
3. On success the latest status comment gets a 👍 reaction and the issue is labelled `openrouter:instantiated` — the "thumbs up" the issue asked for.
4. On failure the issue is labelled `openrouter:instantiation-failed` (or `openrouter:needs-key` if the secret is missing), and the **captured error** (HTTP status + response body) is posted as a comment.
5. If the failure persists for **more than 24 hours**, the Ralph loop kicks in: the issue is labelled `openrouter:ralph-escalated` + `needs-human` and `@midnghtsapphire` is pinged.

---

## Lifecycle labels (at-a-glance visibility)

The tracking issue always carries exactly one of these four labels so you can see the state without opening the issue:

| Label | Meaning |
|---|---|
| `openrouter:instantiating` | A probe is running right now (briefly set at the start of each run). |
| `openrouter:instantiated` | ✅ Last probe succeeded — OpenRouter is live. |
| `openrouter:instantiation-failed` | ❌ Last probe failed — see the latest comment for the captured error. |
| `openrouter:needs-key` | ⚠️ `OPENROUTER_API_KEY` is not configured in repo secrets. |

A fifth label, `openrouter:ralph-escalated`, is added (not swapped) when the failure has persisted past the 24-hour Ralph threshold.

---

## Triage sub-labels

The issue comments also asked for sub-states on the generic `triage` label. They are now defined in [`.github/labels.yml`](../.github/labels.yml) and propagated to every Revvel repo by `sync-labels.yml`:

| Label | Meaning |
|---|---|
| `triage:new` | Freshly opened — a triager has not looked at it yet. |
| `triage:in-progress` | A triager is actively classifying it. |
| `triage:needs-info` | Waiting on the reporter for more information. |
| `triage:classified` | Labels + routing applied; ready for the owner. |
| `triage:escalated` | Escalated beyond the default triager. |

These are additive to the existing `triage` label; use whichever granularity matches your workflow.

---

## What the probe does

The workflow calls `GET https://openrouter.ai/api/v1/models` with the `OPENROUTER_API_KEY` secret. That endpoint is free to call and returns 200 only when the key is valid, so it's a clean authenticate-and-reachability test that doesn't burn tokens.

| Outcome | Lifecycle label set | Comment posted | 👍 reaction | `core.setFailed`? |
|---|---|---|---|---|
| HTTP 200 | `openrouter:instantiated` | Success, with model count | Yes | No |
| HTTP 4xx/5xx | `openrouter:instantiation-failed` | Captured status + body | No | Yes |
| Network error | `openrouter:instantiation-failed` | Captured `err.message` | No | Yes |
| Missing secret | `openrouter:needs-key` | Instructions to add it | No | No (operator action) |

---

## The Ralph loop: "heavy hitters if unresolved in a day

On every failed probe the workflow looks at the tracking issue's comment history, finds the most recent success comment, and computes `brokenForMs = now − lastSuccessTime` (falling back to the issue creation time if there has never been a success).

If `brokenForMs > 24h` and the issue is not already labelled `openrouter:ralph-escalated`:

1. Apply `openrouter:ralph-escalated` + `needs-human`.
2. Post an `@midnghtsapphire` comment explaining how long it's been broken and what the current error is.
3. The existing [`ralph-loop.yml`](../.github/workflows/ralph-loop.yml) and [`openrouter-assignee.yml`](../.github/workflows/openrouter-assignee.yml) already react to `needs-human`, so normal escalation machinery takes over from there.

You can **force-escalate immediately** (useful for rehearsal) from the Actions tab:

```bash
gh workflow run "OpenRouter Instantiation Check" -f force_escalate=true
```

---

## Triggers

| Trigger | Purpose |
|---|---|
| `schedule: "17 6 * * *"` | Daily health check at 06:17 UTC — deliberately off-the-hour to avoid GitHub's cron thundering herd. |
| `workflow_dispatch` | Manual re-probe from the Actions tab (optionally with `force_escalate=true`). |
| `push` to `.env.example` or this workflow | Re-probe immediately when the key config changes. |

The workflow uses a `concurrency` group so two probes never fight each other over the same tracking issue.

---

## Secrets used

- **`OPENROUTER_API_KEY`** — required for the probe itself.
- **`ADMIN_GITHUB_TOKEN`** *(optional)* — used to create the tracking issue / manage labels when the default `GITHUB_TOKEN` scopes aren't enough. Falls back transparently.

These are the same secrets used by [`openrouter-assignee.yml`](./OPENROUTER_ASSIGNEE_PROCESS.md); nothing new to configure.

---

## See also

- [`OPENROUTER_ASSIGNEE_PROCESS.md`](./OPENROUTER_ASSIGNEE_PROCESS.md) — how new issues get routed *to* the OpenRouter orchestrator.
- `skills/openrouter-swarms/SKILL.md` — OpenRouter routing, model selection, agent registry.
- `skills/ralph-loop/SKILL.md` — the Ralph self-healing pattern this check plugs into.
