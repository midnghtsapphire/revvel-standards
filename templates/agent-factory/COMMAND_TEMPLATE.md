---
name: "/<command-name>"
description: "<what it does>"
allowed_agents: ["<agent-names>"]
tools: ["shell", "node", "docker"]
inputs: ["<inputs>"]
outputs: ["<outputs>"]
steps:
  - "<step 1>"
  - "<step 2>"
failure_behavior:
  on_error: "invoke /diagnose and swap to recovery agent"
---

# Usage
- When to run, expected duration, and prerequisites.

## Success Criteria
- What must be true for the command to be considered done.

## Artifacts
- Paths to logs/reports to persist.
