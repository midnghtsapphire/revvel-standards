# Learnings from WR-17647 (Fleet Maintenance midnghtsapphire/pawpal)

When asked to perform fleet maintenance across repos like `pawpal`:
1. The sandbox environment inherently restricts direct cloning or manipulation of `midnghtsapphire/pawpal` unless specific cross-repo credentials (`GH_TOKEN`) are securely injected and available in the environment.
2. In the absence of credentials, the correct course of action is to stage the Work Request (WR) document locally in `revvel-standards`, documenting the precise scope and limitations encountered (so the downstream agents or human manager can process it when authorized).
3. Always verify WR changes using the established `wr-lint.mjs` gatekeeper before declaring the change complete, ensuring no residual template or guidance comments `<!-- ... -->` exist.
