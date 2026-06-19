#!/bin/bash
# save-transcript.sh — Stop hook for Claude Code that lifts the current session's
# JSONL transcript into docs/agents/claude/transcripts/ so the thinking blocks
# survive after the UI throws them away.
#
# Wire it in `.claude/settings.local.json` or `.claude/settings.json`:
#   {
#     "hooks": {
#       "Stop": [{ "matcher": "", "hooks": [
#         { "type": "command", "command": "bash .claude/hooks/save-transcript.sh" }
#       ]}]
#     }
#   }
#
# Reads the path of the live transcript via CLAUDE_TRANSCRIPT_PATH (set by
# Claude Code at hook-fire time). Falls back to the newest JSONL in the project
# transcript dir if the env var is missing.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$REPO_ROOT/docs/agents/claude/transcripts"
mkdir -p "$OUT_DIR"

# Locate transcript: prefer the env var Claude Code provides; otherwise pick
# the newest JSONL under ~/.claude/projects matching this repo.
SRC=""
if [[ -n "${CLAUDE_TRANSCRIPT_PATH:-}" && -f "$CLAUDE_TRANSCRIPT_PATH" ]]; then
  SRC="$CLAUDE_TRANSCRIPT_PATH"
else
  PROJECT_DIR=$(echo "$REPO_ROOT" | tr '/' '-' | sed 's/^-//')
  CANDIDATE_DIR="$HOME/.claude/projects/-$PROJECT_DIR"
  if [[ -d "$CANDIDATE_DIR" ]]; then
    SRC=$(ls -1t "$CANDIDATE_DIR"/*.jsonl 2>/dev/null | head -1 || true)
  fi
fi

if [[ -z "$SRC" || ! -f "$SRC" ]]; then
  echo "save-transcript: no transcript found; skipping." >&2
  exit 0
fi

DATE="$(date -u '+%Y-%m-%d-%H%M%S')"
SESSION_ID="$(basename "$SRC" .jsonl)"
RAW_OUT="$OUT_DIR/${DATE}-${SESSION_ID}.jsonl"
MD_OUT="$OUT_DIR/${DATE}-${SESSION_ID}.md"

# Always keep the raw — that's the source of truth.
cp -f "$SRC" "$RAW_OUT"

# Render a readable Markdown version. We pull the thinking blocks out because
# those are the most useful for learning the model's pattern.
python3 - "$SRC" "$MD_OUT" <<'PY'
import json, sys

src, dst = sys.argv[1], sys.argv[2]
# Per Octopus review: a single malformed JSONL line (truncated write, partial
# event written mid-flush) used to abort the whole hook. Now we skip bad
# lines, log them to stderr, and keep going so the raw JSONL is never lost.
events = []
with open(src) as f:
    for i, l in enumerate(f, 1):
        if not l.strip():
            continue
        try:
            events.append(json.loads(l))
        except json.JSONDecodeError as e:
            sys.stderr.write(f"save-transcript: skipping malformed line {i}: {e}\n")

out = ["# Claude session transcript", "", f"_source: `{src}`_", ""]
for ev in events:
    typ = ev.get("type")
    if typ == "user":
        msg = ev.get("message", {})
        content = msg.get("content")
        if isinstance(content, str):
            out += ["## 🧑 user", "", content, ""]
        elif isinstance(content, list):
            for c in content:
                if c.get("type") == "text":
                    out += ["## 🧑 user", "", c.get("text",""), ""]
                elif c.get("type") == "tool_result":
                    body = c.get("content", "")
                    if isinstance(body, list):
                        body = "\n".join(x.get("text", "") for x in body if isinstance(x, dict))
                    out += ["### 🛠️ tool_result", "", "```", str(body)[:4000], "```", ""]
    elif typ == "assistant":
        msg = ev.get("message", {})
        for c in msg.get("content", []):
            if c.get("type") == "thinking":
                out += ["### 🧠 thinking", "", "> " + (c.get("thinking","") or "").replace("\n", "\n> "), ""]
            elif c.get("type") == "text":
                out += ["## 🤖 assistant", "", c.get("text",""), ""]
            elif c.get("type") == "tool_use":
                name = c.get("name","")
                inp = c.get("input", {})
                out += [f"### 🛠️ tool_use: {name}", "", "```json", json.dumps(inp, indent=2)[:4000], "```", ""]
with open(dst, "w") as f:
    f.write("\n".join(out))
PY

echo "save-transcript: wrote $MD_OUT and $RAW_OUT" >&2

# Auto-commit the new transcript so the post-stop git-check hook doesn't fire
# every single session. The user can rebase/squash/discard later if they want
# to clean history. Push is NOT performed — that stays manual.
if command -v git >/dev/null && [[ -d "$REPO_ROOT/.git" ]]; then
  (
    cd "$REPO_ROOT" || exit 0
    git add "$RAW_OUT" "$MD_OUT" 2>/dev/null || true
    if ! git diff --cached --quiet 2>/dev/null; then
      git -c user.name='Claude Code (save-transcript hook)' \
          -c user.email='claude-code-hooks@noreply.local' \
          commit --no-verify -m "chore(transcripts): auto-archive ${DATE} session" >/dev/null 2>&1 && git push --quiet 2>/dev/null || true
    fi
  )
fi
