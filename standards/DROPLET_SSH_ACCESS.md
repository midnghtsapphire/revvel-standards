# Droplet SSH Access Standard

**Version:** 1.0.0  
**Date:** April 30, 2026  
**Status:** Mandatory for droplet operations  
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)

---

## 1. Overview

All AI agents that need to manage the MIDNGHTSAPPHIRE droplet (164.90.148.7) use a shared `agent-access` SSH key pair. This key is stored in two places so every agent platform can retrieve it:

| Agent Platform | How to Get the Key |
|---|---|
| **OpenHands** | `$SSH_PRIVATE_KEY` org secret (auto-injected) |
| **Claude Code / Cursor / Windsurf** | DoppleMCP → `doppler_secrets_get(project=revvel-standards, config=prd, name=SSH_PRIVATE_KEY)` |
| **GitHub Actions (Copilot)** | `${{ secrets.SSH_PRIVATE_KEY }}` repository secret |
| **Any agent with shell** | `doppler secrets get SSH_PRIVATE_KEY --project revvel-standards --config prd --plain` |

---

## 2. Key Details

| Property | Value |
|----------|-------|
| **Key type** | Ed25519 |
| **Key comment** | `agent-access@midnghtsapphire` |
| **Droplet IP** | `164.90.148.7` |
| **Droplet user** | `root` |
| **Key storage (OpenHands)** | Org secret: `SSH_PRIVATE_KEY` |
| **Key storage (Doppler)** | `revvel-standards/prd/SSH_PRIVATE_KEY` |
| **Key storage (GitHub)** | Repository secret: `SSH_PRIVATE_KEY` |

---

## 3. Using SSH from Any Agent

### 3.1 Quick Connect (when key is in env var)

```bash
# Write key to file (required — SSH won't read from env directly)
mkdir -p ~/.ssh
echo "$SSH_PRIVATE_KEY" > ~/.ssh/agent-access
chmod 600 ~/.ssh/agent-access

# Connect
ssh -i ~/.ssh/agent-access -o StrictHostKeyChecking=no root@164.90.148.7
```

### 3.2 Run a Remote Command

```bash
ssh -i ~/.ssh/agent-access -o StrictHostKeyChecking=no root@164.90.148.7 \
  "docker compose -f /opt/kong/docker-compose.yml ps"
```

### 3.3 Copy Files To/From Droplet

```bash
# Upload
scp -i ~/.ssh/agent-access -o StrictHostKeyChecking=no \
  ./local-file.txt root@164.90.148.7:/opt/kong/

# Download
scp -i ~/.ssh/agent-access -o StrictHostKeyChecking=no \
  root@164.90.148.7:/opt/kong/docker-compose.yml ./
```

### 3.4 Pull Key from Doppler First (MCP agents)

```python
# For agents using DoppleMCP server
key = await doppler_secrets_get(
    project="revvel-standards",
    config="prd",
    name="SSH_PRIVATE_KEY"
)

# Write to file and connect
import subprocess, tempfile, os
key_path = os.path.expanduser("~/.ssh/agent-access")
os.makedirs(os.path.dirname(key_path), exist_ok=True)
with open(key_path, "w") as f:
    f.write(key)
os.chmod(key_path, 0o600)

result = subprocess.run(
    ["ssh", "-i", key_path, "-o", "StrictHostKeyChecking=no",
     "root@164.90.148.7", "uptime"],
    capture_output=True, text=True
)
print(result.stdout)
```

### 3.5 Pull Key from Doppler First (CLI agents)

```bash
# Requires DOPPLER_TOKEN in environment
doppler secrets get SSH_PRIVATE_KEY \
  --project revvel-standards --config prd --plain > ~/.ssh/agent-access
chmod 600 ~/.ssh/agent-access
ssh -i ~/.ssh/agent-access -o StrictHostKeyChecking=no root@164.90.148.7
```

---

## 4. GitHub Actions Integration

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Configure SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/agent-access
          chmod 600 ~/.ssh/agent-access
          ssh-keyscan -H 164.90.148.7 >> ~/.ssh/known_hosts

      - name: Deploy Kong
        run: |
          ssh -i ~/.ssh/agent-access root@164.90.148.7 \
            "cd /opt/kong && docker compose pull && docker compose up -d"
```

---

## 5. Common Droplet Tasks

### 5.1 Deploy Kong Gateway

```bash
ssh -i ~/.ssh/agent-access -o StrictHostKeyChecking=no root@164.90.148.7 << 'EOF'
cd /opt/kong
docker compose pull
docker compose up -d
bash bootstrap.sh
EOF
```

### 5.2 Check Service Status

```bash
ssh -i ~/.ssh/agent-access -o StrictHostKeyChecking=no root@164.90.148.7 \
  "pm2 list && docker ps"
```

### 5.3 Read Current Environment

```bash
ssh -i ~/.ssh/agent-access -o StrictHostKeyChecking=no root@164.90.148.7 \
  "cat /root/start.sh | grep -E '^export' | sed 's/=.*/=REDACTED/'"
```

### 5.4 Import Secrets to Doppler

```bash
# Pull secrets from droplet start.sh and push to Doppler
ssh -i ~/.ssh/agent-access -o StrictHostKeyChecking=no root@164.90.148.7 \
  "cat /root/start.sh" | grep '^export' | while read line; do
    key=$(echo "$line" | sed 's/export //;s/=.*//')
    val=$(echo "$line" | sed 's/export [^=]*=//')
    curl -s -X POST https://api.doppler.com/v3/configs/config/secrets \
      -H "Authorization: Bearer $DOPPLER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"project\":\"revvel-standards\",\"config\":\"prd\",\"secrets\":{\"$key\":\"$val\"}}"
done
```

---

## 6. Security Rules

1. **Never commit the private key.** It lives in Doppler and OpenHands org secrets only.
2. **Never log the key value.** When debugging, log the fingerprint: `ssh-keygen -lf ~/.ssh/agent-access`
3. **One key for all agents.** Don't generate per-agent keys — use the shared `agent-access` key.
4. **Rotate annually.** Generate a new key pair, update Doppler + OpenHands secrets, update droplet `authorized_keys`.
5. **StrictHostKeyChecking=no is acceptable** for agent automation (the droplet IP is known and stable). For production CI/CD, use `ssh-keyscan` to pin the host key.

---

## 7. Setup Checklist (One-Time)

- [x] Generate `agent-access` Ed25519 key pair
- [x] Add public key to droplet: `echo "PUBLIC_KEY" >> /root/.ssh/authorized_keys`
- [x] Store private key in OpenHands org secret as `SSH_PRIVATE_KEY`
- [x] Store private key in Doppler `revvel-standards/prd` as `SSH_PRIVATE_KEY`
- [ ] Add private key as GitHub repository secret `SSH_PRIVATE_KEY` (all 3 repos)
- [x] Test: `ssh -i ~/.ssh/agent-access root@164.90.148.7 uptime`

---

## 8. Relationship to Other Standards

| Standard | Relationship |
|----------|-------------|
| `KONG_GATEWAY.md` | SSH access needed to deploy Kong on droplet |
| `08_SECRETS_MANAGEMENT_STANDARD.md` | SSH key stored in Doppler alongside other secrets |
| `SECURITY.md` | SSH key follows secret handling rules |
