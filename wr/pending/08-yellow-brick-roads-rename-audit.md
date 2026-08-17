# [WR] Yellow Brick Roads — repo rename readiness audit

## Output Type

project-management-doc

## Objective

Owner intends to rename `revvel-standards` → `yellow-brick-roads` (Oz
theme). GitHub redirects git remotes and REST calls after rename, but:
Pages URL changes immediately, Vercel projects need relinking, webhooks and
CircleCI slugs may break, and many `gh api` calls hardcode
`midnghtsapphire/revvel-standards` (CLAUDE.md warns about this; the Agent
Creator catalog embeds it too). Deliver: (1) full inventory of hardcoded
repo references (workflows, scripts, docs, generated data, external
services), (2) migrate every internal reference to
`${{ github.repository }}` / config, (3) a cutover checklist ordered by
blast radius, ending with the actual rename as a one-click step.

## Definition of Done

- Zero hardcoded `midnghtsapphire/revvel-standards` in workflows/scripts
- Cutover checklist reviewed by owner before any rename happens
- External-service relink steps (Vercel, CircleCI, webhooks) enumerated
