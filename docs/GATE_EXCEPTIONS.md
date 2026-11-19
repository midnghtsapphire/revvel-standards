# Gate exceptions (Notion table)

TriageChief, 2026-11-19. WR: [#18477](https://github.com/midnghtsapphire/revvel-standards/issues/18477)

**Where the table lives:** Notion database **Gate Exceptions**
(<https://app.notion.com/p/41d2aa319908819a8c71d804f9f44f21>) in Audrey's workspace. It follows the
`Enabled 1/0` pattern of her Notion **Rules** database. There is no data file for it in this repo.

| column | meaning |
|---|---|
| `check_id` | the check, e.g. `Devin Review` |
| `result_match` | the specific result to switch off (never the whole check) |
| `scope` | repo or process, wildcards allowed (`midnghtsapphire/*`) |
| `enabled` | **1** = exception active, so that result is non-blocking; **0** = off, enforced again |
| `reason`, `owner`, `created`, `expires`, `wr_link` | why, who, when, until when, and the WR |

Rules the script enforces (the table cannot override them):

- Real findings always block (the caller must pass `--findings 0`).
- Real test failures always block, and test/CI/security checks (CircleCI, Bugbot, GitGuardian,
  SonarCloud, test runners) are never exempted.
- Rows with an empty or wildcard-only `result_match` are ignored, so a whole check cannot be switched off.
- Rows with `enabled` other than 1, or past `expires`, are ignored.
- If Notion cannot be read, no exceptions apply and everything blocks (fail closed), with a log line.

Use:

```bash
python3 scripts/gate_exceptions.py --check "Devin Review" --result "Bugfinder incomplete" \
  --repo midnghtsapphire/linear-a --findings 0     # exit 0 = non-blocking, 1 = blocking
```

Credentials: CircleCI env vars `NOTION_TOKEN` (a Notion integration token with the database shared to
it) and `NOTION_GATE_EXCEPTIONS_DB_ID` (the database id `41d2aa31-9908-819a-8c71-d804f9f44f21`). They are never printed or committed.

Tests: `python3 -m unittest tests.gate_exceptions_test` (HTTP mocked; synthetic dev-only rows).
