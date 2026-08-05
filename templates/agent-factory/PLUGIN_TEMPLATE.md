---
name: "<plugin-name>"
version: "0.1.0"
agents: ["<agent files>"]
commands: ["</command names>"]
settings_profile: "<profile>"
hooks: ["<hook set>"]
requirements:
  tools: ["shell", "node", "docker"]
  notes: "<special requirements>"
---

# Purpose
- What this plugin bundles and when to use it.

## Installation
- Files to copy/symlink (agents, commands, settings, hooks).
- Any environment expectations (env vars, secrets storage, CI requirements).

## Triggers Enabled
- Keywords or file patterns this plugin registers.

## Guardrails
- Security/compliance controls baked into the bundle.

## Outputs
- Artifacts produced (logs, reports, recaps) and where they live.
