# Agents Index

Per-agent profiles, fingerprints, and (eventually) captured sessions for every
AI tool that touches this repo or my projects. The point: stop being surprised
by what each agent leaves behind and what each one is actually good at.

## Profiles

| Agent | Lane | Profile | Captured sessions |
|-------|------|---------|-------------------|
| Claude (Claude Code, this CLI) | code + reasoning | [PROFILE.md](claude/PROFILE.md) | `claude/transcripts/` |
| Lovable | scaffold + UI | [PROFILE.md](lovable/PROFILE.md) | — |
| Replit | scaffold + dev env | [PROFILE.md](replit/PROFILE.md) | — |
| Manus | code + deploy SOP | [PROFILE.md](manus/PROFILE.md) | — |
| RadioChaser | backup orchestrator (phantom — not yet wired) | [PROFILE.md](radiochaser/PROFILE.md) | — |
| Goap | planning methodology / persona | [PROFILE.md](goap/PROFILE.md) | (folded into invoking persona) |
| Devin (Cognition) | session-based fix | TBD | `devin/` (via Sessions API) |
| Cursor | inline coder | TBD | TBD |
| GitHub Copilot | inline + review | TBD | TBD |
| Octopus Review | PR review (SaaS) | TBD | archived PR comments |
| cubic | PR review (SaaS) | TBD | archived PR comments |
| CodeRabbit | PR review (App) | TBD | archived PR comments |
| OpenRouter personas (oAudrey, Professor, MindMappr, Coder, RadioChaser) | various | TBD | `<persona>/` |

## What goes in each profile

```text
docs/agents/<name>/
  PROFILE.md             ← how this agent thinks; what prompt shape works;
                           what it over-engineers; what it hallucinates;
                           what fingerprints it leaves
  transcripts/           ← captured sessions (raw + readable)
  artifacts/             ← files this agent produced for your projects
                           (lifted out of its sandbox before the UI throws them away)
```

## Transcript files are committed on purpose

Captured Claude sessions land under `docs/agents/claude/transcripts/` and are
**checked into the repo by design** — the whole point is to keep the thinking
blocks visible in the same place as the standards and PR diffs they relate to.
If you ever want to stop committing them, add `docs/agents/*/transcripts/` to
`.gitignore`. Per Octopus review (intent was ambiguous before this note).

## Capture pipeline (incremental)

- **Claude Code**: `.claude/hooks/save-transcript.sh` lifts the JSONL transcript
  on session end → `docs/agents/claude/transcripts/<date>-<topic>.md`. Includes
  the thinking blocks (the part that disappears from the UI but is the most
  useful for learning the model's pattern).
- **Devin**: webhook on `session-completed` → fetch `GET /v1/sessions/{id}` →
  write to `docs/agents/devin/transcripts/`.
- **Octopus / cubic / CodeRabbit / Copilot**: their reasoning IS the PR comment;
  archive the full PR thread to `docs/agents/<name>/transcripts/pr-<n>.md` on
  PR close.
- **OpenRouter personas**: log every `routedChat()` call's prompt + response in
  `scripts/openrouter-routing.js`.

## Fingerprint enforcement

`scripts/agent-fingerprint-scan.js` blocks PRs that ship agent fingerprints
(watermarks, default starter pages, unsolicited READMEs, generic test
scaffolding). Rules are in `standards/AGENT_SCAFFOLDING_BAN.md`.
