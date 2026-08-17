# Durability Mirror Operations

Weekly durability behavior
- Create a repository snapshot archive
- Upload archive as workflow artifact
- Mirror to secondary gist when mirror secrets are configured
- Optionally upload to S3/B2-compatible storage when bucket secrets are configured

Monthly durability behavior
- Export key docs (`wr/NORTH_STAR.md`, `projects/_self/GRANTS_AND_COMPLIANCE.md`, `wr/memory/decisions.jsonl`) as release artifact PDF bundle
