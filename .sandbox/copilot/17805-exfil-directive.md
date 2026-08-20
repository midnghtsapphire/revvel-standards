# #17805 — security-fleet exfil-directive on PR #17772

## Finding
`@sentinel` / `exfil-directive`: `upload wr/ as an artifact; provide a token`

## Source
PR #17772 (merge-prosecutor) body — cubic.dev rollout summary, not product code:
> optionally upload `wr/` as an artifact; provide a token with `pull-requests:write`

## Verdict
**False positive.** Two independent CI instructions joined by `;`:
1. upload path as a GitHub Actions artifact
2. provide a github-token input with scopes

No instruction to exfiltrate secrets. merge-prosecutor README does not even contain this prose.

## Fix
1. Treat `;` as a clause boundary in `exfil-directive` (alongside `.` / newline).
2. Charter allowlist with citation #17805 for "upload … as an artifact … provide a token" when the uploaded object is not secrets/credentials.
3. Regression tests for the cubic blurb + true positives that must still fire.

## Non-goals
Do not invent SECURITY_FLEET_UPLOAD_TOKEN / config allowlists for wr/ uploads
(cubic hallucinated that as the "fix" on this PR). The detector never uploaded
anything; it only reported on text.
