# AGENT_STACK_SETUP

> AI agent stack setup guide for shipping WR (Working Release) artifacts.

## Purpose

Agent stacks (Claude, OpenHands, Cursor, etc.) handle code generation well but leave the **delivery layer** unaddressed. This document defines the standard setup for wiring an agent stack into a delivery-capable pipeline.

## Who/When/Why

- **Who:** Claude (openhands)
- **When:** 2026-05-06
- **Why:** Complete the delivery layer for AI agent stacks

---

## 1. Core Components

Every agent stack setup MUST include:

| Component | Purpose |
|-----------|---------|
| **Agent runtime** | Code generation (Claude Code, OpenHands, Cursor, etc.) |
| **Repo host** | Source of truth (GitHub, GitLab) |
| **CI runner** | Automated build/test (GitHub Actions, etc.) |
| **Artifact store** | Hosts WR outputs (Releases, S3, registry) |
| **Delivery matrix** | See `DELIVERY_MATRIX.md` |

---

## 2. Trigger Labels

Agents respond to issue/PR labels to route work:

| Label | Meaning | Handler |
|-------|---------|---------|
| `agent:build` | Generate code | Agent runtime |
| `agent:ship` | Produce WR artifact | Delivery matrix |
| `agent:test` | Run verification | CI runner |
| `agent:docs` | Update documentation | Agent runtime |
| `agent:review` | Human review needed | Handoff |
| `agent:blocked` | Failure, needs human | Handoff protocol |

---

## 3. Toolchain Recommendations

### Minimum viable stack

- **Agent:** Claude Code or OpenHands
- **Repo:** GitHub
- **CI:** GitHub Actions
- **Artifacts:** GitHub Releases

### Recommended stack

- Add: container registry (GHCR), PDF renderer (Pandoc/Typst), MCP server host, video pipeline (ffmpeg + CI).

---

## 4. Workflow Patterns

### Pattern A: Issue → PR → WR

1. Human opens issue with `agent:build` label.
2. Agent creates branch, commits, opens PR.
3. CI runs tests.
4. On merge, `agent:ship` triggers delivery matrix.
5. Artifact published to appropriate channel.

### Pattern B: Scheduled delivery

1. Cron triggers agent with a manifest of pending WRs.
2. Agent batches and ships via delivery matrix.

### Pattern C: Human-in-the-loop

1. Agent produces draft with `agent:review` label.
2. Human approves, agent promotes to WR.

---

## 5. Failure Handoff Protocol

When an agent cannot complete a task:

1. Apply `agent:blocked` label.
2. Post a comment containing:
   - What was attempted
   - Exact error/blocker
   - Proposed next step
   - Files touched
3. Do NOT force-push or discard work.
4. Assign to a human reviewer.

---

## 6. Minimum Repo Layout

```
/standards/
  AGENT_STACK_SETUP.md
  DELIVERY_MATRIX.md
/.github/
  workflows/
    ship.yml
/agents/
  manifest.yml
```

---

## See Also

- `standards/DELIVERY_MATRIX.md`
