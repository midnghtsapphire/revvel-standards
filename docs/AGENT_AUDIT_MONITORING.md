# Agent Audit & Monitoring System

## Overview

This system provides comprehensive logging, monitoring, and enforcement to ensure agents ship **complete, working code** instead of scaffolding or incomplete implementations.

## Problem Addressed

Previously, agents were producing:
- ❌ Scaffolding and blueprints instead of working code
- ❌ TODOs and placeholders
- ❌ "Phase 1/2/3" incomplete implementations
- ❌ No visibility into what agents were doing
- ❌ No monitoring when agents failed or stalled

## Solution Components

### 1. Agent Audit Logger (`.github/workflows/agent-audit-logger.yml`)

**What it does:**
- Logs every agent action to `logs/agent-audit/audit.jsonl`
- Creates tamper-evident chain with SHA-256 hashing
- Runs health checks every hour
- Detects stalled PRs, failed workflows, and inactive automation
- Automatically creates issues when critical problems detected

**Events logged:**
- Issue opened/edited/closed/labeled
- PR opened/edited/labeled/reviewed
- Workflow runs
- Agent assignments

**Features:**
- Chain integrity verification (prev_hash linking)
- Actor type tracking (bot vs human)
- Resource association (issue/PR numbers)
- Automated health monitoring

### 2. Anti-Scaffolding Enforcer (`.github/workflows/anti-scaffolding-enforcer.yml`)

**What it does:**
- Scans every PR for scaffolding language
- Blocks merge if violations found
- Posts detailed comments explaining violations
- Adds labels: `scaffolding-detected`, `needs-completion`

**Violations detected:**
- `TODO` without GitHub issue reference
- `FIXME` comments
- "scaffold" or "scaffolding" in code
- "placeholder" code
- Empty function stubs: `function foo() {}`
- "Phase 1/2/3" language
- "coming soon" or "not yet implemented"
- "MVP first" or "will implement later"

**What to do instead:**
1. Implement the complete feature before committing
2. Write tests for all functionality
3. Reference future work in GitHub issues: `// See issue #123`
4. Ship working, tested code

### 3. Updated AGENTS.md

Added strong anti-scaffolding rules to the Prime Directive:
- Clear list of banned patterns
- Enforcement via automated checks
- Guidance on what to do instead
- Reference to audit logging system

### 4. Agent Activity Monitor Script (`scripts/agent-activity-monitor.js`)

Command-line tool for analyzing agent activity.

**Usage:**

```bash
# Generate report for last 24 hours
node scripts/agent-activity-monitor.js report

# Report for last 48 hours
node scripts/agent-activity-monitor.js report 48

# Export data as JSON
node scripts/agent-activity-monitor.js export 24 report.json

# Verify audit chain integrity
node scripts/agent-activity-monitor.js verify

# Show help
node scripts/agent-activity-monitor.js help
```

**Report includes:**
- Total events by actor (bot vs human)
- Events by type
- Most active resources (issues/PRs)
- Issue detection (stalled work, low activity, etc.)
- Token usage statistics (if available)

### 5. New Labels

Added to `sync-labels.yml`:
- `scaffolding-detected` - PR contains scaffolding language
- `needs-completion` - Work is incomplete
- `agent-health-alert` - Health check detected issues

## How to Use

### For Agents

1. **Always ship complete code**
   - No TODOs without issue references
   - No empty stubs or placeholders
   - Full implementation with tests

2. **Your actions are logged**
   - All events go to `logs/agent-audit/audit.jsonl`
   - Chain integrity ensures accountability

3. **PRs are automatically checked**
   - Anti-scaffolding enforcer runs on every PR
   - Fix violations before merge is allowed

### For Humans

1. **Monitor agent health:**
   ```bash
   # Quick report
   node scripts/agent-activity-monitor.js report
   
   # Check what happened today
   node scripts/agent-activity-monitor.js report 24
   ```

2. **Review audit logs:**
   ```bash
   # View raw log
   cat logs/agent-audit/audit.jsonl | jq
   
   # See recent activity
   tail -20 logs/agent-audit/audit.jsonl | jq -r '"\(.timestamp) | \(.actor) | \(.event_type)"'
   ```

3. **Verify integrity:**
   ```bash
   node scripts/agent-activity-monitor.js verify
   ```

4. **Check health automatically:**
   - Runs every hour via scheduled workflow
   - Creates issues if problems detected
   - Look for `agent-health-alert` label

### Workflow Dispatch Actions

Run manual checks:

```bash
# Via GitHub UI: Actions → Agent Audit Logger → Run workflow

# Or via gh CLI:
gh workflow run agent-audit-logger.yml -f action=health_check
gh workflow run agent-audit-logger.yml -f action=token_report
gh workflow run agent-audit-logger.yml -f action=log_analysis
```

## Audit Log Format

Each entry in `logs/agent-audit/audit.jsonl`:

```json
{
  "timestamp": "2026-05-03T03:44:08.516Z",
  "event_type": "issues",
  "action": "labeled",
  "actor": "midnghtsapphire",
  "agent_type": "human",
  "resource_type": "issue",
  "resource_number": 542,
  "resource_title": "[WR] NO MORE SCAFOLDING...",
  "workflow_name": null,
  "prev_hash": "a3f8e2c1b7d4f9e2...",
  "labels": ["openrouter", "wr"],
  "assignees": [],
  "repository": "revvel-standards",
  "entry_hash": "b7d4f9e2a3f8c1d2..."
}
```

## Chain Integrity

Uses blockchain-style chaining:
1. Each entry contains hash of previous entry (`prev_hash`)
2. Each entry has its own hash (`entry_hash`)
3. First entry has `prev_hash: "0000000000000000"`
4. Any tampering breaks the chain
5. Verify with: `node scripts/agent-activity-monitor.js verify`

## Integration with Existing Workflows

This system integrates with:
- **recurse-rules.md**: Enforces "No TODO or FIXME" rule
- **Ralph Loop**: Logs when auto-fixes occur
- **OpenRouter workflows**: Tracks agent assignments
- **PR workflows**: Validates completeness before merge
- **Workflow monitor**: Adds agent-specific health metrics

## Addressing Original Concerns

### "I NEED A LOG OF WHO IS DOING WHAT
✅ **Solved:** Every action logged to `logs/agent-audit/audit.jsonl` with chain integrity

### "EVERY SINGLE PROJECT IS NOT GETTING DONE. I AM ONLY GETTING SCAFFOLDING
✅ **Solved:** Anti-scaffolding enforcer blocks incomplete PRs automatically

### "NEED MONITORING WHEN AN AGENT ISN'T WORKING, OUT OF TOKENS
✅ **Solved:** 
- Hourly health checks detect issues
- Token usage logging available
- Auto-creates issues when problems found

### "NEED TRIGGERS FOR AN ACTION SO WE CAN CONTINUE ON WITH THE PROCESS
✅ **Solved:**
- Health check workflow runs every hour
- Creates `agent-health-alert` issues automatically
- Provides actionable recommendations

### "CANNOT BE CALLING THAT MANY IPS IN TEST
⚠️  **Partial:** Logged for review - use `agent-activity-monitor.js` to analyze API call patterns

## Next Steps

To complete the solution:

1. ✅ Audit logging system (DONE)
2. ✅ Anti-scaffolding enforcer (DONE)
3. ✅ Health monitoring (DONE)
4. ✅ Activity analysis tool (DONE)
5. 🔄 Optimize unnecessary API calls in tests (needs review of specific workflows)
6. 🔄 Add token limit alerts (OpenRouter API key info endpoint may vary)
7. 🔄 Create dashboard UI for audit logs (future enhancement)

## Maintenance

- **Audit logs:** Stored in `logs/agent-audit/` (committed to repo)
- **Log rotation:** Consider rotating logs after 10,000 entries
- **Chain resets:** If chain verification fails, investigate tampering
- **Performance:** JSONL format is append-only and fast

## References

- Prime Directive: `docs/AGENTS.md` § "NO MORE SCAFFOLDING"
- Recurse rules: `recurse-rules.md`
- Workflow health: `.github/workflows/workflow-health-dashboard.yml`
- Self-healing: `docs/AGENT_AUTONOMY_PROTOCOLS.md`
