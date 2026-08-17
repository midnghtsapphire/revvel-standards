# Greenfield UI → revvel-standards integration

Product-local summary. Canonical long-form report:
[`wr/greenfield-ui-research.md`](../../../wr/greenfield-ui-research.md).

## Source

- Repo: <https://github.com/rgn/greenfield-ui>
- Stars: **0** (as of 2026-08-08)
- Stack: Angular 5 + Angular Material + Bootstrap 3 + Hyperledger Composer REST
- Last push: 2018-01-28
- License: Apache-2.0 (package.json)

## What we incorporated

| Original pattern | Lab implementation |
| --- | --- |
| `IdeaState` FRESH/INWORK/FINISHED | `app/data/greenfield.ts` + three board columns |
| `PersonalWallet.days` | Wallet panel + donate/release |
| `IdeaLike` / `IdeaFollow` | Toggle buttons on cards |
| `ideaStateFilter` pipe | `filterIdeasByState()` |
| Card chips (days, adapters, likes, follows) | Tailwind chips on `IdeaCard` |
| Composer REST `DataService` | Local immutable store (export JSON/MD) |

## What we deliberately did not incorporate

- Angular runtime or NgModules
- `composer-client` / `composer-rest-server` (EOL / archived)
- Bootstrap 3 + jQuery
- Hard-coded `http://localhost:3000/api/`

## Recommended next steps (optional)

1. Promote board primitives into a shared `packages/ui` when ≥3 products need them.
2. Map WR labels (`wr:fresh` style) onto column states for an ops dashboard.
3. Add Polar.sh CTA once the board becomes a paid “idea → WR” funnel.
