# Agent Journals

Persistent memory for Revvel personas. Each file is a running log of decisions,
learnings, and context that the persona carries into every future session.

Journals are auto-updated by the `persona-comment-trigger` workflow whenever a
persona is summoned from an issue or PR comment.

| File | Persona | Role |
|------|---------|------|
| `oaudrey.md` | oAudrey | Primary Orchestrator |
| `professor.md` | The Professor | Research & Teaching |
| `mindmappr.md` | MindMappr | Ideation & Mind-Mapping |
| `radiochaser.md` | RadioChaser | Signals Intelligence & Trend Hunting |

## Format

Each entry is appended in reverse-chronological order:

```
### YYYY-MM-DD — Issue/PR #N
**Task:** …
**Decision/Learning:** …
**Next actions:** …
```
