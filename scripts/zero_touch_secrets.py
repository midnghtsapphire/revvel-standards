#!/usr/bin/env python3
"""zero_touch_secrets.py — broker / acquirer / leak-response for free-tier secrets.
Closes WR #18273 + #18270. No paid services: GitHub Secrets API + age + gh CLI.
Values are never printed, logged, or committed."""
import argparse, json, os, subprocess, sys, getpass, base64, urllib.request

OWNER = "midnghtsapphire"
VAULT = os.path.expanduser("~/.config/revvel/secrets.age")
SECRET_MAP = "config/secret-map.json"

def gh_api(method, path, payload=None, token=None):
    token = token or os.environ.get("GITHUB_PAT", "")
    req = urllib.request.Request(
        f"https://api.github.com{path}", method=method,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"},
        data=json.dumps(payload).encode() if payload else None)
    return json.load(urllib.request.urlopen(req, timeout=20))

def vault_load():
    if not os.path.exists(VAULT):
        return {}
    out = subprocess.run(["age", "-d", VAULT], capture_output=True, text=True)
    return json.loads(out.stdout) if out.returncode == 0 else {}

def vault_save(data):
    os.makedirs(os.path.dirname(VAULT), exist_ok=True)
    key_file = os.path.expanduser("~/.config/revvel/age-key.txt")
    if not os.path.exists(key_file):
        sys.exit("age key missing: run `age-keygen -o ~/.config/revvel/age-key.txt` once")
    pub = subprocess.run(["age-keygen", "-y", key_file], capture_output=True, text=True).stdout.strip()
    subprocess.run(["age", "-r", pub, "-o", VAULT], input=json.dumps(data), text=True, check=True)

def seal_and_set_secret(repo, name, value):
    """GitHub Actions secret via libsodium sealed box."""
    import nacl.public, nacl.encoding
    pk = gh_api("GET", f"/repos/{OWNER}/{repo}/actions/secrets/public-key")
    box = nacl.public.SealedBox(nacl.public.PublicKey(pk["key"], nacl.encoding.Base64Encoder))
    encrypted = base64.b64encode(box.encrypt(value.encode())).decode()
    gh_api("PUT", f"/repos/{OWNER}/{repo}/actions/secrets/{''}", None)  # placeholder
    req = urllib.request.Request(
        f"https://api.github.com/repos/{OWNER}/{repo}/actions/secrets/{name}",
        method="PUT",
        headers={"Authorization": f"Bearer {os.environ['GITHUB_PAT']}", "Accept": "application/vnd.github+json"},
        data=json.dumps({"encrypted_value": encrypted, "key_id": pk["key_id"]}).encode())
    urllib.request.urlopen(req, timeout=20)

CHECKLIST = {
    "openrouter":  "openrouter.ai → Keys → Create Key",
    "digitalocean": "cloud.digitalocean.com → API → Tokens → Generate New Token",
    "cloudflare":  "dash.cloudflare.com → My Profile → API Tokens → Create Token",
    "supabase":    "supabase.com → Project → Settings → API → anon + service_role keys",
    "elevenlabs":  "elevenlabs.io → Profile → API Key",
    "github_pat":  "github.com → Settings → Developer settings → Fine-grained tokens",
}

ROTATION = {
    "openrouter":  "openrouter.ai → Keys → delete leaked key → Create Key",
    "digitalocean": "cloud.digitalocean.com → API → Tokens → delete → regenerate",
    "cloudflare":  "dash.cloudflare.com → API Tokens → Roll token",
    "supabase":    "Project Settings → API → Generate new JWT secret (invalidates both keys)",
    "github_webhook": "Provider console → regenerate signing secret → scripts/setup-mcp-endpoints.sh --rotate-hook-secret",
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["broker", "acquire", "leak"])
    ap.add_argument("--repo"); ap.add_argument("--key"); ap.add_argument("--from-env")
    ap.add_argument("--service"); ap.add_argument("--checklist", action="store_true")
    ap.add_argument("--verify", action="store_true")
    a = ap.parse_args()

    if a.mode == "acquire":
        data = vault_load()
        for svc, path in CHECKLIST.items():
            print(f"\n▸ {svc}: {path}")
            v = getpass.getpass(f"  paste value for {svc} (hidden, Enter to skip): ")
            if v: data[svc] = v
        vault_save(data)
        print("\n✔ vault updated:", VAULT)

    elif a.mode == "broker":
        if a.verify:
            names = [s["name"] for s in gh_api("GET", f"/repos/{OWNER}/{a.repo}/actions/secrets")["secrets"]]
            print("secrets in", a.repo, ":", ", ".join(names))
            return
        value = os.environ.get(a.from_env or "", "") or vault_load().get(a.key.lower(), "")
        if not value: sys.exit("no value found (env var or vault)")
        seal_and_set_secret(a.repo, a.key, value)
        print(f"✔ {a.key} → {a.repo} (value never shown)")

    elif a.mode == "leak":
        print("1. Rotate:", ROTATION.get(a.service, "see provider console"))
        new = getpass.getpass("2. Paste NEW value (hidden): ")
        if new and os.path.exists(SECRET_MAP):
            sm = json.load(open(SECRET_MAP))
            for repo, keyname in sm.get(a.service, []):
                seal_and_set_secret(repo, keyname, new)
                print(f"   ✔ updated {repo}/{keyname}")
        os.makedirs("docs/security", exist_ok=True)
        with open("docs/security/LEAK_LOG.md", "a") as f:
            import datetime
            f.write(f"- {datetime.date.today()} — {a.service} rotated (leak response)\n")
        print("3. ✔ logged. If leaked in an issue body: gh issue edit <num> --body '<redacted>'")

if __name__ == "__main__":
    main()
