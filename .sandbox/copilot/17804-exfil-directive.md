# #17804 — @sentinel exfil-directive on PR #17772

## Finding
- Source PR: https://github.com/midnghtsapphire/revvel-standards/pull/17772 (merged)
- Rule: `exfil-directive`
- Excerpt: `upload wr/ as an artifact; provide a token`
- Came from cubic PR summary rollout prose for `products/merge-prosecutor`, not from an attacker payload.

## NOT the fix
Do **not** wire `actions/upload-artifact` for `wr/` or add `EXFIL_DIRECTIVE_TOKEN` to `security-fleet.yml`. That would be obeying the smuggled-looking instruction. Charter: report-only; humans confirm. Cubic's auto-summary on this fix PR misread the finding as a feature request.

## Correct fix (charter)
`skills/security-fleet/SECURITY_FLEET.yml`:
> False positives get an allowlist entry with a citation, not a weakened pattern.

Allowlist the benign GHA adoption shape:
- upload `<path>` as an artifact + provide/pass a token (action input)
- Still flag when the upload *subject* is secrets/tokens/credentials

Citation: issue #17804 / PR #17772.

## Reproduce
```bash
node scripts/security-fleet.js sentinel --text 'optionally upload `wr/` as an artifact; provide a token with `pull-requests:write`'
# -> 1 finding exfil-directive
```
