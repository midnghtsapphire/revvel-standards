#!/usr/bin/env python3
"""
audit-secrets.py — Cross-reference every Actions secret against the codebase.

Run from the repo root. For each secret name listed at the top, grep every
workflow / script / config / doc for `secrets.NAME` and count references.
Zero references = candidate for deletion. 1-2 references = "verify before
deleting" (might be a recently added or narrowly used key).

Origin: written 2026-08-09 during the "we have so many keys we're at the
100-secret cap" session. See:
  .sandbox/openhands/sessions/2026-08-09-1400-secrets-audit-and-subscription-tracker.md
  standards/OUT_OF_SCOPE_AUTO_WR_STANDARD.md (this script uncovered orphaned
  keys for tools nobody wired workflows for — that's an out-of-scope bug
  class that would normally trigger an auto-WR)

Usage:
    python3 .sandbox/openhands/scripts/audit-secrets.py
    python3 .sandbox/openhands/scripts/audit-secrets.py --list-secrets NAME1,NAME2

To use this on another repo, replace `SECRETS` with the output of:
    gh api repos/OWNER/REPO/actions/secrets --paginate | jq -r '.secrets[].name'
"""
import argparse
import subprocess

# Snapshot of revvel-standards Actions secrets as of 2026-08-09.
# Regenerate periodically — new secrets get added, old ones deleted.
SECRETS = """ADMIN_GITHUB_TOKEN AISSTREAM ANTHROPIC_API_KEY APP_ID APP_PRIVATE_KEY BITO_ACCESS_KEY
BUILT_IN_FORGE_API_KEY CIRCLECI_API_KEY CLAUDE_API_AGENT CLAUDE_API_KEY CLAWMART_API_KEY CLINE_API_KEY
COMPOSIO_API_KEY CREWAI_API_KEY CURSOR_API_KEY DALLE_API_AGENT DATABASE_URL DIGITALOCEAN_API_KEY
DIGITALOCEAN_GATEWAY_DASHBOARD_URL DIGITALOCEAN_GATEWAY_TOKEN DIGITALOCEAN_TOKEN DOPPLER_AGENT_API
DOPPLER_API_KEY DOPPLER_CIRCLECI_ODIC DOPPLER_TOKEN DO_API_TOKEN ELEVENLABS_AGENT ELEVENLABS_API_KEY
EMAIL_MAIN FAMILY_APP_PASSWORD FIRECRAWL_API_KEY FRED_API_KEY GDELT_PROXY_URL GEMINI_API_KEY GH_TOKEN
GIT_ACCESS_TOKEN GMAIL_ADDRESS GMAIL_APP_PASSWORD GOOGLE_MAPS_API_KEY GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET HEYGEN_API_KEY HUGGINGFACE_TOKEN JULES_API_KEY JULES_RENDER_LAB_API_KEY
JULES_TOKEN JWT_SECRET LEONARDO_API_KEY LINEAR_API_KEY LM_STUDIO_API_KEY LOGODEV_API_KEY
MAKE_PDF_WR_WEBHOOK_URL MELODY_SHARED_SECRET MIDJOURNEY_API_KEY MISTRAL_API_KEY NASA_FIRMS_KEY
NEON_API_KEY OCTOPUS_TOKEN OPENAI_API_KEY OPENAI_TEST_DALLE_AGENT OPENHANDS_API_KEY OPENHANDS_LLM_KEY
OPENROUTER_API_KEY OTX_API_KEY OWNER_NAME OWNER_OPEN_ID PERPLEXITY_API_KEY PRODUCTION_URL PROJECTS_PAT
READY_FOR_REVIEW_TOKEN REESEREVIEWS RENDER_API_KEY RESEND_API_KEY REVENUECATV2_API_KEY
REVENUECATVI_API_KEY REVENUECAT_TEST_API_KEY ROO_API_KEY SSH_PRIVATE_KEY SSH_REESEREVIEWS
STRIPE_API_KEY STRIPE_LIVE_SECRET_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET TAVILY_API_KEY
TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID TWILIO_PHONE USER_EMAIL USER_NAME VAULT_ADDR VAULT_TOKEN
VITE_APP_ID VITE_FRONTEND_FORGE_API_KEY VITE_GOOGLE_MAPS_API_KEY VITE_STRIPE_PUBLISHABLE_KEY
XAI_API_KEY XAI_GROK_API_KEY ZAPIER_API_KEY ZAPIER_NOTATION_AUTOMATION""".split()


def audit(secrets):
    counts = {}
    sample_files = {}
    for name in secrets:
        r = subprocess.run(
            ['grep', '-r', '-l',
             '--include=*.yml', '--include=*.yaml',
             '--include=*.js', '--include=*.ts', '--include=*.json',
             '--include=*.md', '--include=*.sh',
             f'secrets.{name}',
             '.github/', 'scripts/', 'config/', 'docs/'],
            capture_output=True, text=True, cwd='.')
        files = [ln for ln in r.stdout.splitlines() if ln.strip()]
        counts[name] = len(files)
        sample_files[name] = files[:3]
    return counts, sample_files


def report(counts, sample_files):
    print(f"{'SECRET':<38} {'REFS':>4}  SAMPLE FILES")
    print('-' * 100)
    zero_refs, low_refs, high_refs = [], [], []
    for name in sorted(counts.keys(), key=lambda n: (counts[n], n)):
        c = counts[name]
        marker = '[GONE]' if c == 0 else '[LOW] ' if c <= 2 else '      '
        files = ', '.join(f.replace('.github/workflows/', 'wf/').replace('scripts/', 'sc/')
                          for f in sample_files[name])
        print(f"{marker} {name:<32} {c:>4}  {files[:60]}")
        if c == 0:
            zero_refs.append(name)
        elif c <= 2:
            low_refs.append(name)
        else:
            high_refs.append(name)

    print()
    print(f"Summary:  {len(zero_refs)} zero-ref  |  {len(low_refs)} low-ref (1-2 files)  |  {len(high_refs)} well-used")
    print()
    print("=== DELETION CANDIDATES (zero refs, nothing uses them) ===")
    for n in zero_refs:
        print(f"  {n}")
    print()
    print("=== LOW-USE (verify before deleting) ===")
    for n in low_refs:
        print(f"  {n}")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--list-secrets', help='comma-separated names to audit (overrides SECRETS)')
    args = parser.parse_args()
    secrets = args.list_secrets.split(',') if args.list_secrets else SECRETS
    counts, sample_files = audit(secrets)
    report(counts, sample_files)
