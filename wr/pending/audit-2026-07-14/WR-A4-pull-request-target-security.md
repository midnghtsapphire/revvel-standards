# [WR] P1 — 13 workflows use pull_request_target: privilege-escalation surface

## Title
[WR] Audit and harden all pull_request_target workflows (extends issue-15831)

## Description
**Problem.** 13 workflows trigger on `pull_request_target`, which runs with write-token + secrets against untrusted fork PR metadata. Combined with auto-approve/auto-merge workflows present in this repo, a crafted external PR could chain to self-merge.

**Fix.** For each of the 13: (1) downgrade to `pull_request` unless write context is truly required; (2) if required, never check out PR head with secrets in env; pin `ref` to base; (3) require label-gate (`safe-to-run`) before executing; (4) pin all third-party actions to full SHA (see WR-A6).

**Acceptance.** Zero workflows check out untrusted code under pull_request_target; documented matrix in standards/ security file; issue-15831 closed.

## Agent learning note
`pull_request_target` is the single most exploited GitHub Actions misconfiguration. Rule of thumb the fleet should memorize: *untrusted code and secrets never share a job.*

Assignee: Dragnet (security persona) | Labels: P1, security
