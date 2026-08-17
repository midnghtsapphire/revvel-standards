# Revvel Rosette Automation — Test Harness

**Version:** 1.0.0  
**Date:** May 2, 2026  
**Status:** Active Development  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)  
**Repository:** `midnghtsapphire/revvel-standards`

---

## 1. Overview

**Revvel Rosette Automation** is a comprehensive test harness and automation framework for the `revvel-standards` repository. It provides end-to-end automation for:

- **Project orchestration** — Multi-agent coordination across 300+ projects
- **Security & vault management** — Automated credential rotation via HashiCorp Vault
- **Gatekeeper system** — Automated secret provisioning and access control
- **Trello integration** — Automated project management and card updates
- **Scheduled automation** — Daily routines, cron jobs, and queue management
- **Self-healing** — Autonomous error detection and remediation
- **Metrics & monitoring** — Dashboard and performance tracking

This harness follows the **S.H.I.F.T. framework** (Self-Healing Intent-Focused Tasks) and integrates with the existing `gatekeeper-cli` and automation infrastructure.

---

## 2. Architecture

### 2.1. Components

```text
revvel-rosette-automation/
├── config/               # Configuration files (YAML, JSON)
│   ├── 300Projects.yaml       # Master project registry
│   ├── 70-vaultwardent.yaml   # Vault warden configuration
│   ├── 61-factory.yaml        # Agent factory settings
│   ├── 59-config.yaml         # Core configuration
│   ├── 20-supportingconfig.yaml  # Supporting services config
│   ├── campaign.json          # Marketing campaign config
│   ├── 9-Nostradamus.json     # Prediction/forecasting config
│   └── 7-body.json            # Request body templates
├── src/                  # Python automation modules
│   # Implemented:
│   ├── orchestrator.py        # Main orchestrator (CEO agent)
│   ├── scheduler.py           # Job scheduling
│   ├── gatekeeper.py          # Gatekeeper automation
│   └── selfheal.py            # Self-healing logic
│   # Planned (not yet implemented — see Section 6 for roadmap):
│   #   security.py, vault.py, metrics.py, marketing.py,
│   #   usernames.py, research.py, blueprint.py, trello.py,
│   #   queue_manager.py
├── scripts/              # Shell scripts
│   ├── bootstrap.sh           # Initial setup
│   ├── monitoring.sh          # System monitoring
│   ├── gatekeeper.sh          # Gatekeeper runner (delegates to ../scripts/gatekeeper-sync.sh)
│   ├── cronjob.sh             # Cron job setup
│   └── manual-test.sh         # Manual testing
│   # Planned: security-credentials.sh, export-keys.sh,
│   #          install-requirements.sh, local-launch-test.sh
├── docs/                 # Documentation
│   ├── authorization.txt       # Auth documentation
│   ├── daily-routine.txt       # Daily automation
│   ├── directory-structure.txt # Structure documentation
│   ├── five-step-trello.txt    # Trello workflow
│   ├── gatekeeper-system.txt   # Gatekeeper overview
│   └── queue-format.txt        # Queue file format
│   # Planned: trello-integration.txt, project-labels.txt
├── tests/                # Test suite
│   └── harness.test.js        # Main test harness
├── package.json          # Node.js dependencies
├── pyproject.toml        # Python dependencies
└── README.md             # This file
```

### 2.2. Integration Points

- **gatekeeper-cli** — Reuses existing CLI for secret management
- **GitHub Actions** — Workflows trigger automation
- **Doppler** — Secret storage backend
- **HashiCorp Vault** — Enterprise secret management
- **Trello API** — Project management integration
- **OpenRouter** — AI agent coordination

---

## 3. Quick Start

### 3.1. Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- Bash (macOS/Linux) or WSL (Windows)
- GitHub CLI (`gh`)
- Access to:
  - Doppler project `revvel-standards` (config `prd`)
  - Trello API credentials
  - OpenRouter API key
  - HashiCorp Vault (optional)

### 3.2. Installation

```bash
cd revvel-rosette-automation

# Install Node dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt
# OR
uv pip install -e .

# Run bootstrap script
./scripts/bootstrap.sh

# Export required credentials (set the variables in your shell or .env;
# scripts/export-keys.sh is planned but not yet implemented)

# Verify installation
./scripts/manual-test.sh
```

### 3.3. Configuration

1. Copy example configs:
   ```bash
   cp config/59-config.example.yaml config/59-config.yaml
   ```

2. Set required environment variables:
   ```bash
   export DOPPLER_TOKEN="your-doppler-token"
   export TRELLO_API_KEY="your-trello-key"
   export TRELLO_TOKEN="your-trello-token"
   export OPENROUTER_API_KEY="your-openrouter-key"
   ```

3. Initialize the vault *(planned — `src/vault.py` not yet implemented)*:
   ```bash
   # python src/vault.py --init
   ```

4. Load project registry:
   ```bash
   python src/orchestrator.py --load-projects config/300Projects.yaml
   ```

---

## 4. Usage

### 4.1. Daily Automation

The harness runs automatically at 3 AM daily via cron:

```bash
# View daily routine
cat docs/daily-routine.txt

# Manually trigger daily run
./scripts/cronjob.sh
```

### 4.2. Gatekeeper Automation

Automatically provision secrets when PRs/issues are created:

```bash
# Run gatekeeper sync
./scripts/gatekeeper.sh --secrets "OPENROUTER_API_KEY,DOPPLER_TOKEN" \
                        --repo midnghtsapphire/revvel-standards

# Monitor gatekeeper
./scripts/monitoring.sh
```

### 4.3. Trello Integration *(planned — module not yet implemented)*

Five-step Trello workflow automation. The commands below describe the intended
interface for `src/trello.py`; they are not runnable yet.

```bash
# Planned commands (src/trello.py is not yet implemented):
#   python src/trello.py --sync                    # Sync GitHub activity
#   python src/trello.py --create-from-issues      # Create cards for new issues
#   python src/trello.py --workflow                # Five-step workflow
```

### 4.4. Security & Vault *(planned — modules not yet implemented)*

Automated credential rotation and vault management. The commands below
describe the intended interface; they are not runnable yet.

```bash
# Planned commands (none of these are runnable yet):
#   python src/security.py --rotate-all
#   python src/security.py --policy-update
#   ./scripts/security-credentials.sh --fetch
```

### 4.5. Self-Healing

Automatic error detection and remediation:

```bash
# Monitor and self-heal (implemented)
python src/selfheal.py --watch

# Planned: src/metrics.py is not yet implemented
#   python src/metrics.py --dashboard selfheal
```

---

## 5. Testing

### 5.1. Run Full Test Suite

```bash
npm test
```

### 5.2. Manual Testing

```bash
# Quick smoke test of the harness
./scripts/manual-test.sh

# Dry run (no external API calls)
DRY_RUN=1 python src/orchestrator.py --run-all

# Planned (not yet implemented):
#   ./scripts/local-launch-test.sh
#   python -m pytest tests/test_orchestrator.py
```

### 5.3. CI/CD Integration

The harness integrates with GitHub Actions:

```yaml
- name: Run Rosette Automation Tests
  run: |
    cd revvel-rosette-automation
    npm test
```

---

## 6. Architecture Details

### 6.1. Orchestrator (CEO Agent)

The orchestrator is the main coordination agent:

- Reads project registry (`300Projects.yaml`)
- Dispatches tasks to specialized agents
- Monitors progress and handles failures
- Generates daily reports

### 6.2. Scheduler

Cron-based task scheduling:

- Daily 3 AM automation run
- Hourly health checks
- Weekly security audits
- Monthly metrics reports

### 6.3. Gatekeeper System

Full-stack secret management:

- Automatic secret provisioning for new repos
- Just-in-time credential fetching
- Doppler → GitHub Secrets sync
- Vault → Doppler rotation

### 6.4. Queue Management

Task queue for asynchronous operations:

- File-based queue (`queue.txt`)
- Priority levels (P0, P1, P2)
- Retry logic with exponential backoff
- Dead letter queue for failed tasks

---

## 7. Security

### 7.1. Credential Management

- **Never commit secrets** — all credentials via Doppler/Vault
- **Auto-rotation** — credentials rotate every 90 days
- **Least privilege** — per-agent access controls
- **Audit logging** — all secret access logged

### 7.2. Compliance

- Follows `REPOSITORY_PRIVACY_MIGRATION_STANDARD.md`
- Implements `API_GATEKEEPER_STANDARD.md`
- Adheres to `AUTOMATED_AUDIT_AGENT_STANDARD.md`

---

## 8. Monitoring & Metrics *(planned — `src/metrics.py` not yet implemented)*

### 8.1. Dashboard

```bash
# Planned (src/metrics.py is not yet implemented):
#   python src/metrics.py --dashboard all
```

Metrics tracked:

- Task completion rate
- Average task duration
- Self-healing success rate
- API call volume
- Error rates by component

### 8.2. Alerts

Automated alerts via:

- GitHub Issues (auto-created on failures)
- Email (via Resend)
- Slack (optional webhook)

---

## 9. Contributing

See main repository [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## 10. Related Documentation

- [`docs/AGENTS.md`](../docs/AGENTS.md) — AI agent instructions
- [`docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md`](../docs/Master_Inventory/TEST_ENVIRONMENTS_STANDARD.md) — S.H.I.F.T. framework
- [`docs/Master_Inventory/API_GATEKEEPER_STANDARD.md`](../docs/Master_Inventory/API_GATEKEEPER_STANDARD.md) — Gatekeeper specification
- [`gatekeeper-cli/README.md`](../gatekeeper-cli/README.md) — CLI tool
- [`docs/revvel-standards/TEST_HARNESS_RESEARCH.md`](../docs/revvel-standards/TEST_HARNESS_RESEARCH.md) — Test harness research

---

## 11. License

MIT — See [`LICENSE`](../LICENSE)

---

## 12. Support

- **Issues:** [GitHub Issues](https://github.com/midnghtsapphire/revvel-standards/issues)
- **Documentation:** [docs/](../docs/)
- **Maintainer:** Audrey Evans (@midnghtsapphire)
