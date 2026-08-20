import re


LOCK_PATH = "mcp-servers/gemini-notebook-mcp-cli/uv.lock"

# (package, old version, new version)
BUMPS = [
    ("cryptography", "49.0.0", "50.0.0"),
    ("authlib", "1.6.10", "1.6.12"),
    ("idna", "3.11", "3.15"),
    ("pydantic-settings", "2.13.1", "2.14.2"),
]


def main():
    with open(LOCK_PATH, "r") as f:
        content = f.read()

    for package, old, new in BUMPS:
        pattern = r'name = "%s"\nversion = "%s"' % (package, re.escape(old))
        replacement = 'name = "%s"\nversion = "%s"' % (package, new)
        content = re.sub(pattern, replacement, content)

    with open(LOCK_PATH, "w") as f:
        f.write(content)

    print("Updated uv.lock")


if __name__ == "__main__":
    main()
