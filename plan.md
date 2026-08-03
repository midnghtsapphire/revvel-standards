Plan:
1. Update docs in `oaudrey/`:
   - Update `oaudrey/README.md` to reflect recent changes or just refresh it.
   - Add `oaudrey/CONTRIBUTING.md`.
2. Implement concrete improvements:
   - Add a Content Security Policy (CSP) meta tag to `oaudrey/index.html` for security.
   - Add a `manifest.json` for better PWA support / DX.
3. Fix standard review workflows:
   - Edit `.github/workflows/jules-pr-reviewer.yml` to uncomment the `pull_request` trigger.
   - Edit `.github/workflows/semgrep.yml` to run on `pull_request` instead of just `workflow_dispatch`, ensuring the target repo has Semgrep in the PR review jury.
4. Pre-commit instructions: run tests and `pre_commit_instructions` tool.
5. Submit as a PR-equivalent.
