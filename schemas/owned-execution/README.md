# Owned execution shared contracts 1.0.0

Stateless Python types/checks and source schemas only. **Not** a DB repository,
provider registry, API server, scheduler, migration runner or sandbox. The control
lane applies the authoritative migration without copying/redefining it; the other
lanes use scoped HTTP/MCP methods rather than direct control SQL credentials.

## Import and validation

From the repository root, with Python 3.10+ and installed setuptools:

```sh
python3 -m pip install --no-deps ./schemas/owned-execution
PYTHONDONTWRITEBYTECODE=1 PYTHONPATH=schemas/owned-execution \
  python3 -m unittest discover -s schemas/owned-execution/tests -p 'test_*.py' -v
node --test schemas/owned-execution/tests/schema.test.cjs
python3 -m flake8 schemas/owned-execution --max-line-length=120
```

Package: `owned-execution-contracts==1.0.0`; import
`from owned_execution_contracts import Claim, Receipt, ProviderAdapter`.
`PYTHONPATH` above is only an offline test shortcut, not the production import
strategy. No hyphenated directory is a Python package name. Wire messages have
`kind` and `contract_version`; immutable Python DTOs omit those two envelope
fields. All numeric times in shared DTO/schema are UTC Unix seconds; SQL stores
UTC DATETIME(6). Token hashes only persist; wire lease tokens are never logged.

JSON schema checks structure; policy functions additionally check authenticated
DB-derived admission, scopes, provider eligibility and leases. They do not verify
token signatures, query DB state, implement network egress controls, apply
untrusted patches or prove semantic safety. Call them only after wire validation
and with fresh trusted repository inputs inside the control transaction.

## MySQL migration and tests

The migration targets MySQL 8.0.16+ (CHECK constraints enforced), InnoDB, strict SQL
mode, UTC and `utf8mb4_bin` ID collation. Apply to a database with that default
collation; service startup verifies it. Record checksum in `oe_schema_migrations`
only after successful completion. MySQL DDL implicitly commits: a partial apply
requires inspection/resume from the last completed statement, not blind reruns,
`IF NOT EXISTS` concealment or destructive rollback. No legacy tables altered,
no providers seeded/enabled. Migration credentials never go to workers/visitors.

The optional local DB test requires an **already migrated disposable** database
named `oe_contract` inside a local, no-network container named
`bitchslapper-contract-mysql`. It uses synthetic transaction-rolled-back rows and
refuses to address any other database. It is not a production DB setup command.

```sh
OWNED_CONTRACT_MYSQL_TEST=1 PYTHONDONTWRITEBYTECODE=1 \
  PYTHONPATH=schemas/owned-execution python3 -m unittest discover \
  -s schemas/owned-execution/tests -p 'mysql_contract.py' -v
```

Contract migration verified locally on MySQL 8.0.40. Broader service integration,
parallel claim/switch tests and tenant-isolation security testing belong to the
implementation lanes; SQLite or in-memory dicts cannot substitute for them.

See [architecture](../../docs/architecture/bitchslapper/README.md),
[interfaces](../../docs/architecture/bitchslapper/interfaces.md) and
[admission](../../docs/architecture/bitchslapper/safety-and-admission.md).
