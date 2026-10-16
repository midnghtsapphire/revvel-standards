# Authority gate for restricted records sources

`authority.py` and `records_adapter.py` hold the plumbing for querying paid
background-check / people-search APIs on missing-person cases. Every query must
be covered by an authority recorded in advance, and every decision is written to
a tamper-evident audit log for later review.

This tool records and enforces what the owner has been told is authorised. It
does **not** decide what the law permits, it cannot tell whether a warrant is
genuine, and recording an authority here does not create one. It is not legal
advice.

## Source classes and what each needs

| Class | Typical data | What must be on file before a call |
| --- | --- | --- |
| `PUBLIC` | Open data, public indexes | Nothing. The call is still written to the audit log. |
| `LICENSED` | Paid people-search, address history, vehicle records released under a permissible purpose | A `LICENSED` authority for the **case id** that names the **permissible purpose(s)**, the **subjects / identifiers in scope**, an **expiry date** and **who recorded it**. Optional: source list, issue date, officer and agency. |
| `LEGAL_PROCESS` | Records that need a search warrant, court order, subpoena or the subject's written consent | A `LEGAL_PROCESS` authority for the **case id** with: process type, reference number, issuing court or agency, issue date, expiry, scope text, the subjects / identifiers in scope, requesting officer, requesting agency, the sha256 of the scanned document, and who recorded it. Optional: a countersignature by a second named person, which a config flag can make mandatory. |

Every gate call also needs an **actor**: the person making the call, given as
`Gate(actor=...)`, `--actor`, or env `AUTHORITY_ACTOR`. A gate with no actor
refuses every call, `PUBLIC` included, and logs the refusal.

Each endpoint in the provider file is assigned to exactly one class. The owner
decides that assignment from the vendor's documentation and from what law
enforcement has said; the `owner_note` fields in the provider file and the
`# OWNER NOTE:` comments in the code are where those decisions are written down.

## How the gate decides

`authority.require(source_class, case_id, subject, purpose)` (or
`Gate.require` with explicit paths) runs these checks in order and stops at the
first failure. A failure is logged and raises `AuthorityError` (CLI exit 3).

1. An actor is known (see above). Without one, every call is refused.
2. The source class is known. `PUBLIC` is allowed at this point.
3. A case id, a subject and a purpose are all given.
4. The purpose is on the endpoint's own `permissible_purposes` list (the
   adapter passes that list in).
5. The authority ledger verifies (an edited or truncated-in-the-middle ledger
   grants nothing).
6. At least one authority of the same class and the same case id is:
   - not revoked;
   - already issued and not expired (a date-only expiry is valid through the
     end of that day, UTC);
   - in scope for the subject — subjects not on the authority's list are
     refused even when the case matches;
   - complete: it lists subjects, has an expiry and names who recorded it.
     Entries written before these became mandatory (the old code accepted a
     `LICENSED` authority with no subjects, which covered anyone, and no
     expiry, which covered them forever) cover nothing; revoke and re-record
     them;
   - countersigned by a second person, when the gate requires it (see below);
   - recorded for this purpose (when the authority lists purposes);
   - recorded for this source (when the authority lists sources such as
     `example-vendor` or `example-vendor:people_search`).

If the audit log cannot be written, the call is refused: an access that cannot
be logged does not happen.

The adapter adds two more checks before the gate: every query parameter must be
on the endpoint's `allowed_params` list, and when an endpoint lists
`subject_params` the subject is taken from those parameters, so a call cannot
claim one subject while querying another.

## Recording and revoking authority

```sh
export AUTHORITY_ACTOR="Analyst B. Example"   # or pass --actor on each command

# LICENSED: the permissible purpose(s) the vendor and the agency have confirmed,
# who it covers and when it ends
python3 authority.py add-authority --class LICENSED --case MP-2026-014 \
    --purpose "GLBA:6802(e)(8)" --subject "Jane Q Example" --expires 2026-12-31 \
    --agency "Example County Sheriff" \
    --officer "Det. A. Example" --notes "Confirmed by email 2026-10-02"

# LEGAL_PROCESS: one entry per warrant / order / subpoena / consent
python3 authority.py add-authority --class LEGAL_PROCESS --case MP-2026-014 \
    --process-type warrant --reference SW-2026-0193 \
    --issuer "Example County Court" --issued 2026-10-01 --expires 2026-10-31 \
    --scope "Subscriber records for the listed number, 2026-09-01 to 2026-10-01" \
    --subject "+1 555 0100" --officer "Det. A. Example" \
    --agency "Example County Sheriff" --document scans/SW-2026-0193.pdf \
    --countersign "Sgt. C. Example"

python3 authority.py list --case MP-2026-014 --all
python3 authority.py check --source LEGAL_PROCESS --case MP-2026-014 --subject "+1 555 0100"
python3 authority.py revoke --id AUTH-... --reason "warrant returned" --by owner
python3 authority.py list-purposes
```

The purpose labels are free text. `list-purposes` prints examples only;
replace them with the wording your vendor and the agency actually use.

`--recorded-by` defaults to `--actor` / `AUTHORITY_ACTOR`, and `revoke --by`
does too; both are required. An empty `--document` file is refused.

### Second-person countersignature

`--countersign NAME` records that a second, named person checked the document
and the scope before the authority was entered. The name must differ from
`--recorded-by`. To make it mandatory for `LEGAL_PROCESS`, set
`AUTHORITY_REQUIRE_COUNTERSIGN=1` (or pass `--require-countersign` to
`add-authority` and `check`, or `Gate(require_countersign=True)`): recording
then refuses an entry without it, and the gate refuses to use one.

A countersignature here is a name typed by whoever runs the command, not a
cryptographic signature: it records a claim that a second person looked, and
makes it explicit who to ask. It does not prove they did.

## Making a call

```sh
export EXAMPLE_VENDOR_API_KEY=...   # or keep it in a 0600 file and pass --key-file PATH
export AUTHORITY_SUBJECT_SALT=...   # 16+ characters, kept off the repository; the gate will not start without it
export AUTHORITY_ACTOR="Analyst B. Example"   # or pass --actor
python3 records_adapter.py validate --provider-file providers.json
python3 records_adapter.py call --provider-file providers.json \
    --endpoint people_search --case MP-2026-014 --purpose "GLBA:6802(e)(8)" \
    --param first_name=Jane --param last_name=Example --param state=OH
```

API keys are read only from the environment variable named in the provider file
or from a key file whose path is given. There is no command-line option for the
key. Keys are never written to evidence, the audit log or the output; a response
that echoes the key has it replaced with `[REDACTED]`.

Exit codes: `0` success, `1` integrity check failed (`authority.py verify`),
`2` bad input or provider file, `3` refused by the gate, `4` network error or
non-2xx response (the evidence is still saved).

## Legal and vendor obligations

The owner is responsible for following the vendor's terms and the law that
applies to each query. In particular:

- **Vendor terms.** Use each product only for the purposes your account is
  approved for, and follow the vendor's limits on storing, sharing and
  re-using results.
- **FCRA.** A product that is a consumer report may only be obtained with a
  permissible purpose under the Fair Credit Reporting Act (15 U.S.C. 1681b).
  Many people-search products are sold as *not* being consumer reports and
  must not be used for FCRA purposes such as employment, credit or tenant
  screening.
- **GLBA.** Data drawn from financial-institution sources is released only
  under the exceptions in 15 U.S.C. 6802(e); the vendor will say which one
  your account uses.
- **DPPA.** Motor-vehicle records are governed by the Driver's Privacy
  Protection Act (18 U.S.C. 2721); use one only for a permitted use under
  2721(b) that applies to you.
- **State law.** States add their own rules (motor-vehicle records, private
  investigator licensing, data-broker and privacy statutes). Check the law of
  the states involved.
- **Legal process.** A warrant, court order or subpoena authorises the agency
  that obtained it, not a private volunteer. `LEGAL_PROCESS` data should come
  through, or at the direction of, the agency holding the process. Record it
  here so the use is documented and scoped; do not use this tool to serve
  process or to obtain records independently on the strength of someone else's
  warrant.
- **Consent.** Written consent covers the person who gave it and what it
  describes. Record the scope as written and stop when it is withdrawn
  (`revoke`).

When in doubt, ask the agency's legal advisor or the vendor's compliance team
before the query, and write the answer in the authority's `--notes`.

## Files

| File | Contents |
| --- | --- |
| `authority_ledger.jsonl` | Authorities added and revoked (`--ledger`, env `AUTHORITY_LEDGER`). |
| `authority_audit.jsonl` | Every `allow` and `refuse` decision, and a `result` entry per call (`--audit-log`, env `AUTHORITY_AUDIT_LOG`). |
| `evidence/<case>/<time>-<provider>-<endpoint>-<id>/` | `request.json`, `response.body`, `response.meta.json`, `manifest.json` (`--evidence-dir`, env `RECORDS_EVIDENCE_DIR`). Always written. |
| `<log>/evidence.jsonl`, `<log>/objects/` | Optional shared evidence log (`--evidence-log`, env `RECORDS_EVIDENCE_LOG`): one `records-request` and one `records-response` entry per call. See below. |

All files are created with mode `0600` (directories `0700`). They hold
sensitive personal data: keep them on an encrypted disk, back them up, and
follow the agency's direction on retention and destruction.

Each audit entry records the UTC time, the actor, the source class and source
name, the case id, the purpose, the covering authority id and reference, the
reason, and the subject. By default the subject is stored as an HMAC-SHA256 of
its normalised form keyed by `AUTHORITY_SUBJECT_SALT`, and a gate in this mode
**refuses to start** when the salt is missing or shorter than 16 characters.
(The old fallback, a plain SHA-256 of the name, could be reversed by hashing
candidate names.) Keep the salt out of the repository and the case file, and
use the same one for a case so that entries about the same subject can still be
matched. `--subject-mode plain` (in `records_adapter.py`; `subject_mode="plain"`
in code) stores the identifier itself and needs no salt; choose it only when
the audit log stays with the agency.

## Verifying the logs

Both JSON-lines files are hash chains: each entry stores the hash of the entry
before it, and its own `hash` is the SHA-256 of its canonical JSON. Changing,
deleting, inserting or reordering any entry breaks the chain.

```sh
python3 authority.py verify
python3 authority.py verify --check-documents scans/
python3 authority.py verify --expect-ledger-head <hash> --expect-ledger-count <n> \
    --expect-audit-head <hash> --expect-audit-count <n>
```

`verify` exits `0` when both chains are intact and `1` otherwise, listing each
problem by line. A chain cannot show that its newest entries were cut off, and
someone with write access could rewrite a whole chain from scratch. So after
each working session copy the `head` and `count` values that `verify` prints
somewhere outside this machine — the case notes, or an email to the case
officer — and pass them back with the `--expect-*` options when reviewing.

`--check-documents DIR...` re-hashes each recorded warrant / order / consent
scan found by file name in those directories and compares it with the sha256
stored when the authority was added.

To check one call's evidence: the audit `result` entry carries
`evidence_manifest_sha256`; `sha256sum manifest.json` in the evidence directory
must match it, and each file listed in `manifest.json` must match its own
sha256. `response.meta.json` keeps both `sha256_as_received` and
`sha256_saved`; they differ only when the key had to be redacted from the body,
and `secret_redactions` says how many times.

That per-call `manifest.json` has no chain between calls, no operator and no
signature, and nothing outside the audit entry protects it. To fix that
(SYSTEM_REVIEW C5 and M1), add the shared evidence log from
[`../evidence`](../evidence/README.md):

```sh
export EVIDENCE_OPERATOR="Analyst B. Example"
python3 records_adapter.py call ... --evidence-log case-014 --evidence-key ~/keys/analyst.key
python3 -m evidence verify --log case-014 --public-key analyst.pub --expect-head <head>   # from docs/blue-ocean-sar/
```

- The operator is required (`--operator` or `EVIDENCE_OPERATOR`). The log,
  the key and the operator are checked before the gate is asked or anything is
  sent; a problem exits `2`.
- Each call appends two entries. `records-request` holds the redacted
  `request.json`. `records-response` holds the saved (redacted) body with the
  HTTP status, the server's `Date` header, the SHA-256 of the TLS peer
  certificate, the redacted headers, the as-received and saved hashes, the
  case, purpose, provider, endpoint and authority reference, and the hash of
  the request entry. Every field is hashed into the chain, and
  `--evidence-key` signs each entry with Ed25519.
- The audit `result` entry also records `evidence_log_head` and
  `evidence_log_seq`, so the authority decision and the shared log point at
  each other.
- If the shared log cannot be written, the call's result is not `ok` and the
  exit code is `4`.
- The per-call directory is still written, so existing reviews and the
  `evidence_manifest_sha256` check above keep working.

## Limits

- The gate trusts what is recorded. It cannot confirm that a warrant exists,
  that a purpose is truthful, or that the agency actually authorised the use.
  Any non-empty file is accepted as the "scanned document"; only its sha256 is
  kept, and nothing checks that it is a warrant.
- The actor, `recorded_by` and the countersignature are names typed by whoever
  runs the tool. Nothing authenticates them: anyone with shell access can set
  `AUTHORITY_ACTOR` to any name. They make a claim on the record that can be
  checked later, not proof of identity. Audit entries are not signed (see the
  evidence-library item C5 in `../SYSTEM_REVIEW.md`). The records adapter's
  shared evidence log can be signed with `--evidence-key`; the audit log
  cannot yet.
- The required expiry on a `LICENSED` authority is whatever date the person
  recording it types; choose the end of the vendor approval or the agency's
  direction, not an arbitrary far-off date.
- The HMAC salt protects subject hashes only while it stays secret. Anyone
  holding the salt and the audit log can test candidate names, and a lost salt
  means hashed entries can no longer be matched to new queries.
- Subject matching is exact after case and whitespace normalisation. Aliases,
  misspellings and alternative identifiers must each be listed on the
  authority.
- Endpoints without `subject_params` rely on the declared `--subject`; the
  query parameters are kept in the evidence so a reviewer can compare them.
- The hash chains make tampering evident, not impossible. Anchor the head
  hashes externally.
- Rate limiting is per provider and per evidence directory; separate evidence
  directories do not share a budget.
- Network calls use one attempt with no automatic retries and no redirects.
