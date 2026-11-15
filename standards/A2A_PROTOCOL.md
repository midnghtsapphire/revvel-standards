# A2A Protocol Standard — Cross-Agent Communication

Closes WR #18340.

## Model
Every agent publishes an **Agent Card** (`/.well-known/agent.json`): name, skills,
endpoint, auth. Tasks move through states: `submitted → working → input-required →
completed | failed | canceled`.

## Message Envelope (JSON)
```json
{"task_id":"uuid","from":"scout","to":"scribe","skill":"write.chapter",
 "payload":{...},"state":"submitted","trace":"wr-18340"}
```

## Rules
1. Agents NEVER call each other's internals — only the bus (`scripts/a2a_bus.py`).
2. Every task is idempotent: same `task_id` re-delivered = no double work.
3. `trace` must carry the WR number for audit.
4. Bus persists to `artifacts/a2a/bus.jsonl` (append-only) — replayable.
5. Human escalation = task state `input-required` with `question` field.

Reference implementation: `scripts/a2a_bus.py` (send / poll / ack / replay).
