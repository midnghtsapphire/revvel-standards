---
name: sast-configuration
description: >-
  Run Semgrep on the paths you changed, record the rule id and the line, and
  suppress a finding only with the rule id on the adjacent line. Use when
  setting up or running static security analysis.
---

# SAST configuration

**Skill Name:** `sast-configuration`
**Version:** 1.0.0
**Date:** 2026-11-11
**Status:** Active
**Category:** Developer Workflow
**Type:** Operational

## Attribution

Adapted from the MIT skill at <https://github.com/wshobson/agents/tree/main/plugins/security-scanning/skills/sast-configuration>. Copyright (c) 2024 Seth Hobson. License: MIT. The adaptation leads with the Semgrep command, requires an adjacent rule id on a suppression, and does not add a GitHub Actions workflow. Actions runners currently do not start.

## Where this file lives

Canonical text: this file. `skills/sast-configuration/SKILL.md` is a loader. `skills/sast-configuration/sast-configuration.skill.yml` is the vault machine config. Decision, 2026-11-11, recorded by TriageChief, same layout as `docs/skills/github-read-write-admin/SKILL.md`.

## Revvel house rules

These rules win over the upstream skill. Commands for `git` and `gh` live in `docs/skills/github-read-write-admin/SKILL.md`.

Sign every issue body, discussion post, pull request title, pull request body, review, comment, and commit message. Start with the bot name in bold and end with `— BotName`.

```bash
BOT=TriageChief
signed_line() { printf '**%s** %s — %s\n' "$BOT" "$1" "$BOT"; }
signed_body() { printf '**%s** %s\n\n— %s\n' "$BOT" "$1" "$BOT"; }
```

Replace `TriageChief` with the bot doing the work.

Never delete and never rewrite history. Do not run `git push --force`. Do not run `git push --force-with-lease`. Do not rebase, squash, or amend a commit that has been pushed. Do not pass `--delete-branch`. Do not delete a branch, an issue, a comment, a label, a file, or a ruleset. Comment the old text out, or append a dated note. Append-only files gain lines. Do not run `git merge -s union`: git has no strategy by that name. For one append-only file, run `git merge-file --union`. `CHANGELOG.md`, `AUTHORS`, and `CONTRIBUTORS` already have `merge=union` in `.gitattributes`, so a normal `git merge` keeps both sides of those files. Do not `git checkout --ours` or `--theirs` on a ledger.

Merge only when the task asks for that merge, and only when every gate is true on the same head SHA: an assignee is set, the work matches the pull request, `isDraft` is false, every required check on that SHA is green, and the account is not the pull request author. CircleCI `lint-and-test` is the real CI. GitHub Actions runners currently do not start. A missing Actions run is not a green check and is not a reason to edit a workflow, a ruleset, or a permission. Do not merge your own pull request. Do not assign yourself in order to pass the gate.

No secrets in output. Do not run `gh auth token`. Do not echo `GH_TOKEN` or `GITHUB_TOKEN`. If a log contains a token, report the URL or the job id only.

## When to use

The task asks for a static security scan, a custom rule, or a way to record a false positive. Scan the paths you changed. Do not print a finding whose match is a secret. Report the rule id, the path, and the line.

## Run Semgrep

Semgrep is the scanner to run first. `--error` exits non-zero when a finding remains, which is the result you report.

```bash
OUT=$(mktemp)
semgrep --config=auto --error --metrics=off --quiet --sarif-output="$OUT" path/you/changed >/dev/null
```

`--sarif` alone prints the SARIF document, including `region.snippet.text`, on stdout. Do not pass `--sarif` together with `--sarif-output`. Redirect stdout to `/dev/null`. Report each finding's rule id, path, and line from `"$OUT"`. Do not print the snippet field. `--metrics=off` keeps the run from uploading a snippet. If `semgrep` is not on `PATH`, say so and stop. Do not start a SonarQube container unless the task asked for a local server. CodeQL is the alternative when the task names CodeQL. Do not install a second scanner beside the one the task named.

A policy pack is a config flag, not a certification. `semgrep --config p/pci-dss --metrics=off` is a PCI-oriented rule pack. The exit code is the result. It is not a PCI-DSS attestation. SOC2 is the same: name the pack and the exit code.

## Custom rules

Add a rule file next to the repo's existing Semgrep config when one exists. Do not replace that file. A rule that flags a hard-coded secret pattern names the id, the pattern, the message, and the severity:

```yaml
rules:
  - id: hardcoded-jwt-secret
    pattern: jwt.encode($DATA, "$SECRET", ...)
    message: JWT secret should not be hardcoded
    severity: ERROR
```

## Suppressions

A suppression sits on the same line as the finding, or on the line immediately above with no blank line between, and it names the rule id. A comment without the id does not suppress the finding. Write the reason in that comment. Review suppressions when you touch the file. Do not delete a suppression someone else wrote. If it is wrong, add a dated note and a tighter rule.

## CI

CircleCI `lint-and-test` is the check that runs. Add the Semgrep command to `.circleci/config.yml` only when the task names that file. Do not add a GitHub Actions workflow to turn the scan on. Those runners do not start, and this skill does not edit workflow permissions.

## What this skill does not do

It does not print tokens that a rule matched. It does not claim a compliance certification from a rule-pack exit code. It does not rewrite an existing rules file.

## Trigger keywords

```text
semgrep, sast, static analysis, security scan, nosemgrep
```
