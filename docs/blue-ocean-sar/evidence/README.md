# Shared evidence library

One evidence format for every tool in `docs/blue-ocean-sar/` and `docs/hfmr/`.
It fixes finding C5 in [`SYSTEM_REVIEW.md`](../SYSTEM_REVIEW.md) and implements
upgrade R1 (signatures and RFC 3161 timestamps). Importers for the six older
formats prepare M1, so those formats can be read, checked and moved into this one.

Each log is an append-only JSON-lines file. Every entry hashes all of its
metadata and the previous entry's hash. Entries can be signed with an Ed25519
operator key. The chain head can be timestamped by a third-party Time-Stamp
Authority (TSA) under RFC 3161. A court-mode check refuses to pass unless the
head was fixed outside the machine.

Nothing in this folder changes an existing tool. Adopting it in `fetch.py`,
`columbus_records.py`, `authority.py`, `ring_export.py`, `records_adapter.py`,
the Rust crate and HFMR is a separate step.

## Quick start

Run these from `docs/blue-ocean-sar/`. You need Python 3.10+, the
`cryptography` package and the `openssl` command.

```bash
# 1. Make an operator key pair. Keep the private key off shared machines.
python3 -m evidence keygen --private ~/keys/jsmith.key --public jsmith.pub

# 2. Capture. The operator is required (--operator or EVIDENCE_OPERATOR).
export EVIDENCE_OPERATOR="Det. J. Smith, badge 1234"
python3 -m evidence capture --log case-014 --key ~/keys/jsmith.key \
  --url https://gis.columbus.gov/arcgis/rest/services?f=json
python3 -m evidence capture --log case-014 --key ~/keys/jsmith.key \
  --file scan-0001.pdf --kind records-response --source "Franklin County Recorder"

# 3. Print the head, then record it somewhere you do not control (see below).
python3 -m evidence head --log case-014

# 4. Get an RFC 3161 token over the head.
python3 -m evidence timestamp --log case-014 --tsa-ca /etc/ssl/certs/ca-certificates.crt

# 5. Verify. Court mode needs --expect-head or a CA-verified token over the head.
python3 -m evidence verify --log case-014 --public-key jsmith.pub \
  --court --tsa-ca /etc/ssl/certs/ca-certificates.crt
```

You can also run `python3 docs/blue-ocean-sar/evidence/cli.py ...` from anywhere.

Exit codes for every command:

| Code | Meaning |
| --- | --- |
| 0 | The postcondition holds: the capture was stored, the token was issued, or the log verified. |
| 1 | It does not: verification failed, no TSA answered, or the fetch failed. |
| 2 | Bad input: missing arguments or files, an unreadable key, or no operator. |

## What is in a log

```text
case-014/evidence.jsonl                       one canonical JSON entry per line
case-014/objects/000000_<sha256>.bin          captured bytes, read-only, never overwritten
case-014/head_000001_<head>_0.tsq / .tsr      RFC 3161 request and token for a head
case-014/head_000001_<head>_0.tsr.json        informational sidecar (TSA URL, times)
```

Each entry holds:

| Field | Content |
| --- | --- |
| `format` | `revvel-evidence/1` |
| `seq` | 0, 1, 2 and so on, with no gaps |
| `utc` | timezone-aware capture time, with microseconds |
| `operator` | who captured it (required) |
| `host` | the capture machine's host name |
| `tool` | name, version, `git_commit` and `git_dirty` of the capturing tool |
| `clock` | `ntp_synchronized` is `yes`, `no` or `unknown` (from `timedatectl`) |
| `kind`, `source` | what it is and where it came from (URL, path, device, person) |
| `status`, `server_date` | HTTP status and the server's `Date` header, when captured over HTTP |
| `tls_cert_sha256` | SHA-256 of the TLS peer certificate (DER), when captured over HTTPS |
| `sha256`, `size`, `file` | content hash, byte count and stored path |
| `extra` | caller metadata (hashed too) |
| `key_id` | SHA-256 of the signer's raw public key, or `null` for an unsigned log |
| `prev_hash` | the previous entry's `entry_hash` (64 zeros for the first) |
| `entry_hash` | SHA-256 of the canonical JSON of every field above |
| `signature` | Ed25519 over `entry_hash`, base64, or `null` |

Canonical JSON means sorted keys, no whitespace, UTF-8 and no NaN. Each line on
disk must be exactly the canonical form, so even a re-serialised line is
flagged.

Stored file names are `<seq>_<sha256>.bin`. `seq` is assigned under a file
lock, so two captures in the same second (even of identical bytes) get
different names. Files are created exclusively and set read-only. An existing
name is never overwritten, so the append fails instead.

## Signing

`keygen` writes the private key as PKCS#8 PEM with mode 0600. It refuses to
overwrite either file. To encrypt the key, pass `--passphrase-file` (or set
`EVIDENCE_KEY_PASSPHRASE`). A passphrase is never accepted on the command line.
A private key that other users can read is refused at load time.

Signing is optional for each log, but all or nothing:

- A log started with a key must sign every entry with that same key.
- A log started without one can never be signed later.
- `verify` flags a log that mixes the two.

Verification needs only the public key. Pass it with `--public-key`. Every
entry must then carry that key's `key_id` and a valid signature.

## RFC 3161 timestamps

`timestamp` builds a `TimeStampReq` with `openssl ts -query`. The SHA-256
imprint is the head's `entry_hash`, with a nonce and a request for the TSA
certificate. It posts the request to each TSA in turn until one answers:

- `http://timestamp.digicert.com`
- `https://freetsa.org/tsr`

Use `--tsa URL` (repeatable) to choose your own. The reply must be "granted"
and carry the same imprint. With `--tsa-ca`, the reply is also verified with
`openssl ts -verify` against the request, which checks the nonce, imprint and
signature chain. The token is then stored next to the log.

`verify` reads the imprint from every `head_*.tsr` and looks for it among the
recomputed entry hashes. It does not trust file names or sidecars.

- **Token matches an entry.** The token proves that entry, and every entry
  before it, existed no later than the TSA's time.
- **Token matches no entry.** The log was rewritten after it was stamped, so
  verification fails.
- **TSA time well before the entry's own `utc`.** The capture machine's clock
  was fast. This is a warning.

To check tokens cryptographically, give `--tsa-ca`:

| TSA | CA to use |
| --- | --- |
| DigiCert | Chains to a public root, so the system bundle works. |
| FreeTSA | Publishes its own `cacert.pem`. |

The tests run the whole query, reply and verify path offline. They use a
throwaway CA and TSA certificate with `openssl ts -reply`, served over local
HTTP.

## Verification and court mode

`verify` checks the following:

- It recomputes every `entry_hash` and every `prev_hash` link. This catches an
  edited entry and any edited metadata field. It also catches a missing,
  inserted, duplicated or reordered entry.
- It checks every signature against `--public-key`. This catches a log that was
  re-chained without the key.
- It re-hashes every stored file and checks its size. It reports a stored file
  that is missing, altered or not listed in the log.
- It checks that every entry has an operator and a timezone-aware time. It
  warns when the time goes backwards or the clock was not known to be
  NTP-synchronised.
- With `--expect-head`, it checks the head against a value recorded elsewhere.
  This is the only way to detect truncation: removing the last entries leaves a
  shorter chain that is still valid.

`--court` also requires one of these:

- `--expect-head`, matching the final head; or
- an RFC 3161 token whose imprint is the final head and which verifies against
  `--tsa-ca`.

If the log is signed, court mode also needs `--public-key`. An unsigned log that
was stripped and re-chained passes a plain `verify`, but it can never pass court
mode, because its head no longer matches the anchor.

## What each guarantee proves, and what it does not

| Guarantee | Proves | Does not prove |
| --- | --- | --- |
| Hash chain | Nothing was edited, inserted, removed or reordered since the entry was written, as long as the head is known. | Anything, if an attacker can rewrite the whole file and nobody kept the head. |
| Ed25519 signature | Whoever holds the private key wrote every entry. A forger without the key cannot re-chain the log. | Who held the key. A stolen or shared key signs as well. |
| RFC 3161 token | The head, and every entry before it, existed no later than the TSA's time. | When each entry was really captured. `utc` remains the capture machine's claim. |
| Expected head held elsewhere | The log has not been truncated, extended or rewritten since that record. | Anything about entries added after that record. |
| `server_date`, TLS fingerprint | What the server and the TLS endpoint presented. | That the server told the truth. Behind an intercepting proxy, the fingerprint is the proxy's certificate. |
| Operator, host, tool, clock | What the capturing machine said about itself. | Anything independent: these are claims, made binding by the signature. |

**Integrity and time of existence are not truth.** A perfectly verified log
proves that these bytes were captured from this source by this key-holder before
this time, and have not changed since. It does not prove that the content is
accurate, complete or authentic. It does not prove that the source was the
right one, or that a record names the right person. Corroborate the content
separately.

## Anchoring the head outside the machine

A hash chain kept on one machine can be rebuilt by anyone who controls that
machine. Fix the head somewhere the capture host cannot later change:

1. **RFC 3161 token.** Run `timestamp` after each capture session. Use two TSAs
   for important sessions.
2. **Write it down.** Put `evidence head` output in the case notes, an email to
   the case agent, the chain-of-custody form or the property-room log.
3. **WORM or another custodian.** Copy the head (or the whole directory) to
   write-once storage, or to a second person or agency that signs for it.
4. **Hand over the public key separately.** Give `--public-key` to the reviewer
   through a different channel from the evidence itself.

Then verify with `--expect-head` (or the token) in court mode.

## Importing the older formats

`import` re-verifies an older evidence set by that format's own rule, reads the
bytes from disk, and lists which guarantees it lacks. Add `--into DIR` to copy a
verified set into a shared log. Each legacy entry, its claimed time and the
legacy head are kept in `extra`, and the new entry is hashed and signed. A set
that fails verification is never imported.

```bash
python3 -m evidence import realdata/out/run_20261016T120000Z --expect-head <head>
python3 -m evidence import path/to/ring/out --into case-014 --key ~/keys/jsmith.key
```

| Format | Source | Re-verified | Main gaps |
| --- | --- | --- | --- |
| `fetch-sidecars` | `opendata/fetch.py` | Body against its sidecar's SHA-256 | No chain; metadata not hashed; same-second captures overwrite each other; no operator, signature, time or TLS data |
| `rust-manifest` | `opendata-rs` `evidence.rs` | Chain and entry hashes (serde field order), objects | No operator, signature, trusted time, Date header or TLS data; no expected head |
| `authority-chain` | `opendata/authority.py` `ChainLog` | Chain and hashes, timezone-aware `ts` | Not signed; no trusted time; entries without an actor are counted |
| `ring-manifest` | `opendata/ring_export.py` | Chain, recordings, unlisted `.mp4` files | No operator, signature or trusted time; no expected head |
| `columbus` | `realdata/columbus_records.py` | File chain, `file_count`, `chain_head`, unlisted files | The chain covers only file hashes: URL, status, time and top-level fields can be edited undetected |
| `hfmr-ledger` | `docs/hfmr/hfmr.py` `Ledger` | Chain and hashes | No time at all, no operator, not signed |

The format is detected automatically. Use `--format` to force it.

## Limits

- **Truncation.** Removing the last entries cannot be detected without an
  outside head or a token over the newer head.
- **Key compromise.** A stolen private key can sign a forged re-chain. Keep keys
  offline, and anchor the head so a forgery still fails court mode.
- **Local claims.** `utc`, `host`, `operator` and `clock` are local claims.
  `clock` reports `unknown` when `timedatectl` is not available, as in
  containers.
- **No redirects.** `fetch_https` does not follow redirects. The 3xx response is
  captured as itself, with its `Location` in `extra`.
- **One writer at a time.** The file lock is POSIX `flock`. Use one writer per
  log on network filesystems.
- **Object left by a crash.** If the process dies between storing an object and
  writing its log line, the object is reported as "not in the log". The next
  append of that sequence number fails rather than overwrite it, so it must be
  reviewed by hand.
- **C2PA not covered.** C2PA manifests for images and dossiers (the other half of
  R1) are not part of this library.

## Tests

```bash
cd docs/blue-ocean-sar/evidence && python3 -m unittest -v
cd /home/user/revvel-standards && python3 -m flake8 --config .flake8 docs/blue-ocean-sar/evidence/
```

The tests cover the following, all offline:

- edits to every metadata field;
- forgeries that re-chain the log, re-sign it with another key, or strip its
  signatures;
- missing, extra, duplicated and reordered entries, and truncation;
- unique names for captures in the same second, and refusal to overwrite;
- key file modes and passphrases;
- court mode with and without an anchor;
- HTTPS capture with a TLS fingerprint against a local server;
- the full RFC 3161 round trip against a local TSA;
- each importer, using fixtures written by the real producing modules and one
  real `evidence.rs` manifest line.
