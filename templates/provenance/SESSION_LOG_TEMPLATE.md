# Provenance Session Log — Template

<!-- USAGE NOTE:
  - Copy ONE "### Session:" block below into `docs/PROVENANCE_SESSION_LOG.md`
    (append at the bottom, newest last) for each review/analysis session.
  - Record only OBSERVABLE provenance: question → tool used → result → verified
    claim with a `path:line` citation.
  - Do NOT attempt to record hidden chain-of-thought / internal reasoning — it is
    not exposed by model providers and cannot be truthfully captured.
  - Name every tool per `docs/PROVENANCE_STANDARD.md`:
    `Tool name (Publisher / Sponsor) via package@version [nested: ...]`.
-->

**Naming standard:** [`docs/PROVENANCE_STANDARD.md`](../../docs/PROVENANCE_STANDARD.md)
**Destination log:** [`docs/PROVENANCE_SESSION_LOG.md`](../../docs/PROVENANCE_SESSION_LOG.md)

---

## Copy from here ↓

### Session: <PR # / issue # / task name> (`<branch>` → `<base>`)

**When:** <YYYY-MM-DD>
**Reviewer/Agent:** <name (Publisher) — what it is / its scope>
**Head SHA reviewed:** `<full commit sha>`

| # | Claim under review | Tool / source used | Verified result + citation |
| --- | --- | --- | --- |
| 1 | <the specific question/claim> | <direct file read / DeepWiki / grep / external tool, named per standard> | <conclusion> + `path/to/file.ext:line` |
| 2 | | | |

**Honest meta-note for this session:** <any stale/uncertain/unverifiable findings; flag tool confidence that was NOT independently verified>

**Tools used this session (named per `docs/PROVENANCE_STANDARD.md`):**
- <Tool name> (<Publisher / Sponsor>) via `<package@version or path>` — <what it does, and its known limits e.g. "indexed snapshot, can lag head SHA">

## Copy to here ↑
