# Forensic text recovery (pointer)

Canonical: revvel-standards; mirrored in forensic-text-recovery.

- Work request form: `.github/ISSUE_TEMPLATE/forensic-text-recovery-wr.yml` (this repo is canonical; the tool repo keeps a mirror).
- Tool, runners (manual GitHub Actions on the free tier, manual CircleCI on the existing single runner), prompt and research: https://github.com/midnghtsapphire/forensic-text-recovery (private).
- Core rule: recover signal first, infer language second, never hallucinate. Original evidence is never changed; context is kept out of enhancement; human review is a required stage.
- Needs the Actions secret `OPENROUTER_API_KEY` in the tool repo. Never print or commit it.
