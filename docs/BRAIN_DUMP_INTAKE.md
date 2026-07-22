# Brain Dump Intake — Convert Unstructured Ideas to Work Requests

The Brain Dump Intake system accepts raw, unstructured notes — voice
transcriptions, morning idea streams, or scattered thoughts — and converts
them into properly structured Work Request issues with priority-slot labels.

## What It Does

1. **Receives** a freeform text blob (any length, any structure)
2. **Parses** it via OpenRouter (Claude Sonnet) into discrete work items
3. **Creates** a `[WR]` GitHub issue for each item with labels:
   - `work-request`, `weekly-research`, `deep-research`, `triage:new`
   - `priority-p0..p3` (AI-assigned based on urgency/importance)
   - `priority-slot:X-Y` (ordered queue position — see below)
4. **Posts** a summary comment with links to all created issues

## Usage

### Option A: Issue Comment Command

Post a comment on any issue (or open a new one) containing `/brain-dump`:

```text
/brain-dump every morning I want a tool to dump notes and auto create WRs.
We also need a brain dump to priority slot mapper and notebook LM integration.
The OSINT pipeline needs a new scraping module for Telegram.
```

The bot acknowledges immediately, then posts a summary with links when done.

### Option B: Manual Workflow Dispatch

```bash
gh workflow run brain-dump-intake.yml \
  --field brain_dump="Your unstructured text here..." \
  --repo midnghtsapphire/revvel-standards
```

Via GitHub UI:
1. Go to **Actions → Brain Dump Intake**
2. Click **"Run workflow"**
3. Paste your notes into the `brain_dump` field
4. Click **"Run workflow"**

### Option C: Dry Run (verify before creating)

```bash
gh workflow run brain-dump-intake.yml \
  --field brain_dump="Test notes here" \
  --field dry_run=true \
  --repo midnghtsapphire/revvel-standards
```

In dry-run mode, the workflow logs what it would create but does not open any issues.

## Priority Slot Labels

Priority slots provide an **ordered queue** within a sprint window. They complement
the existing `priority-p0..p3` labels by adding position information.

```text
priority-slot:1-1  ← Sprint 1, Position 1 (highest priority right now)
priority-slot:1-2  ← Sprint 1, Position 2
priority-slot:1-3  ← Sprint 1, Position 3

priority-slot:2-1  ← Sprint 2 (next sprint), Position 1
priority-slot:2-2  ← Sprint 2, Position 2
priority-slot:2-3  ← Sprint 2, Position 3

priority-slot:3-1  ← Sprint 3 (sprint after next), Position 1
```

The Brain Dump parser assigns slots based on inferred urgency. You can
always override the slot label after the issues are created.

### Slot Lifecycle

- When `priority-slot:1-1` closes, promote `priority-slot:1-2` to `1-1`
- Add new incoming items to the next available slot
- The slot labels are purely advisory — automation uses `priority-p0..p3` for routing

## Fallback Parsing

If `OPENROUTER_API_KEY` is not configured or the API call fails, the intake
falls back to a **heuristic line-split** parser:

- Each non-empty line (> 10 chars) becomes a separate WR
- All items get `priority-p2` and sequentially assigned slots
- No semantic analysis — titles are taken verbatim

For best results, ensure `OPENROUTER_API_KEY` is set as a repository secret.

## Example Input → Output

**Input brain dump:**
```text
every morning I want a tool to dump notes and auto create WRs. Neuros has
the feature, maybe get it from there. Need notebook LM API integration.
The OSINT pipeline needs a new scraping module.
We really need to use priority labels more robustly.
```

**Output (4 WR issues):**
| Issue | Title | Priority | Slot |
|---|---|---|---|
| #14700 | `[WR] Build daily brain dump to WR pipeline` | p1 | 1-1 |
| #14701 | `[WR] Integrate Notebook LM API for idea capture` | p2 | 1-2 |
| #14702 | `[WR] Add new scraping module to OSINT pipeline` | p2 | 2-1 |
| #14703 | `[WR] Implement robust priority-slot label system` | p1 | 1-3 |

## Related Files

- `.github/workflows/brain-dump-intake.yml` — workflow implementation
- `.github/labels.yml` — `priority-slot:*` label definitions
- `docs/VEINS_MONITOR.md` — monitoring system that catches stuck issues
- `docs/WORKFLOW_STATE_MACHINE.md` — full label lifecycle reference
