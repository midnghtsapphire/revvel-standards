# REVVEL-DISABLED | AGENT: copilot | MODEL: gpt-5 | WR: #17790 | DATE: 2026-08-20 | STATUS: REPLACED
# REASON: one-shot version bump against a vendored uv.lock; already applied; re-run is a no-op. RVS-AGENT-001 forbids agent deletion — owner may still ratify full removal (option A on #17790).
# RESTORE-BY: 2026-09-03 | OWNER: @midnghtsapphire | TICKET: #17790
# import re
#
#
# LOCK_PATH = "mcp-servers/gemini-notebook-mcp-cli/uv.lock"
#
# # (package, old version, new version)
# BUMPS = [
#     ("cryptography", "49.0.0", "50.0.0"),
#     ("authlib", "1.6.10", "1.6.12"),
#     ("idna", "3.11", "3.15"),
#     ("pydantic-settings", "2.13.1", "2.14.2"),
# ]
#
#
# def main():
#     with open(LOCK_PATH, "r") as f:
#         content = f.read()
#
#     for package, old, new in BUMPS:
#         pattern = r'name = "%s"\nversion = "%s"' % (package, re.escape(old))
#         replacement = 'name = "%s"\nversion = "%s"' % (package, new)
#         content = re.sub(pattern, replacement, content)
#
#     with open(LOCK_PATH, "w") as f:
#         f.write(content)
#
#     print("Updated uv.lock")
#
#
# if __name__ == "__main__":
#     main()
# REVVEL-DISABLED-END
