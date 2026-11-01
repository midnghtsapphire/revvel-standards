# Architecture contract validation receipt

Date: 2026-11-01. Scope: architecture/shared-contract specialist only.
Branch: `devin/1793555903-bitchslapper-contract` based on pushed parent commit
`74a9c0979148ae2fed3e94bcee35516437ad30a4` (ancestry checked).

## Passing focused checks

| Check | Observed result | Receipt |
| --- | --- | --- |
| Offline Python policy/preservation/provenance | 20 independent tests pass | `receipts/python-contracts-final.txt` |
| Strict Ajv 2020-12 JSON schema | 4 tests pass | `receipts/json-schema-contracts-final.txt` |
| Actual MySQL 8.0.40 | Both migrations applied; 31 InnoDB tables; 13 negative/positive tests pass | `receipts/mysql-contracts-final.txt` |
| Flake8 assigned scope | No findings | `receipts/flake8-final.txt` |
| Markdownlint assigned docs | No findings | `receipts/focused-markdownlint.txt` |
| Wheel install/import | `owned-execution-contracts==1.0.0`, imports from installed target work | `receipts/package-install-final.txt` |
| Diff whitespace | `git diff --check` passes | Local command |

MySQL ran in a disposable local container, network disabled, no host port,
UTC/strict mode/utf8mb4_bin. No production database or third-party service was
mutated. Test fixtures run in rolled-back transactions; no SQL inventory seed
or enabled provider was added. The first Python run inherited duplicate tests;
the final 20 count removes that duplication. Initial schema strict-type and
lint findings were fixed, not suppressed. Initial pip built UNKNOWN with the
older system tooling; additive `setup.cfg` compatibility metadata fixed the
verified wheel name/import. Historical receipts remain intact, not false green.

## Root baseline failures retained, not waived

- System Node 20 cannot expand the root test glob. Used installed Node 22.12.0
  (the repo requires >=22) rather than changing the test command.
- Node 22 root suite: **1424 pass / 1426**, two failing tests: Markdown gate and
  Python baseline gate. Markdown includes pre-existing `AGENTS.md` MD029 numbering
  violations. No root governance text was changed to hide them.
- The final standalone flake8 baseline receipt shows **only**
  `workflows/bitchslapper.py` E501/F821 on this parent snapshot. Parent confirmed
  its separate correction; no parent commit was rewritten/cherry-picked here.
  Our focused lint is clean. No baseline or gate configuration was weakened.
- Root build/typecheck invokes `tsc -p tsconfig.json` and fails at unchanged
  `scripts/openrouter-routing.js:265`: missing required `model` property.
  Diff against the parent confirms that file and `AGENTS.md` are untouched.
- See root test, standalone baseline and typecheck raw receipts. Early root runs
  also exposed local new lint findings; those were corrected and rechecked.

## Explicit limits for integration

These checks prove executable contracts and real MySQL constraints, not a live
authenticated control server, real offline model output, native Octopus UI,
network egress sandbox, permissioned device bridge, or 200-worker production
capacity. The four lanes own those implementations and their integration tests.
No browser/UI tests, paid calls, new services, secrets, PR or merge occurred.
Legacy BNAT named imprint remains known=false/imprinted=false, distinct from
its passing energy-0 consistency check at epsilon 1e-9.

Blank whitespace-only lines in captured root test output were normalized to
empty lines for the cumulative diff whitespace gate; diagnostic text is retained.

Authoritative migration SHA-256:

```text
0001_owned_execution.sql 8c74527fec340c517402e90f783f6a7221d2580293925136eb796dbd7dbd67e7
0002_patch_submissions.sql cb7c45aa08be22fd1f8ed378137c678b26d62c06bd3a6cd9c4388290336d3a72
```

Pinned upstream license SHA-256:
`1df7dfc4fe6bd844ed10ed20ca71bb895af73cd1ca52c86bb9bc08ddb3fc2cdb`.
Pinned compose SHA-256:
`d66dc75f39230df411c35e9657f28fd1b2b055f207629e01af4ade62c77dcedb`.
