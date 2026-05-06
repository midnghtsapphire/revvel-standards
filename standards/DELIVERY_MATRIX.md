# DELIVERY_MATRIX

> Standard for mapping Work Request (WR) outputs to delivery targets.

## Purpose

Describe the matrix of artifact types × delivery channels an AI agent stack uses to ship WR outputs. This complements `AGENT_STACK_SETUP.md`, which defines *how* the agent is wired up.

## Artifact Types

| Type         | Examples                                    |
|--------------|---------------------------------------------|
| `code`       | source files, scripts                       |
| `docs`       | Markdown, READMEs, ADRs                     |
| `config`     | YAML, JSON, TOML, env templates             |
| `schema`     | OpenAPI, JSON Schema, SQL DDL               |
| `asset`      | images, diagrams, fixtures                  |
| `meta`       | issue templates, workflow files, standards  |

## Delivery Channels

| Channel          | Use                                            |
|------------------|------------------------------------------------|
| `commit`         | Direct commit to working branch                |
| `pr`             | Pull request against default branch           |
| `issue-comment`  | Response or proposal attached to issue        |
| `artifact`       | CI build output / release asset               |
| `external`       | Webhook, API push, or external system         |

## Matrix

| Artifact \ Channel | commit | pr  | issue-comment | artifact | external |
|--------------------|:------:|:---:|:-------------:|:--------:|:--------:|
| code               |   ✓    |  ✓  |       ·       |    ✓     |    ·     |
| docs               |   ✓    |  ✓  |       ✓       |    ·     |    ·     |
| config             |   ✓    |  ✓  |       ·       |    ·     |    ✓     |
| schema             |   ✓    |  ✓  |       ·       |    ✓     |    ✓     |
| asset              |   ✓    |  ✓  |       ·       |    ✓     |    ·     |
| meta               |   ✓    |  ✓  |       ·       |    ·     |    ·     |

`✓` = allowed, `·` = not a default path (requires explicit policy override).

## Delivery Payload

Every WR execution MUST emit a structured payload:

```json
{
  "wr_id": "<issue-or-ticket-id>",
  "agent": "<agent-name>",
  "branch": "<working-branch>",
  "channel": "pr|commit|issue-comment|artifact|external",
  "artifacts": [
    { "path": "relative/path", "type": "code|docs|config|schema|asset|meta" }
  ],
  "commit": "<sha-or-null>",
  "status": "delivered|blocked|skipped",
  "notes": "optional free text"
}
```

## Rules

1. An artifact MUST match an allowed cell in the matrix for its chosen channel.
2. Multi-artifact WRs SHOULD be delivered through a single channel where possible (prefer `pr`).
3. `external` channel MUST reference an auditable endpoint and include a delivery receipt.
4. `status: blocked` requires a `notes` field explaining the block.
5. Agents MUST NOT invent artifact types outside this matrix; extend the standard first.

## Extending the Matrix

To add a new artifact type or channel:

1. Open a WR against this file.
2. Include: rationale, example artifact, target channel, guardrails.
3. Update both the table and the payload schema in the same change.

## Related

- `standards/AGENT_STACK_SETUP.md` — agent runtime setup.
