#!/usr/bin/env python3
"""Authorization ledger and access gate for restricted records sources.

Missing-person work can touch three kinds of data, and each needs something
different on file before a connector may query it:

  PUBLIC         open data. No gate; every call is still written to the audit
                 log.
  LICENSED       paid data released under a permissible purpose (for example a
                 GLBA or DPPA purpose, or an FCRA purpose where the product is a
                 consumer report). Needs a recorded authority for the case that
                 names the permissible purpose(s) the call is made under, the
                 subjects/identifiers in scope and an expiry date.
  LEGAL_PROCESS  data that needs a search warrant, court order, subpoena or the
                 subject's written consent. Needs a recorded authority with the
                 reference number, issuing court/agency, issue date, expiry,
                 scope text, the subjects/identifiers in scope, the requesting
                 officer and agency, and the sha256 of the scanned document.
                 Optionally countersigned by a second named person (--countersign);
                 --require-countersign (env AUTHORITY_REQUIRE_COUNTERSIGN=1) makes
                 the countersignature mandatory when recording and when gating.

Every authority records who entered it (--recorded-by, or --actor / env
AUTHORITY_ACTOR), and every gate call records who made it (Gate(actor=...),
--actor or AUTHORITY_ACTOR); a gate with no actor refuses every call.

Connectors call require(source_class, case_id, subject, purpose). It returns the
covering authority, or raises AuthorityError (CLI exit 3) unless a current,
unexpired, in-scope, non-revoked authority exists for that case. A subject not
on the authority's subject list is refused even when the case matches. Every
allowed and refused call is written to an audit log.

Both the ledger and the audit log are append-only JSON-lines files with a hash
chain: each entry carries the hash of the previous entry and its own sha256 over
its canonical JSON. `verify` recomputes the chain and reports any edited,
deleted, inserted or reordered entry. A chain cannot show that its *last*
entries were cut off, so `verify` prints each file's head hash and entry count:
record those somewhere outside this machine (case notes, an email to the
agency) and pass them back with --expect-ledger-head / --expect-audit-head.

  export AUTHORITY_ACTOR="Analyst B. Example"
  python authority.py add-authority --class LICENSED --case MP-2026-014 \\
      --purpose "GLBA:6802(e)(8)" --agency "Example County Sheriff" \\
      --officer "Det. A. Example" --subject "Jane Q Example" --expires 2026-12-31
  python authority.py add-authority --class LEGAL_PROCESS --case MP-2026-014 \\
      --process-type warrant --reference SW-2026-0193 --issuer "Example County Court" \\
      --issued 2026-10-01 --expires 2026-10-31 --scope "Subscriber records ..." \\
      --subject "Jane Q Example" --officer "Det. A. Example" \\
      --agency "Example County Sheriff" --document scans/SW-2026-0193.pdf \\
      --countersign "Sgt. C. Example"
  python authority.py list --case MP-2026-014
  python authority.py check --source LEGAL_PROCESS --case MP-2026-014 --subject "Jane Q Example"
  python authority.py revoke --id AUTH-... --reason "warrant returned" --by "owner"
  python authority.py verify

Paths: --ledger (env AUTHORITY_LEDGER, default authority_ledger.jsonl) and
--audit-log (env AUTHORITY_AUDIT_LOG, default authority_audit.jsonl). Files are
created with mode 0600. Subjects are written to the audit log as an
HMAC-SHA256 keyed by env AUTHORITY_SUBJECT_SALT (at least 16 characters, kept
off this machine's logs and out of the case file). A gate in the default hash
mode refuses to start without it: a plain SHA-256 of a name or phone number is
reversible by guessing. Callers that want the identifier itself in the log must
say so with subject_mode="plain" (--subject-mode plain in records_adapter.py).

Exit codes: 0 ok / covered, 1 integrity check failed, 2 bad input,
3 refused / not covered.

This tool records and enforces what the owner has been told is authorised. It
does not decide what the law permits; see AUTHORITY.md.
"""

import argparse
import datetime as _dt
import hashlib
import hmac
import json
import os
import re
import sys
import uuid

try:
    import fcntl
except ImportError:  # pragma: no cover - non-POSIX
    fcntl = None

PUBLIC = "PUBLIC"
LICENSED = "LICENSED"
LEGAL_PROCESS = "LEGAL_PROCESS"
SOURCE_CLASSES = (PUBLIC, LICENSED, LEGAL_PROCESS)
PROCESS_TYPES = ("warrant", "court_order", "subpoena", "consent")

# OWNER NOTE: permissible-purpose labels are free text so they can match the
# wording your vendor contracts and the agency use. These are examples only;
# replace or extend them with the purposes your vendor has approved you for and
# that law enforcement has confirmed. They are shown by `list-purposes`.
EXAMPLE_PURPOSES = {
    "GLBA:6802(e)(8)": "GLBA exception: to comply with law / properly authorised investigation or subpoena",
    "GLBA:6802(e)(3)": "GLBA exception: to protect against or prevent actual or potential fraud",
    "DPPA:2721(b)(1)": "DPPA: use by a government agency, incl. law enforcement, or on its behalf",
    "DPPA:2721(b)(4)": "DPPA: in connection with a civil or criminal proceeding / investigation for one",
    "DPPA:2721(b)(8)": "DPPA: use by a licensed private investigative agency for a DPPA purpose",
}

GENESIS = "0" * 64
ENV_LEDGER = "AUTHORITY_LEDGER"
ENV_AUDIT = "AUTHORITY_AUDIT_LOG"
ENV_SALT = "AUTHORITY_SUBJECT_SALT"
ENV_ACTOR = "AUTHORITY_ACTOR"
ENV_REQUIRE_COUNTERSIGN = "AUTHORITY_REQUIRE_COUNTERSIGN"
MIN_SALT_CHARS = 16
EMPTY_SHA256 = hashlib.sha256(b"").hexdigest()
DEFAULT_LEDGER = "authority_ledger.jsonl"
DEFAULT_AUDIT = "authority_audit.jsonl"
SUBJECT_MODES = ("hash", "plain")
_HEX64 = re.compile(r"^[0-9a-f]{64}$")


class AuthorityError(Exception):
    """No current authority covers the request. The CLI exits 3."""


class LedgerIntegrityError(AuthorityError):
    """The ledger's hash chain does not verify, so it cannot grant anything."""


# --------------------------------------------------------------------------- helpers


def utc_now():
    return _dt.datetime.now(_dt.timezone.utc)


def iso(t):
    return t.astimezone(_dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_when(text, end_of_day=False):
    """Parse YYYY-MM-DD or an ISO datetime with a UTC offset into an aware UTC datetime.

    A bare date means the start of that day UTC, or with end_of_day the last
    second of it (so an expiry date is valid through that whole day, UTC).
    A datetime without an offset is refused: an expiry must not shift with the
    machine's local time zone.
    """
    text = (text or "").strip()
    if not text:
        raise ValueError("empty date")
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        d = _dt.date.fromisoformat(text)
        t = _dt.datetime(d.year, d.month, d.day, tzinfo=_dt.timezone.utc)
        return t + _dt.timedelta(days=1, seconds=-1) if end_of_day else t
    try:
        t = _dt.datetime.fromisoformat(text)
    except ValueError:
        raise ValueError(f"not a date or ISO datetime: {text!r}") from None
    if t.tzinfo is None:
        raise ValueError(f"datetime {text!r} has no UTC offset; add Z or +hh:mm")
    return t.astimezone(_dt.timezone.utc)


def normalize_subject(s):
    """Case- and whitespace-insensitive form used to compare subjects."""
    out = " ".join(str(s or "").split()).casefold()
    if not out:
        raise ValueError("empty subject")
    return out


def _norm_person(p):
    return " ".join(str(p or "").split()).casefold()


def env_flag(name, environ=None):
    """True when env var name is set to 1/true/yes/on (case-insensitive)."""
    return str((environ if environ is not None else os.environ).get(name, "")).strip().lower() in (
        "1", "true", "yes", "on")


def _norm_purpose(p):
    return " ".join(str(p or "").split()).casefold()


def _norm_reference(r):
    return " ".join(str(r or "").split()).casefold()


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def makedirs_private(path):
    """Create path and any missing parents with mode 0700. Directories that already exist are left as they are.

    os.makedirs(path, mode=0o700) applies the mode only to the last directory;
    the parents it creates get the umask default (often 0755).
    """
    path = os.path.abspath(path)
    missing = []
    while not os.path.isdir(path):
        missing.append(path)
        parent = os.path.dirname(path)
        if parent == path:
            break
        path = parent
    for d in reversed(missing):
        try:
            os.mkdir(d, 0o700)
        except FileExistsError:
            if not os.path.isdir(d):
                raise


def entry_hash(entry):
    body = {k: v for k, v in entry.items() if k != "hash"}
    return sha256_bytes(canonical(body).encode("utf-8"))


def source_in_scope(source_name, allowed):
    """True when allowed is empty, or source_name equals an entry or sits under one.

    "example-vendor" covers "example-vendor:people_search"; the reverse is not true.
    """
    if not allowed:
        return True
    if not source_name:
        return False
    return any(source_name == s or source_name.startswith(s + ":") for s in allowed)


# --------------------------------------------------------------------------- hash-chained log


class ChainLog:
    """Append-only JSON-lines file in which every entry hashes the one before it."""

    def __init__(self, path):
        self.path = path

    def _lock(self, f):
        if fcntl is not None:
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)

    def append(self, body, now=None):
        """Append one entry (dict) and return it with seq, ts, prev and hash filled in."""
        d = os.path.dirname(os.path.abspath(self.path))
        # os.makedirs(d, exist_ok=True)
        # Replaced (review 2026-10-16): new directories for the ledger / audit log were created with the umask default.
        makedirs_private(d)
        fd = os.open(self.path, os.O_RDWR | os.O_CREAT | os.O_APPEND, 0o600)
        with os.fdopen(fd, "r+", encoding="utf-8") as f:
            self._lock(f)
            f.seek(0)
            lines = [ln for ln in f.read().splitlines() if ln.strip()]
            prev, seq = GENESIS, 0
            if lines:
                last = json.loads(lines[-1])
                prev, seq = last["hash"], int(last["seq"])
            entry = {"seq": seq + 1, "ts": iso(now or utc_now())}
            entry.update(body)
            entry["prev"] = prev
            entry["hash"] = entry_hash(entry)
            f.seek(0, os.SEEK_END)
            f.write(canonical(entry) + "\n")
            f.flush()
            os.fsync(f.fileno())
        return entry

    def entries(self):
        if not os.path.exists(self.path):
            return []
        with open(self.path, encoding="utf-8") as f:
            return [json.loads(ln) for ln in f.read().splitlines() if ln.strip()]

    def verify(self, expect_head=None, expect_count=None):
        """Return {"ok", "count", "head", "problems"} after recomputing the whole chain."""
        problems = []
        prev, count = GENESIS, 0
        if os.path.exists(self.path):
            with open(self.path, encoding="utf-8") as f:
                lines = f.read().splitlines()
            for lineno, line in enumerate(lines, 1):
                if not line.strip():
                    problems.append(f"line {lineno}: blank line")
                    continue
                try:
                    e = json.loads(line)
                except ValueError:
                    problems.append(f"line {lineno}: not JSON")
                    prev = None
                    continue
                count += 1
                if not isinstance(e, dict) or "hash" not in e:
                    problems.append(f"line {lineno}: no hash field")
                    prev = None
                    continue
                if e.get("seq") != count:
                    problems.append(f"line {lineno}: seq {e.get('seq')} where {count} expected "
                                    "(entry deleted, inserted or reordered)")
                if prev is not None and e.get("prev") != prev:
                    problems.append(f"line {lineno}: prev hash does not match the entry before it "
                                    "(entry deleted, inserted or reordered)")
                if entry_hash(e) != e["hash"]:
                    problems.append(f"line {lineno}: content does not match its hash (entry edited)")
                prev = e["hash"]
        head = prev if count else GENESIS
        if expect_count is not None and count != int(expect_count):
            problems.append(f"{count} entries where {expect_count} expected (entries removed or added)")
        if expect_head is not None and head != expect_head:
            problems.append(f"head hash {head} does not match the expected {expect_head} "
                            "(log truncated, extended or rewritten)")
        return {"path": self.path, "ok": not problems, "count": count, "head": head, "problems": problems}


# --------------------------------------------------------------------------- ledger


def _clean_list(values):
    out = []
    for v in values or ():
        v = " ".join(str(v).split())
        if v and v not in out:
            out.append(v)
    return out


def build_authority(source_class, case_id, *, purposes=(), subjects=(), sources=(), process_type=None,
                    reference=None, issuer=None, issued=None, expires=None, scope=None,
                    requesting_officer=None, agency=None, document_sha256=None, document_name=None,
                    notes=None, recorded_by=None, countersigned_by=None, require_countersign=None):
    """Validate the fields for one authority and return the record to store (without id).

    recorded_by is required for every class. LICENSED also needs subjects and an
    expiry (SYSTEM_REVIEW H2). countersigned_by, when given, must name a second
    person; require_countersign (default: env AUTHORITY_REQUIRE_COUNTERSIGN) makes
    it mandatory for LEGAL_PROCESS.
    """
    if require_countersign is None:
        require_countersign = env_flag(ENV_REQUIRE_COUNTERSIGN)
    sc = (source_class or "").strip().upper()
    if sc not in SOURCE_CLASSES:
        raise ValueError(f"source class must be one of {', '.join(SOURCE_CLASSES)}")
    if sc == PUBLIC:
        raise ValueError("PUBLIC sources need no authority; nothing to record")
    case_id = (case_id or "").strip()
    if not case_id:
        raise ValueError("case id is required")
    rec = {
        "source_class": sc,
        "case_id": case_id,
        "purposes": _clean_list(purposes),
        "subjects": _clean_list(subjects),
        "sources": _clean_list(sources),
        "requesting_officer": (requesting_officer or "").strip() or None,
        "agency": (agency or "").strip() or None,
        "notes": (notes or "").strip() or None,
        "recorded_by": (recorded_by or "").strip() or None,
        "countersigned_by": " ".join(str(countersigned_by or "").split()) or None,
    }
    if not rec["recorded_by"]:
        raise ValueError("recorded_by is required: name who is entering this authority "
                         "(--recorded-by, --actor or env AUTHORITY_ACTOR)")
    if rec["countersigned_by"] and _norm_person(rec["countersigned_by"]) == _norm_person(rec["recorded_by"]):
        raise ValueError("the countersignature must come from a second person, not the one recording it")
    for s in rec["subjects"]:
        normalize_subject(s)
    t_issued = parse_when(issued) if issued else None
    t_expires = parse_when(expires, end_of_day=True) if expires else None
    if t_issued and t_expires and t_expires <= t_issued:
        raise ValueError("expiry must be after the issue date")
    rec["issued"] = iso(t_issued) if t_issued else None
    rec["expires"] = iso(t_expires) if t_expires else None

    if sc == LICENSED:
        if not rec["purposes"]:
            raise ValueError("LICENSED authority needs at least one permissible purpose (--purpose)")
        # SYSTEM_REVIEW H2: a LICENSED authority with no subjects covered anyone, and with no expiry, forever.
        missing = [n for n, ok in (("--subject", rec["subjects"]), ("--expires", rec["expires"])) if not ok]
        if missing:
            raise ValueError("LICENSED authority is missing " + ", ".join(missing)
                             + " (it must name who it covers and when it ends)")
        return rec

    missing = [name for name, v in (("--process-type", process_type), ("--reference", reference),
                                    ("--issuer", issuer), ("--issued", issued), ("--expires", expires),
                                    ("--scope", scope), ("--officer", requesting_officer),
                                    ("--agency", agency), ("--document", document_sha256))
               if not (v or "").strip()]
    if not rec["subjects"]:
        missing.append("--subject")
    if require_countersign and not rec["countersigned_by"]:
        missing.append("--countersign (required by --require-countersign / AUTHORITY_REQUIRE_COUNTERSIGN)")
    if missing:
        raise ValueError("LEGAL_PROCESS authority is missing " + ", ".join(missing))
    pt = process_type.strip().lower().replace("-", "_").replace(" ", "_")
    if pt not in PROCESS_TYPES:
        raise ValueError(f"process type must be one of {', '.join(PROCESS_TYPES)}")
    digest = document_sha256.strip().lower()
    if not _HEX64.match(digest):
        raise ValueError("document sha256 must be 64 hex characters")
    if digest == EMPTY_SHA256:
        raise ValueError("the document is empty; record the scanned order itself")
    rec.update(process_type=pt, reference=reference.strip(), issuer=issuer.strip(), scope=scope.strip(),
               document_sha256=digest, document_name=document_name)
    return rec


def authority_status(rec, now):
    """'revoked', 'not_yet_valid', 'expired' or 'current'."""
    if rec.get("revoked"):
        return "revoked"
    if rec.get("issued") and now < parse_when(rec["issued"]):
        return "not_yet_valid"
    if rec.get("expires") and now > parse_when(rec["expires"]):
        return "expired"
    return "current"


class Ledger:
    """The authority ledger: 'add' and 'revoke' entries in a ChainLog."""

    def __init__(self, path):
        self.log = ChainLog(path)

    @property
    def path(self):
        return self.log.path

    def add(self, rec, now=None):
        rec = dict(rec)
        rec["id"] = "AUTH-" + uuid.uuid4().hex[:16]
        self.log.append({"op": "add", "authority": rec}, now=now)
        return rec

    def revoke(self, authority_id, reason, by=None, now=None):
        reason = (reason or "").strip()
        if not reason:
            raise ValueError("a revocation needs a reason")
        if not (by or "").strip():
            raise ValueError("a revocation needs the name of who revoked it (--by, --actor or AUTHORITY_ACTOR)")
        auths = self.authorities()
        if authority_id not in auths:
            raise ValueError(f"no authority with id {authority_id!r}")
        if auths[authority_id].get("revoked"):
            raise ValueError(f"{authority_id} is already revoked")
        return self.log.append({"op": "revoke", "authority_id": authority_id, "reason": reason,
                                "by": (by or "").strip() or None}, now=now)

    def authorities(self, verify=True):
        """Fold the ledger into {id: record}. Refuses to answer from a ledger that fails verification."""
        if verify:
            v = self.log.verify()
            if not v["ok"]:
                raise LedgerIntegrityError("authority ledger failed verification: " + "; ".join(v["problems"]))
        out = {}
        for e in self.log.entries():
            if e.get("op") == "add":
                a = dict(e["authority"])
                a["recorded_at"] = e["ts"]
                a["revoked"] = None
                out[a["id"]] = a
            elif e.get("op") == "revoke" and e.get("authority_id") in out:
                out[e["authority_id"]]["revoked"] = {"at": e["ts"], "reason": e.get("reason"), "by": e.get("by")}
        return out

    def find(self, source_class, case_id, subject, purpose, *, source_name=None, now=None,
             require_countersign=False, reference=None):
        """Return (covering authority or None, list of reasons nothing else covered it).

        Records written before SYSTEM_REVIEW H2 (no subjects, a LICENSED one with no
        expiry, no recorded_by) never cover a call; re-record them. reference, when
        given, must equal the authority's recorded reference (warrant / order number),
        so a call that names one document cannot be covered by another.
        """
        now = now or utc_now()
        subj = normalize_subject(subject)
        purp = _norm_purpose(purpose)
        reasons = []
        candidates = [a for a in self.authorities().values() if a["source_class"] == source_class]
        if not candidates:
            return None, [f"no {source_class} authority is recorded"]
        same_case = [a for a in candidates if a["case_id"] == case_id]
        if not same_case:
            return None, [f"no {source_class} authority is recorded for case {case_id!r}"]
        for a in same_case:
            why = []
            st = authority_status(a, now)
            if st != "current":
                why.append(st.replace("_", " "))
            # if a["subjects"] and subj not in {normalize_subject(s) for s in a["subjects"]}:  # SYSTEM_REVIEW H2: an empty list covered everyone  # noqa: E501
            # Lesson: "no subject list" was treated as "no restriction", so the least specific record granted the
            # most. An empty scope field must mean "covers nothing"; a gate fails closed on missing data.
            if not a.get("subjects"):
                why.append("authority lists no subjects (recorded before subjects were required); re-record it")
            elif subj not in {normalize_subject(s) for s in a["subjects"]}:
                why.append("subject is not in the authority's scope")
            if not a.get("expires"):
                why.append("authority has no expiry (recorded before expiry was required); re-record it")
            if not a.get("recorded_by"):
                why.append("authority does not record who entered it; re-record it")
            if require_countersign and a["source_class"] == LEGAL_PROCESS and not a.get("countersigned_by"):
                why.append("not countersigned by a second person, and a countersignature is required")
            if a["purposes"] and purp not in {_norm_purpose(p) for p in a["purposes"]}:
                why.append(f"purpose {purpose!r} is not one it records ({', '.join(a['purposes'])})")
            if not source_in_scope(source_name, a["sources"]):
                why.append(f"source {source_name!r} is outside its listed sources ({', '.join(a['sources'])})")
            # Review 2026-10-16: the request's legal-process reference was not tied to the authority that allowed it.
            if reference is not None and _norm_reference(reference) != _norm_reference(a.get("reference")):
                why.append(f"reference {reference!r} is not this authority's ({a.get('reference')!r})")
            if not why:
                return a, []
            reasons.append(f"{a['id']}: " + "; ".join(why))
        return None, reasons


# --------------------------------------------------------------------------- gate


def _ref(a):
    if not a:
        return None
    return {"authority_id": a["id"], "reference": a.get("reference"), "process_type": a.get("process_type"),
            "expires": a.get("expires")}


class Gate:
    """require() for connectors, writing every decision to a hash-chained audit log."""

    def __init__(self, ledger_path=None, audit_path=None, subject_mode="hash", salt=None, actor=None, clock=None,
                 require_countersign=None):
        if subject_mode not in SUBJECT_MODES:
            raise ValueError(f"subject mode must be one of {', '.join(SUBJECT_MODES)}")
        self.ledger = Ledger(ledger_path or os.environ.get(ENV_LEDGER) or DEFAULT_LEDGER)
        self.audit = ChainLog(audit_path or os.environ.get(ENV_AUDIT) or DEFAULT_AUDIT)
        self.subject_mode = subject_mode
        self.salt = salt if salt is not None else os.environ.get(ENV_SALT)
        # SYSTEM_REVIEW H2: an unsalted SHA-256 of a name or phone number is reversible by guessing.
        if subject_mode == "hash" and len(self.salt or "") < MIN_SALT_CHARS:
            raise ValueError(f"subject hashing needs a secret salt of at least {MIN_SALT_CHARS} characters in "
                             f"env {ENV_SALT}; refusing to start (or choose subject mode 'plain' explicitly)")
        # self.actor = actor  # SYSTEM_REVIEW H2: the actor was optional; now taken from env when not given
        # Lesson: an audit log with actor=None records that access happened but not who did it, which is the
        # question a reviewer asks first. A field the log cannot answer without is required, not optional.
        self.actor = " ".join(str(actor or os.environ.get(ENV_ACTOR) or "").split()) or None
        self.require_countersign = (env_flag(ENV_REQUIRE_COUNTERSIGN) if require_countersign is None
                                    else bool(require_countersign))
        self.clock = clock or utc_now

    def subject_fields(self, subject):
        if subject is None or not str(subject).strip():
            return {"subject": None}
        if self.subject_mode == "plain":
            return {"subject": str(subject)}
        norm = normalize_subject(subject).encode("utf-8")
        # if self.salt:  # SYSTEM_REVIEW H2: hash mode now always has a salt (checked in __init__)
        # Lesson: the unsalted fallback below looked like privacy but was not: names and phone numbers are a small,
        # guessable space, so SHA-256 of one is reversed by hashing candidates. Hashing is not anonymisation.
        return {"subject_hmac_sha256": hmac.new(self.salt.encode("utf-8"), norm, hashlib.sha256).hexdigest()}
        # return {"subject_sha256": sha256_bytes(norm)}  # SYSTEM_REVIEW H2: unsalted hash was reversible

    def log(self, event, **fields):
        """Append one audit entry. Raises OSError / ValueError if it cannot be written."""
        body = {"event": event, "actor": self.actor}
        body.update(fields)
        return self.audit.append(body, now=self.clock())

    def _decide(self, decision, source_class, case_id, subject, purpose, source_name, authority, reason):
        entry = dict(source_class=source_class, source_name=source_name, case_id=case_id, purpose=purpose,
                     authority=_ref(authority), reason=reason)
        entry.update(self.subject_fields(subject))
        try:
            return self.log(decision, **entry)
        except (OSError, ValueError, KeyError) as e:
            # Fail closed: an access that cannot be logged does not happen.
            raise AuthorityError(f"audit log {self.audit.path} could not be written ({e}); refusing") from None

    def refuse(self, source_class, case_id, subject, purpose, reason, source_name=None):
        """Log a refusal and raise AuthorityError."""
        self._decide("refuse", source_class, case_id, subject, purpose, source_name, None, reason)
        raise AuthorityError(reason)

    def require(self, source_class, case_id, subject, purpose, *, source_name=None, allowed_purposes=None,
                reference=None):
        """Return the covering authority (or a PUBLIC marker), or log the refusal and raise AuthorityError.

        allowed_purposes: optional list from the caller's own configuration (an
        endpoint's permissible purposes); a purpose outside it is refused before
        the ledger is consulted. reference: the legal-process reference the call
        will send; only an authority recording that same reference covers it.
        """
        sc = (source_class or "").strip().upper()
        case_id = (case_id or "").strip()
        purpose = (purpose or "").strip()
        args = (sc or source_class, case_id, subject, purpose)
        if not self.actor:
            self.refuse(*args, f"no actor: name who is making this call (Gate(actor=...), --actor or env "
                        f"{ENV_ACTOR})", source_name)
        if sc not in SOURCE_CLASSES:
            self.refuse(*args, f"unknown source class {source_class!r}", source_name)
        if sc == PUBLIC:
            self._decide("allow", *args, source_name, None, "public source")
            return {"source_class": PUBLIC, "id": None}
        if not case_id:
            self.refuse(*args, "a case id is required", source_name)
        if subject is None or not str(subject).strip():
            self.refuse(*args, "a subject is required", source_name)
        if not purpose:
            self.refuse(*args, "a permissible purpose is required", source_name)
        if allowed_purposes is not None and _norm_purpose(purpose) not in {_norm_purpose(p) for p in allowed_purposes}:
            self.refuse(*args, f"purpose {purpose!r} is not permitted for this source "
                        f"(allowed: {', '.join(allowed_purposes) or 'none'})", source_name)
        if reference is not None and not str(reference).strip():
            self.refuse(*args, "an empty legal-process reference was given", source_name)
        try:
            # auth, reasons = self.ledger.find(sc, case_id, subject, purpose, source_name=source_name,
            #                                  now=self.clock(), require_countersign=self.require_countersign)
            # Replaced (review 2026-10-16): pass the call's legal-process reference so the authority must match it.
            auth, reasons = self.ledger.find(sc, case_id, subject, purpose, source_name=source_name, now=self.clock(),
                                             require_countersign=self.require_countersign, reference=reference)
        except (LedgerIntegrityError, ValueError, KeyError) as e:
            self.refuse(*args, f"ledger unusable: {e}", source_name)
        if auth is None:
            self.refuse(*args, "no current authority covers this call: " + " | ".join(reasons), source_name)
        self._decide("allow", *args, source_name, auth, "covered by " + auth["id"])
        return auth


def require(source_class, case_id, subject, purpose, **kw):
    """Module-level gate using the env/default ledger and audit paths. See Gate.require."""
    gate_kw = {k: kw.pop(k) for k in ("ledger_path", "audit_path", "subject_mode", "salt", "actor",
                                      "require_countersign") if k in kw}
    return Gate(**gate_kw).require(source_class, case_id, subject, purpose, **kw)


# --------------------------------------------------------------------------- CLI


def _print(obj):
    print(json.dumps(obj, indent=2, ensure_ascii=False))


def _cmd_add(a):
    doc_sha = doc_name = None
    if a.document:
        doc_sha = sha256_file(a.document)
        doc_name = os.path.basename(a.document)
    rec = build_authority(a.source_class, a.case, purposes=a.purpose, subjects=a.subject, sources=a.source_name,
                          process_type=a.process_type, reference=a.reference, issuer=a.issuer, issued=a.issued,
                          expires=a.expires, scope=a.scope, requesting_officer=a.officer, agency=a.agency,
                          document_sha256=doc_sha, document_name=doc_name, notes=a.notes,
                          recorded_by=a.recorded_by or a.actor, countersigned_by=a.countersign,
                          require_countersign=a.require_countersign or env_flag(ENV_REQUIRE_COUNTERSIGN))
    if rec.get("expires") and parse_when(rec["expires"]) < utc_now():
        raise ValueError("expiry is already in the past")
    _print(Ledger(a.ledger).add(rec))
    return 0


def _cmd_list(a):
    now = utc_now()
    rows = []
    for rec in Ledger(a.ledger).authorities().values():
        if a.case and rec["case_id"] != a.case:
            continue
        rec = dict(rec, status=authority_status(rec, now))
        if a.all or rec["status"] == "current":
            rows.append(rec)
    _print(rows)
    return 0


def _cmd_revoke(a):
    _print(Ledger(a.ledger).revoke(a.id, a.reason, a.by or a.actor))
    return 0


def _cmd_check(a):
    sc = a.source.strip().upper()
    if sc not in SOURCE_CLASSES:
        raise ValueError(f"--source must be one of {', '.join(SOURCE_CLASSES)}")
    if sc == PUBLIC:
        _print({"covered": True, "source_class": PUBLIC, "authority": None})
        return 0
    if not a.case:
        raise ValueError("--case is required for LICENSED and LEGAL_PROCESS")
    purpose = a.purpose or ""
    auth, reasons = Ledger(a.ledger).find(sc, a.case.strip(), a.subject, purpose, source_name=a.source_name,
                                          require_countersign=a.require_countersign
                                          or env_flag(ENV_REQUIRE_COUNTERSIGN))
    if sc == LICENSED and not purpose.strip():
        auth, reasons = None, ["a permissible purpose (--purpose) is required for LICENSED sources"]
    _print({"covered": auth is not None, "source_class": sc, "case_id": a.case, "authority": auth,
            "reasons": reasons})
    return 0 if auth else 3


def _cmd_verify(a):
    led = ChainLog(a.ledger).verify(a.expect_ledger_head, a.expect_ledger_count)
    aud = ChainLog(a.audit_log).verify(a.expect_audit_head, a.expect_audit_count)
    out = {"ledger": led, "audit": aud}
    # if a.check_documents:
    # Replaced (review 2026-10-16): folding a ledger that failed verification could crash on a tampered entry
    # (exit 2 instead of 1); its documents cannot be trusted to name the right files anyway.
    if a.check_documents and not led["ok"]:
        out["documents"] = {"skipped": "the ledger failed verification, so its document records are not checked"}
    elif a.check_documents:
        docs = []
        dirs = a.check_documents
        for rec in Ledger(a.ledger).authorities(verify=False).values():
            if not rec.get("document_name"):
                continue
            path = next((os.path.join(d, rec["document_name"]) for d in dirs
                         if os.path.exists(os.path.join(d, rec["document_name"]))), None)
            if path is None:
                docs.append({"authority_id": rec["id"], "document": rec["document_name"], "ok": None,
                             "note": "file not found in the given directories"})
                continue
            ok = sha256_file(path) == rec["document_sha256"]
            docs.append({"authority_id": rec["id"], "document": path, "ok": ok})
            if not ok:
                led["problems"].append(f"{rec['id']}: {path} does not match the recorded sha256")
                led["ok"] = False
        out["documents"] = docs
    out["ok"] = led["ok"] and aud["ok"]
    _print(out)
    return 0 if out["ok"] else 1


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ledger", default=os.environ.get(ENV_LEDGER) or DEFAULT_LEDGER)
    ap.add_argument("--audit-log", default=os.environ.get(ENV_AUDIT) or DEFAULT_AUDIT)
    ap.add_argument("--actor", default=os.environ.get(ENV_ACTOR),
                    help=f"who is running this command (env {ENV_ACTOR}); used for --recorded-by and --by")
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("add-authority", help="record one authority")
    p.add_argument("--class", dest="source_class", required=True, choices=[LICENSED, LEGAL_PROCESS])
    p.add_argument("--case", required=True)
    p.add_argument("--purpose", action="append", default=[], help="permissible purpose (repeatable)")
    p.add_argument("--subject", action="append", default=[], help="subject or identifier in scope (repeatable)")
    p.add_argument("--source-name", action="append", default=[],
                   help="limit to these sources, e.g. example-vendor or example-vendor:people_search (repeatable)")
    p.add_argument("--process-type", choices=PROCESS_TYPES)
    p.add_argument("--reference", help="warrant / order / subpoena / consent reference number")
    p.add_argument("--issuer", help="issuing court or agency")
    p.add_argument("--issued", help="YYYY-MM-DD or ISO datetime with offset")
    p.add_argument("--expires", help="YYYY-MM-DD (valid through that day, UTC) or ISO datetime with offset")
    p.add_argument("--scope", help="scope text as written on the document")
    p.add_argument("--officer", help="requesting officer")
    p.add_argument("--agency", help="requesting agency")
    p.add_argument("--document", help="scanned document file; its sha256 is recorded")
    p.add_argument("--notes")
    p.add_argument("--recorded-by", help="who is entering this authority (default: --actor / AUTHORITY_ACTOR)")
    p.add_argument("--countersign", metavar="NAME", help="a second named person who checked the document")
    p.add_argument("--require-countersign", action="store_true",
                   help=f"refuse LEGAL_PROCESS without --countersign (also env {ENV_REQUIRE_COUNTERSIGN}=1)")
    p.set_defaults(fn=_cmd_add)

    p = sub.add_parser("list", help="list authorities (current only unless --all)")
    p.add_argument("--case")
    p.add_argument("--all", action="store_true")
    p.set_defaults(fn=_cmd_list)

    p = sub.add_parser("revoke", help="revoke one authority")
    p.add_argument("--id", required=True)
    p.add_argument("--reason", required=True)
    p.add_argument("--by", help="who revoked it (default: --actor / AUTHORITY_ACTOR)")
    p.set_defaults(fn=_cmd_revoke)

    p = sub.add_parser("check", help="does a current authority cover this? (exit 0 yes, 3 no)")
    p.add_argument("--source", required=True, help="source class: PUBLIC, LICENSED or LEGAL_PROCESS")
    p.add_argument("--subject", required=True)
    p.add_argument("--case")
    p.add_argument("--purpose")
    p.add_argument("--source-name")
    p.add_argument("--require-countersign", action="store_true",
                   help=f"LEGAL_PROCESS must be countersigned (also env {ENV_REQUIRE_COUNTERSIGN}=1)")
    p.set_defaults(fn=_cmd_check)

    p = sub.add_parser("verify", help="verify both hash chains (exit 1 on any problem)")
    p.add_argument("--expect-ledger-head")
    p.add_argument("--expect-ledger-count", type=int)
    p.add_argument("--expect-audit-head")
    p.add_argument("--expect-audit-count", type=int)
    p.add_argument("--check-documents", nargs="+", metavar="DIR",
                   help="re-hash recorded documents found by file name in these directories")
    p.set_defaults(fn=_cmd_verify)

    p = sub.add_parser("list-purposes", help="print the example purpose labels")
    p.set_defaults(fn=lambda a: _print(EXAMPLE_PURPOSES) or 0)
    return ap


def main(argv=None):
    ap = build_parser()
    a = ap.parse_args(argv)
    try:
        return a.fn(a)
    except LedgerIntegrityError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    except AuthorityError as e:
        print(f"refused: {e}", file=sys.stderr)
        return 3
    except (OSError, ValueError, KeyError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
