# Self-Healing Secret Rotation System

## Overview

The self-healing secret rotation system automatically monitors secret age, rotates secrets before expiry, and escalates failures to human attention.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Secret Rotation Workflow                      │
│                                                                   │
│  1. Scheduled Check (Weekly)                                     │
│     ├─ Load TTL metadata from wr/memory/secret-rotations.md     │
│     ├─ Check each secret's last rotation date                   │
│     └─ If > 60 days old: Queue for rotation                     │
│                                                                   │
│  2. Rotation Attempt                                             │
│     ├─ Generate new secret value                                │
│     ├─ Update in Doppler via MCP/API                            │
│     ├─ Sync to GitHub Secrets                                   │
│     └─ Log rotation to metadata file                            │
│                                                                   │
│  3. Failure Handling                                             │
│     ├─ Retry 1: Wait 5 minutes                                  │
│     ├─ Retry 2: Wait 15 minutes                                 │
│     ├─ Retry 3: Wait 45 minutes                                 │
│     └─ After 3 failures: Escalate to GOAP                       │
│                                                                   │
│  4. Escalation                                                   │
│     ├─ Create GitHub issue with label: goap-escalation          │
│     ├─ Include failure logs and context                         │
│     ├─ Assign to @midnghtsapphire                              │
│     └─ Send notification                                         │
└─────────────────────────────────────────────────────────────────┘
```

## Metadata Format

Secrets are tracked in `wr/memory/secret-rotations.md`:

```markdown
# Secret Rotation Log

Last Updated: 2026-04-30T16:52:45Z

## OPENROUTER_API_KEY
- **Last Rotated:** 2026-04-15T10:30:00Z
- **Next Rotation:** 2026-06-14T10:30:00Z (60 days)
- **Rotation Count:** 3
- **Last Status:** success
- **History:**
  - 2026-04-15: Manual rotation (reason: security audit)
  - 2026-02-10: Automatic rotation
  - 2026-01-05: Initial creation

## STRIPE_SECRET_KEY
- **Last Rotated:** 2026-04-28T14:20:00Z
- **Next Rotation:** 2026-06-27T14:20:00Z (60 days)
- **Rotation Count:** 1
- **Last Status:** success
- **History:**
  - 2026-04-28: Initial creation
```

## Implementation

### 1. GitHub Workflow: Secret Rotation Schedule

Location: `.github/workflows/secret-rotation-schedule.yml`

```yaml
name: Secret Rotation Schedule

on:
  schedule:
    # Every Monday at 02:00 UTC
    - cron: "0 2 * * 1"
  workflow_dispatch:
    inputs:
      secret_name:
        description: "Specific secret to rotate (optional)"
        type: string
        required: false

jobs:
  check-rotation-needed:
    name: Check which secrets need rotation
    runs-on: ubuntu-latest
    outputs:
      secrets_to_rotate: ${{ steps.check.outputs.secrets }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Check rotation metadata
        id: check
        run: |
          python scripts/check-rotation-needed.py \
            --metadata-file wr/memory/secret-rotations.md \
            --days-threshold 60 \
            --output secrets.json
          
          if [ -s secrets.json ]; then
            echo "secrets=$(cat secrets.json)" >> "$GITHUB_OUTPUT"
          else
            echo "secrets=[]" >> "$GITHUB_OUTPUT"
          fi

  rotate-secrets:
    name: Rotate ${{ matrix.secret }}
    needs: check-rotation-needed
    if: needs.check-rotation-needed.outputs.secrets_to_rotate != '[]'
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        secret: ${{ fromJson(needs.check-rotation-needed.outputs.secrets_to_rotate) }}
    steps:
      - uses: actions/checkout@v4
      
      - name: Install gatekeeper-cli
        run: |
          cd gatekeeper-cli
          pip install -e .
      
      - name: Rotate secret with retry
        id: rotate
        env:
          DOPPLER_TOKEN: ${{ secrets.DOPPLER_TOKEN }}
          GITHUB_TOKEN: ${{ secrets.ADMIN_GITHUB_TOKEN }}
        run: |
          MAX_RETRIES=3
          RETRY_COUNT=0
          DELAY=300  # Start with 5 minutes
          
          while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
            if python -m gatekeeper_cli.main secrets rotate "${{ matrix.secret }}"; then
              echo "status=success" >> "$GITHUB_OUTPUT"
              echo "✓ Rotation successful on attempt $((RETRY_COUNT + 1))"
              exit 0
            else
              RETRY_COUNT=$((RETRY_COUNT + 1))
              if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                echo "✗ Attempt $RETRY_COUNT failed. Retrying in $DELAY seconds..."
                sleep $DELAY
                DELAY=$((DELAY * 3))  # Exponential backoff
              fi
            fi
          done
          
          echo "status=failed" >> "$GITHUB_OUTPUT"
          echo "::error::Failed to rotate ${{ matrix.secret }} after $MAX_RETRIES attempts"
          exit 1
      
      - name: Update rotation metadata
        if: steps.rotate.outputs.status == 'success'
        run: |
          python scripts/update-rotation-metadata.py \
            --secret "${{ matrix.secret }}" \
            --status success \
            --metadata-file wr/memory/secret-rotations.md
          
          git config user.name "gatekeeper-bot"
          git config user.email "gatekeeper-bot@revvel.dev"
          git add wr/memory/secret-rotations.md
          git commit -m "chore: update rotation metadata for ${{ matrix.secret }}"
          git push
      
      - name: Escalate to GOAP
        if: steps.rotate.outputs.status == 'failed'
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          ISSUE_BODY=$(cat <<EOF
          ## 🚨 Secret Rotation Failure

          **Secret:** \`${{ matrix.secret }}\`
          **Project:** revvel-standards
          **Workflow:** [Secret Rotation Schedule](https://github.com/\${{ github.repository }}/actions/runs/\${{ github.run_id }})
          
          ### Failure Details
          
          The automated secret rotation failed after 3 attempts with exponential backoff:
          - Attempt 1: Failed (5min delay)
          - Attempt 2: Failed (15min delay)
          - Attempt 3: Failed (45min delay)
          
          ### Required Action
          
          1. Investigate why rotation failed (check Doppler API status, permissions)
          2. Manually rotate the secret if needed
          3. Update the rotation metadata in \`wr/memory/secret-rotations.md\`
          4. Close this issue once resolved
          
          ### Next Steps
          
          The system will retry this rotation on the next scheduled run (next Monday).
          If this is a critical secret, rotate it manually ASAP.
          
          ---
          _Auto-escalated by Secret Rotation Schedule at $(date -u +%Y-%m-%dT%H:%M:%SZ)_
          EOF
          )
          
          gh issue create \
            --repo "${{ github.repository }}" \
            --title "🚨 Secret Rotation Failed: ${{ matrix.secret }}" \
            --body "$ISSUE_BODY" \
            --label "goap-escalation,security,urgent" \
            --assignee "midnghtsapphire"
```

### 2. Python Script: Check Rotation Needed

Location: `scripts/check-rotation-needed.py`

```python
#!/usr/bin/env python3
"""Check which secrets need rotation based on TTL metadata."""

import argparse
import json
import re
from datetime import datetime, timedelta
from pathlib import Path


def parse_metadata(file_path: Path) -> dict:
    """Parse rotation metadata file."""
    secrets = {}
    
    if not file_path.exists():
        return secrets
    
    content = file_path.read_text()
    current_secret = None
    
    for line in content.split("\n"):
        # Match secret header
        if line.startswith("## ") and not line.startswith("## "):
            current_secret = line[3:].strip()
            secrets[current_secret] = {}
        
        # Match last rotated date
        elif current_secret and "Last Rotated:" in line:
            match = re.search(r"(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)", line)
            if match:
                secrets[current_secret]["last_rotated"] = match.group(1)
    
    return secrets


def check_rotation_needed(secrets: dict, days_threshold: int) -> list:
    """Return list of secrets that need rotation."""
    now = datetime.utcnow()
    needs_rotation = []
    
    for secret_name, metadata in secrets.items():
        if "last_rotated" not in metadata:
            # Never rotated - needs rotation
            needs_rotation.append(secret_name)
            continue
        
        last_rotated = datetime.fromisoformat(
            metadata["last_rotated"].replace("Z", "+00:00")
        )
        days_since_rotation = (now - last_rotated).days
        
        if days_since_rotation >= days_threshold:
            needs_rotation.append(secret_name)
    
    return needs_rotation


def main():
    parser = argparse.ArgumentParser(description="Check which secrets need rotation")
    parser.add_argument("--metadata-file", required=True, help="Path to metadata file")
    parser.add_argument("--days-threshold", type=int, default=60, help="Days threshold")
    parser.add_argument("--output", required=True, help="Output JSON file")
    
    args = parser.parse_args()
    
    metadata_path = Path(args.metadata_file)
    secrets = parse_metadata(metadata_path)
    needs_rotation = check_rotation_needed(secrets, args.days_threshold)
    
    output_path = Path(args.output)
    output_path.write_text(json.dumps(needs_rotation))
    
    print(f"Found {len(needs_rotation)} secrets needing rotation:")
    for secret in needs_rotation:
        print(f"  - {secret}")


if __name__ == "__main__":
    main()
```

### 3. Python Script: Update Rotation Metadata

Location: `scripts/update-rotation-metadata.py`

```python
#!/usr/bin/env python3
"""Update secret rotation metadata."""

import argparse
from datetime import datetime, timedelta
from pathlib import Path


def update_metadata(file_path: Path, secret_name: str, status: str):
    """Update rotation metadata for a secret."""
    now = datetime.utcnow()
    next_rotation = now + timedelta(days=60)
    
    if not file_path.exists():
        file_path.parent.mkdir(parents=True, exist_ok=True)
        content = f"# Secret Rotation Log\n\nLast Updated: {now.isoformat()}Z\n\n"
    else:
        content = file_path.read_text()
    
    # Update last updated timestamp
    content = content.replace(
        "Last Updated:",
        f"Last Updated: {now.isoformat()}Z (previous: Last Updated:"
    ).split("(previous: ")[0] + "\n"
    
    # Find or create secret section
    secret_marker = f"## {secret_name}"
    
    if secret_marker in content:
        # Update existing section
        lines = content.split("\n")
        in_section = False
        new_lines = []
        
        for line in lines:
            if line == secret_marker:
                in_section = True
                new_lines.append(line)
                new_lines.append(f"- **Last Rotated:** {now.isoformat()}Z")
                new_lines.append(f"- **Next Rotation:** {next_rotation.isoformat()}Z (60 days)")
                # Skip old rotation info
                continue
            elif in_section and line.startswith("## "):
                in_section = False
            elif in_section and line.startswith("- **Last Rotated:**"):
                continue
            elif in_section and line.startswith("- **Next Rotation:**"):
                continue
            
            new_lines.append(line)
        
        content = "\n".join(new_lines)
    else:
        # Add new section
        content += f"\n{secret_marker}\n"
        content += f"- **Last Rotated:** {now.isoformat()}Z\n"
        content += f"- **Next Rotation:** {next_rotation.isoformat()}Z (60 days)\n"
        content += f"- **Rotation Count:** 1\n"
        content += f"- **Last Status:** {status}\n"
        content += f"- **History:**\n"
        content += f"  - {now.strftime('%Y-%m-%d')}: Automatic rotation\n"
    
    file_path.write_text(content)
    print(f"✓ Updated metadata for {secret_name}")


def main():
    parser = argparse.ArgumentParser(description="Update secret rotation metadata")
    parser.add_argument("--secret", required=True, help="Secret name")
    parser.add_argument("--status", required=True, help="Rotation status")
    parser.add_argument("--metadata-file", required=True, help="Path to metadata file")
    
    args = parser.parse_args()
    
    metadata_path = Path(args.metadata_file)
    update_metadata(metadata_path, args.secret, args.status)


if __name__ == "__main__":
    main()
```

## Usage

### Manual Rotation

```bash
# Rotate a specific secret
gk secrets rotate OPENROUTER_API_KEY

# Trigger scheduled rotation workflow for a specific secret
gh workflow run secret-rotation-schedule.yml -f secret_name=OPENROUTER_API_KEY
```

### Automatic Rotation

The system runs automatically every Monday at 02:00 UTC. Secrets older than 60 days are automatically rotated.

### Escalation

If a rotation fails after 3 retries, an issue is created with:
- Label: `goap-escalation`, `security`, `urgent`
- Assignee: @midnghtsapphire
- Full failure context and logs

## Configuration

### Rotation Threshold

Default: 60 days

To change, edit `.github/workflows/secret-rotation-schedule.yml`:

```yaml
--days-threshold 60  # Change to desired number of days
```

### Retry Policy

- Attempt 1: Immediate
- Attempt 2: After 5 minutes
- Attempt 3: After 15 minutes (total 20 minutes from start)
- After 3 failures: Escalate to GOAP

## Monitoring

View rotation history:

```bash
cat wr/memory/secret-rotations.md
```

View workflow runs:

```bash
gh workflow view secret-rotation-schedule
gh run list --workflow=secret-rotation-schedule
```

## Security Notes

- Secret values are never logged or exposed
- Rotation uses secure random generation
- All operations are audited in metadata file
- Failed rotations escalate to human review
- GitHub Actions secrets have write protection

## Integration with MCP Server

The MCP server (`doppler-mcp`) provides programmatic access:

```python
# In your agent code
from mcp.client import Client

client = Client("doppler")

# Check if rotation needed
secrets = client.call_tool("doppler_secrets_list", {
    "project": "revvel-standards",
    "config": "prd"
})

# Rotate if needed
for secret in secrets:
    if should_rotate(secret):
        client.call_tool("doppler_secrets_set", {
            "secret_name": secret["name"],
            "secret_value": generate_new_value(),
            "project": "revvel-standards",
            "config": "prd"
        })
```

## Troubleshooting

### Rotation Failures

1. Check Doppler API status: `gk health`
2. Verify token permissions: `gk status`
3. Review workflow logs: `gh run view <run-id>`
4. Check escalation issues: `gh issue list --label goap-escalation`

### Metadata Corruption

If `wr/memory/secret-rotations.md` becomes corrupted:

```bash
# Backup
cp wr/memory/secret-rotations.md wr/memory/secret-rotations.md.backup

# Rebuild from Doppler
python scripts/rebuild-rotation-metadata.py
```

## Future Enhancements

- [ ] Integrate with HashiCorp Vault
- [ ] Support for secret versioning
- [ ] Automated rollback on failure
- [ ] Slack/email notifications
- [ ] Secret dependency tracking (if A rotates, also rotate B)
- [ ] Integration with security scanning tools
