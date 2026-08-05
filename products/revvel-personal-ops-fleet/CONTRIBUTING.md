# Contributing

## Setup

```bash
python -m pip install -e ".[dev]"     # or make setup
make test                              # offline unit suite
make demo                              # inventory + plan + dry-run + chain verify
```

Copy `config/*.example.yaml` to `config/*.yaml` for local use. Live config files are gitignored;
only examples are tracked.

## Ground rules

1. Read [AGENTS.md](AGENTS.md) first — it is the operating protocol, not a formality.
2. No secrets, real user data, memory contents, system prompts, or proprietary internals in any file.
3. No network calls in `src/`. Connectors stay skeletons until an ADR authorizes a live adapter.
4. Tests before code for anything touching policy, audit, or a connector contract.
5. Docs and `CHANGELOG.md` change in the same commit as the behavior.

## Adding a skill

1. Create `src/revvel_ops/skills/<name>.py` that returns `ActionProposal` objects with evidence.
2. Use the *pessimistic* defaults and justify each relaxation (risk tier, reversibility, external
   visibility, rollback).
3. Add a synthetic fixture under `fixtures/` — never real data.
4. Add tests covering: category determinism, protected categories, rollback presence, and that
   delete/unsubscribe proposals are never auto-allowed.
5. Register produced capabilities in `docs/skills/manifest.yaml` and document them.

## Adding a connector

See [docs/CONNECTORS.md](docs/CONNECTORS.md) §"Adding a connector". Declare every `Capability` field;
register in `connectors/registry.py`; write the rollback before the forward path.

## Changing policy

Any change to autonomy behavior, thresholds, gates, deny lists, or scopes requires:
an ADR in `docs/adr/`, a `CHANGELOG.md` entry, updated `docs/POLICY.md`, and passing tests that assert
the hard invariants still hold.

## Schemas

`schemas/*.json` are generated. Run `make schemas` after model changes; never hand-edit. Breaking
changes to a persisted object require a `schema_version` bump.

## Commit style

`<area>: <imperative summary>` — e.g. `policy: gate rollback-less mutations at R070`. Keep commits
scoped; include the test that proves the change.

## Review checklist

- [ ] Offline: no network, no credentials, no external mutation
- [ ] Fails closed on unknown input
- [ ] Rollback documented and reachable
- [ ] Audit event added for any new decision point
- [ ] Docs + schemas + changelog + ownership updated
