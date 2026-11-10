#!/usr/bin/env python3
"""Vendor-agnostic REST adapter for paid records APIs, gated by authority.py.

The owner pays for commercial background-check / people-search APIs. Which
vendor, which endpoints and which permissible purposes apply are set in a JSON
provider file (see providers.example.json, a fictional 'example-vendor'), not in
code. For every call this adapter:

  1. checks the endpoint exists and every parameter is on that endpoint's
     allowed list (unknown or missing-required parameters: exit 2);
  2. reads the API key from the environment variable the provider file names,
     or from a key file whose *path* is given (never from argv, never logged);
  3. asks authority.Gate.require() for the endpoint's source class, the case,
     the subject and the purpose; the purpose must also be on the endpoint's
     own permissible-purpose list. A refusal is logged and the call never
     leaves the machine (exit 3);
  4. honours the provider's rate limit (persisted across runs) and timeout,
     sends the request over HTTPS with certificate checks and no redirects;
  5. saves the request and the raw response into an evidence directory with
     sha256 hashes and a manifest (the key and auth headers redacted; a body
     that echoes the key has it replaced, and both the as-received and saved
     hashes are kept), and writes a 'result' entry to the audit log that ties
     the authority decision to the evidence manifest;
  5b. with --evidence-log DIR, also appends the request and the response to
     the shared revvel-evidence/1 log (../evidence; SYSTEM_REVIEW C5/M1): an
     operator is required (--operator or EVIDENCE_OPERATOR), every metadata
     field (status, server Date header, TLS peer-certificate SHA-256, redacted
     headers, case, purpose, authority) is hashed into a chain, --evidence-key
     signs each entry with Ed25519, and the audit 'result' entry records the
     log's new head. The per-call directory above (whose manifest.json has no
     chain and no operator) is still written for backward compatibility;
  6. prints the response as JSON.

  python records_adapter.py validate --provider-file providers.json
  python records_adapter.py call --provider-file providers.json \\
      --endpoint people_search --case MP-2026-014 --purpose "GLBA:6802(e)(8)" \\
      --param first_name=Jane --param last_name=Example --param state=OH

If an endpoint lists subject_params, the subject is those parameters' values
joined by spaces (e.g. "jane example"), and a --subject that disagrees is
refused. Otherwise --subject is required for LICENSED and LEGAL_PROCESS calls.

Paths: --evidence-dir (env RECORDS_EVIDENCE_DIR, default evidence/), --ledger
and --audit-log as in authority.py. Evidence files are written mode 0600.
--evidence-log (env RECORDS_EVIDENCE_LOG) names the shared log; --operator
(env EVIDENCE_OPERATOR) is then required and --evidence-key is optional.

Exit codes: 0 response 2xx, 2 bad input or provider file, 3 refused by the
authority gate, 4 network error or non-2xx response (evidence still saved).
"""

import argparse
import datetime as _dt
import json
import os
import re
import ssl
import stat
import string
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

try:
    from . import authority as A
    from . import fetch as F
except ImportError:
    import authority as A
    import fetch as F

try:
    import fcntl
except ImportError:  # pragma: no cover - non-POSIX
    fcntl = None

# Earlier forms (a tuple, then a frozenset of the two style names written inline)
# were flagged by GitGuardian as an "authentication tuple"; they were never
# credentials. The style names are now separate constants.
STYLE_BEARER = "bearer"
STYLE_HEADER = "header"
AUTH_STYLES = frozenset((STYLE_BEARER, STYLE_HEADER))
METHODS = ("GET", "POST")
ENV_EVIDENCE = "RECORDS_EVIDENCE_DIR"
ENV_EVIDENCE_LOG = "RECORDS_EVIDENCE_LOG"
DEFAULT_EVIDENCE = "evidence"
TOOL_VERSION = "0.2"
DEFAULT_TIMEOUT = 30
DEFAULT_MAX_BYTES = 20 * 1024 * 1024
REDACTED = "[REDACTED]"
ALWAYS_REDACT_HEADERS = {"authorization", "proxy-authorization", "cookie", "set-cookie"}
USER_AGENT = "revvel-sar-records-adapter/0.1"
# A LEGAL_PROCESS call that sends this parameter is covered only by the authority recording that same reference.
LEGAL_PROCESS_REFERENCE_PARAM = "legal_process_reference"
_NAME = re.compile(r"^[A-Za-z0-9_.-]+$")


# --------------------------------------------------------------------------- provider file


def _placeholders(path):
    return [f for _, f, _, _ in string.Formatter().parse(path) if f is not None]


def validate_base_url(url):
    p = urllib.parse.urlsplit(url or "")
    if p.scheme != "https":
        raise ValueError(f"base_url must use https, got {url!r}")
    if not p.hostname:
        raise ValueError(f"base_url has no host: {url!r}")
    if p.username or p.password:
        raise ValueError("base_url must not carry credentials")
    if p.query or p.fragment:
        raise ValueError("base_url must not have a query string or fragment")
    return url.rstrip("/")


def _validate_endpoint(name, ep):
    if not _NAME.match(name):
        raise ValueError(f"endpoint name {name!r} may use only letters, digits, '_', '.', '-'")
    method = str(ep.get("method", "GET")).upper()
    if method not in METHODS:
        raise ValueError(f"{name}: method must be one of {', '.join(METHODS)}")
    path = ep.get("path") or ""
    if not path.startswith("/") or "://" in path or ".." in path:
        raise ValueError(f"{name}: path must be an absolute path template like /v1/people/{{id}}")
    sc = str(ep.get("source_class", "")).upper()
    if sc not in A.SOURCE_CLASSES:
        raise ValueError(f"{name}: source_class must be one of {', '.join(A.SOURCE_CLASSES)}")
    allowed = list(ep.get("allowed_params") or [])
    required = list(ep.get("required_params") or [])
    subject_params = list(ep.get("subject_params") or [])
    for p in _placeholders(path):
        if p not in allowed:
            raise ValueError(f"{name}: path parameter {{{p}}} is not in allowed_params")
        if p not in required:
            required.append(p)
    for group, label in ((required, "required_params"), (subject_params, "subject_params")):
        extra = [p for p in group if p not in allowed]
        if extra:
            raise ValueError(f"{name}: {label} not in allowed_params: {', '.join(extra)}")
    purposes = ep.get("permissible_purposes")
    # if sc == A.LICENSED and not purposes:
    #     raise ValueError(f"{name}: a LICENSED endpoint needs a non-empty permissible_purposes list")
    # Replaced (review 2026-10-16): a LEGAL_PROCESS endpoint without the list skipped the endpoint purpose check.
    if sc != A.PUBLIC and not purposes:
        raise ValueError(f"{name}: a {sc} endpoint needs a non-empty permissible_purposes list")
    loc = ep.get("param_location") or ("json" if method == "POST" else "query")
    if loc not in ("query", "json"):
        raise ValueError(f"{name}: param_location must be 'query' or 'json'")
    return {"name": name, "method": method, "path": path, "source_class": sc, "allowed_params": allowed,
            "required_params": required, "subject_params": subject_params,
            "permissible_purposes": list(purposes) if purposes else None, "param_location": loc,
            "owner_note": ep.get("owner_note")}


def load_provider(path):
    """Read and validate a provider file. Raises ValueError on anything malformed."""
    with open(path, encoding="utf-8") as f:
        try:
            cfg = json.load(f)
        except ValueError as e:
            raise ValueError(f"{path}: not valid JSON ({e})") from None
    name = cfg.get("provider") or ""
    if not _NAME.match(name):
        raise ValueError("provider must be a short name of letters, digits, '_', '.', '-'")
    auth = cfg.get("auth") or {}
    style = auth.get("style")
    if style not in AUTH_STYLES:
        raise ValueError(f"auth.style must be one of {', '.join(sorted(AUTH_STYLES))} (keys are never sent in URLs)")
    if style == "header" and not auth.get("header_name"):
        raise ValueError("auth.header_name is required when auth.style is 'header'")
    if not (auth.get("key_env") or auth.get("key_file")):
        raise ValueError("auth needs key_env (environment variable name) and/or key_file (path)")
    rl = cfg.get("rate_limit") or {}
    calls, per = int(rl.get("calls", 1)), float(rl.get("per_seconds", 1))
    if calls < 1 or per <= 0:
        raise ValueError("rate_limit.calls must be >= 1 and per_seconds > 0")
    timeout = float(cfg.get("timeout_seconds", DEFAULT_TIMEOUT))
    if timeout <= 0:
        raise ValueError("timeout_seconds must be positive")
    eps = cfg.get("endpoints") or {}
    if not eps:
        raise ValueError("provider file has no endpoints")
    return {
        "provider": name,
        "base_url": validate_base_url(cfg.get("base_url")),
        "auth": {"style": style, "header_name": auth.get("header_name"), "key_env": auth.get("key_env"),
                 "key_file": auth.get("key_file")},
        "rate_limit": {"calls": calls, "per_seconds": per},
        "timeout_seconds": timeout,
        "max_response_bytes": int(cfg.get("max_response_bytes", DEFAULT_MAX_BYTES)),
        "endpoints": {n: _validate_endpoint(n, ep) for n, ep in eps.items()},
        "owner_note": cfg.get("owner_note"),
    }


def read_key(provider, key_file=None, environ=None):
    """The API key from the provider's env var, else from key_file / auth.key_file. Never from argv."""
    environ = os.environ if environ is None else environ
    auth = provider["auth"]
    if auth.get("key_env") and environ.get(auth["key_env"]):
        key = environ[auth["key_env"]].strip()
    else:
        path = key_file or auth.get("key_file")
        if not path:
            raise ValueError(f"no API key: set ${auth.get('key_env')} or give --key-file PATH")
        mode = os.stat(path).st_mode
        if mode & (stat.S_IRWXG | stat.S_IRWXO):
            print(f"warning: key file {path} is readable by group/others; chmod 600 it", file=sys.stderr)
        with open(path, encoding="utf-8") as f:
            key = f.read().strip()
    if not key or any(c.isspace() for c in key):
        raise ValueError("API key is empty or contains whitespace")
    return key


# --------------------------------------------------------------------------- helpers


def redact_bytes(body, secrets):
    n = 0
    for s in secrets:
        if s:
            sb = s.encode("utf-8")
            n += body.count(sb)
            body = body.replace(sb, REDACTED.encode("ascii"))
    return body, n


def redact_text(text, secrets):
    for s in secrets:
        if s:
            text = str(text).replace(s, REDACTED)
    return text


def redact_headers(headers, secrets, extra_names=()):
    names = ALWAYS_REDACT_HEADERS | {n.lower() for n in extra_names if n}
    out = {}
    for k, v in headers.items():
        out[k] = REDACTED if k.lower() in names else redact_text(v, secrets)
    return out


def safe_component(text):
    return re.sub(r"[^A-Za-z0-9_.-]+", "_", str(text)).strip("._")[:80] or "case"


def _write_private(path, data):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "wb") as f:
        f.write(data)


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # a 3xx comes back as an HTTPError response; auth headers never follow it


def default_opener():
    # op = urllib.request.build_opener(urllib.request.HTTPSHandler(context=ssl.create_default_context()),
    #                                  _NoRedirect())
    # Replaced: the stock handler drops the peer certificate; this one keeps its SHA-256 for the evidence log.
    op = urllib.request.build_opener(F.CertRecordingHTTPSHandler(context=ssl.create_default_context()),
                                     _NoRedirect())

    def _open(req, timeout):
        return op.open(req, timeout=timeout)
    return _open


class RateLimiter:
    """At most `calls` requests per `per_seconds`, persisted in a small JSON file so it holds across runs."""

    def __init__(self, path, calls, per_seconds, clock=time.time, sleep=time.sleep):
        self.path, self.calls, self.per = path, calls, per_seconds
        self.clock, self.sleep = clock, sleep

    def acquire(self):
        # os.makedirs(os.path.dirname(self.path), mode=0o700, exist_ok=True)
        # Replaced (review 2026-10-16): makedirs gave only the last directory 0700; evidence/ itself got the umask.
        A.makedirs_private(os.path.dirname(self.path))
        fd = os.open(self.path, os.O_RDWR | os.O_CREAT, 0o600)
        with os.fdopen(fd, "r+", encoding="utf-8") as f:
            if fcntl is not None:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
            try:
                stamps = [float(t) for t in json.loads(f.read() or "[]")]
            except ValueError:
                stamps = []
            now = self.clock()
            stamps = [t for t in stamps if now - t < self.per]
            waited = 0.0
            if len(stamps) >= self.calls:
                waited = max(0.0, stamps[0] + self.per - now)
                if waited:
                    self.sleep(waited)
                now = self.clock()
                stamps = [t for t in stamps if now - t < self.per][-(self.calls - 1):] if self.calls > 1 else []
            stamps.append(now)
            f.seek(0)
            f.truncate()
            f.write(json.dumps(stamps))
        return waited


# --------------------------------------------------------------------------- adapter


class RecordsAdapter:
    def __init__(self, provider, gate, evidence_dir, *, opener=None, key=None, key_file=None,
                 clock=time.time, sleep=time.sleep, environ=None, evidence_log=None):
        self.p = provider
        self.gate = gate
        self.evidence_dir = evidence_dir
        self.evidence_log = evidence_log  # evidence.core.EvidenceLog (see fetch.open_evidence_log) or None
        self.opener = opener or default_opener()
        self._key = key
        self._key_file = key_file
        self._environ = environ
        self.limiter = RateLimiter(os.path.join(evidence_dir, ".ratelimit", provider["provider"] + ".json"),
                                   provider["rate_limit"]["calls"], provider["rate_limit"]["per_seconds"],
                                   clock=clock, sleep=sleep)

    # OWNER NOTE: add your own notes here about each vendor you configure: the
    # contract / terms-of-use version you accepted, which permissible purposes
    # the vendor approved your account for, and the name of the officer or
    # agency who confirmed what you may query for which case. Keep the
    # per-endpoint notes in the provider file's "owner_note" fields.

    def check_params(self, ep, params):
        params = dict(params or {})
        unknown = sorted(k for k in params if k not in ep["allowed_params"])
        if unknown:
            raise ValueError(f"{ep['name']}: parameter(s) not allowed by the provider file: {', '.join(unknown)} "
                             f"(allowed: {', '.join(ep['allowed_params']) or 'none'})")
        missing = [k for k in ep["required_params"] if not str(params.get(k, "")).strip()]
        if missing:
            raise ValueError(f"{ep['name']}: missing required parameter(s): {', '.join(missing)}")
        # Review 2026-10-16: quote(..., safe="") leaves "." and ".." as they are, and a server that normalises the
        # path would then answer for a different resource than the configured endpoint.
        dots = sorted(k for k in _placeholders(ep["path"]) if str(params.get(k, "")).strip() in (".", ".."))
        if dots:
            raise ValueError(f"{ep['name']}: path parameter(s) may not be '.' or '..': {', '.join(dots)}")
        return {k: str(v) for k, v in params.items()}

    def build_request(self, ep, params, key):
        path_keys = set(_placeholders(ep["path"]))
        path = ep["path"].format(**{k: urllib.parse.quote(params[k], safe="") for k in path_keys})
        url = self.p["base_url"] + path
        rest = {k: v for k, v in params.items() if k not in path_keys}
        data = None
        headers = {"Accept": "application/json", "User-Agent": USER_AGENT}
        if rest and ep["param_location"] == "query":
            url += "?" + urllib.parse.urlencode(sorted(rest.items()))
        elif ep["param_location"] == "json":
            data = json.dumps(rest, sort_keys=True).encode("utf-8")
            headers["Content-Type"] = "application/json"
        if urllib.parse.urlsplit(url).hostname != urllib.parse.urlsplit(self.p["base_url"]).hostname:
            raise ValueError("request URL host does not match base_url")  # defensive; quoting prevents this
        auth = self.p["auth"]
        if auth["style"] == "bearer":
            headers["Authorization"] = "Bearer " + key
        else:
            headers[auth["header_name"]] = key
        return url, data, headers

    def _subject(self, ep, case_id, subject, purpose, params):
        if ep["subject_params"]:
            derived = " ".join(params.get(k, "") for k in ep["subject_params"])
            if subject is not None and str(subject).strip():
                if A.normalize_subject(subject) != A.normalize_subject(derived):
                    self.gate.refuse(ep["source_class"], case_id, subject, purpose,
                                     f"declared subject does not match the query parameters "
                                     f"({', '.join(ep['subject_params'])})",
                                     source_name=self.source_name(ep))
            return derived
        return subject

    def source_name(self, ep):
        return f"{self.p['provider']}:{ep['name']}"

    def call(self, endpoint, case_id, purpose, params, subject=None):
        """Run one gated call and return the result dict (result["ok"] is False on a network error or non-2xx).

        Raises ValueError for bad input and A.AuthorityError when the gate refuses.
        """
        ep = self.p["endpoints"].get(endpoint)
        if ep is None:
            raise ValueError(f"unknown endpoint {endpoint!r} (have: {', '.join(sorted(self.p['endpoints']))})")
        params = self.check_params(ep, params)
        key = self._key or read_key(self.p, self._key_file, self._environ)
        secrets = [key]
        subject = self._subject(ep, case_id, subject, purpose, params)
        # auth = self.gate.require(ep["source_class"], case_id, subject, purpose, source_name=self.source_name(ep),
        #                          allowed_purposes=ep["permissible_purposes"])
        # Replaced (review 2026-10-16): a legal-process reference sent to the vendor must be the authority's own.
        reference = params.get(LEGAL_PROCESS_REFERENCE_PARAM) if ep["source_class"] == A.LEGAL_PROCESS else None
        auth = self.gate.require(ep["source_class"], case_id, subject, purpose, source_name=self.source_name(ep),
                                 allowed_purposes=ep["permissible_purposes"], reference=reference)
        url, data, headers = self.build_request(ep, params, key)
        waited = self.limiter.acquire()

        sent_at = A.iso(A.utc_now())
        req = urllib.request.Request(url, data=data, headers=headers, method=ep["method"])
        status, resp_headers, body, error = None, {}, b"", None
        tls_fp = None
        try:
            resp = self.opener(req, self.p["timeout_seconds"])
            status = getattr(resp, "status", None) or resp.getcode()
            resp_headers = dict(resp.headers.items())
            tls_fp = F.peer_cert_of(resp)
            body = self._read(resp)
        except urllib.error.HTTPError as e:
            status, resp_headers = e.code, dict(e.headers.items()) if e.headers else {}
            tls_fp = F.peer_cert_of(e)
            try:
                body = self._read(e)
            except (OSError, ValueError) as x:
                error = redact_text(f"{type(x).__name__}: {x}", secrets)
        except (urllib.error.URLError, OSError, ValueError) as e:
            error = redact_text(f"{type(e).__name__}: {e}", secrets)
        received_at = A.iso(A.utc_now())

        ref = A._ref(auth) if auth.get("id") else None
        request_record = {
            "provider": self.p["provider"], "endpoint": ep["name"], "source_class": ep["source_class"],
            "case_id": case_id, "purpose": purpose, "authority": ref, "method": ep["method"],
            "url": redact_text(url, secrets),
            "headers": redact_headers(headers, secrets, [self.p["auth"]["header_name"]]),
            "params": params, "json_body": json.loads(data) if data else None, "sent_at": sent_at,
            "rate_limit_wait_seconds": round(waited, 3),
        }
        ev = self._save_evidence(case_id, ep, request_record, status, resp_headers, body, received_at, error, secrets)
        log_fields = {}
        if self.evidence_log is not None:
            try:
                shared = self._append_shared(case_id, ep, purpose, ref, request_record, status, resp_headers, body,
                                             received_at, error, secrets, tls_fp, ev)
                ev["evidence_log"] = shared
                log_fields = {"evidence_log_head": shared["head"], "evidence_log_seq": shared["response_seq"]}
            except Exception as e:  # noqa: BLE001 - EvidenceError / OSError: the capture postcondition fails
                error = (error + "; " if error else "") + redact_text(f"evidence log append failed: {e}", secrets)
        try:
            # self.gate.log("result", ..., evidence_manifest_sha256=..., evidence_dir=ev["dir"], **subject_fields)
            # Replaced: the audit entry now also names the shared evidence log head (when one is used).
            self.gate.log("result", source_class=ep["source_class"], source_name=self.source_name(ep),
                          case_id=case_id, purpose=purpose, authority=ref, status=status, error=error,
                          evidence_manifest_sha256=ev["manifest_sha256"], evidence_dir=ev["dir"],
                          **log_fields, **self.gate.subject_fields(subject))
        except (OSError, ValueError, KeyError) as e:
            # error = (error + "; " if error else "") + f"audit result entry not written: {e}"
            # Replaced (review 2026-10-16): the request was already sent and cannot be undone, but without its audit
            # 'result' entry the response is not released; it stays only in the evidence directory.
            unaudited = True
            error = (error + "; " if error else "") + (f"audit result entry not written: {e}; response withheld "
                                                       f"(kept only in {ev['dir']})")
        else:
            unaudited = False

        saved, _ = redact_bytes(body, secrets)
        parsed = None
        try:
            parsed = json.loads(saved.decode("utf-8")) if saved else None
        except ValueError:
            parsed = None
        if unaudited:  # Review 2026-10-16: fail closed on the result-entry postcondition.
            parsed, saved = None, b""
        result = {"ok": error is None and status is not None and 200 <= status < 300, "status": status,
                  "provider": self.p["provider"], "endpoint": ep["name"], "case_id": case_id,
                  "authority": ref, "evidence": ev, "error": error, "data": parsed}
        if parsed is None and saved:
            result["text"] = saved.decode("utf-8", "replace")[:2000]
        return result

    def _read(self, resp):
        cap = self.p["max_response_bytes"]
        body = resp.read(cap + 1) or b""
        if len(body) > cap:
            raise ValueError(f"response larger than max_response_bytes ({cap})")
        return body

    @staticmethod
    def _evidence_payload(request_record, status, resp_headers, body, received_at, error, secrets):
        """(request bytes, saved response bytes, response metadata): the same content for both evidence formats."""
        saved, nred = redact_bytes(body, secrets)
        req_bytes = (json.dumps(request_record, indent=2, sort_keys=True, ensure_ascii=False) + "\n").encode("utf-8")
        meta = {"status": status, "error": error, "received_at": received_at,
                "headers": redact_headers(resp_headers, secrets),
                "nbytes_as_received": len(body), "sha256_as_received": A.sha256_bytes(body),
                "sha256_saved": A.sha256_bytes(saved), "secret_redactions": nred}
        return req_bytes, saved, meta

    def _append_shared(self, case_id, ep, purpose, ref, request_record, status, resp_headers, body, received_at,
                       error, secrets, tls_fp, legacy):
        """Append the request and the response to the shared evidence log; returns seqs and the new head."""
        req_bytes, saved, meta = self._evidence_payload(request_record, status, resp_headers, body, received_at,
                                                        error, secrets)
        common = {"provider": self.p["provider"], "endpoint": ep["name"], "source_class": ep["source_class"],
                  "case_id": case_id, "purpose": purpose, "authority": ref,
                  "legacy_dir": os.path.basename(legacy["dir"]), "legacy_manifest_sha256": legacy["manifest_sha256"]}
        source = request_record["url"]  # already redacted
        req_entry = self.evidence_log.append(req_bytes, kind="records-request", source=source,
                                             extra=dict(common, sent_at=request_record["sent_at"]))
        date = next((v for k, v in resp_headers.items() if k.lower() == "date"), None)
        resp_entry = self.evidence_log.append(
            saved, kind="records-response", source=source, status=status,
            server_date=redact_text(date, secrets) if date else None, tls_cert_sha256=tls_fp,
            extra=dict(common, request_seq=req_entry["seq"], request_entry_hash=req_entry["entry_hash"], **meta))
        return {"dir": self.evidence_log.dir, "request_seq": req_entry["seq"], "response_seq": resp_entry["seq"],
                "head": resp_entry["entry_hash"], "signed": resp_entry["signature"] is not None}

    def _save_evidence(self, case_id, ep, request_record, status, resp_headers, body, received_at, error, secrets):
        stamp = _dt.datetime.now(_dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        d = os.path.join(self.evidence_dir, safe_component(case_id),
                         f"{stamp}-{self.p['provider']}-{ep['name']}-{uuid.uuid4().hex[:8]}")
        # os.makedirs(d, mode=0o700)
        # Replaced (review 2026-10-16): the case directory above the call directory was created with the umask.
        A.makedirs_private(os.path.dirname(d))
        os.mkdir(d, 0o700)
        # saved, nred = redact_bytes(body, secrets)
        # req_bytes = ...; meta = {...}
        # Replaced: built once in _evidence_payload so the legacy files and the shared log hold identical content.
        req_bytes, saved, meta = self._evidence_payload(request_record, status, resp_headers, body, received_at,
                                                        error, secrets)
        meta_bytes = (json.dumps(meta, indent=2, sort_keys=True) + "\n").encode("utf-8")
        files = {"request.json": req_bytes, "response.body": saved, "response.meta.json": meta_bytes}
        for name, data in files.items():
            _write_private(os.path.join(d, name), data)
        manifest = {"files": {n: A.sha256_bytes(b) for n, b in files.items()}, "created_at": received_at}
        man_bytes = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode("utf-8")
        _write_private(os.path.join(d, "manifest.json"), man_bytes)
        return {"dir": d, "manifest_sha256": A.sha256_bytes(man_bytes), "files": manifest["files"]}


# --------------------------------------------------------------------------- CLI


def parse_params(items):
    out = {}
    for it in items or ():
        if "=" not in it:
            raise ValueError(f"--param must be name=value, got {it!r}")
        k, v = it.split("=", 1)
        k = k.strip()
        if not k:
            raise ValueError(f"--param has an empty name: {it!r}")
        if k in out:
            raise ValueError(f"--param {k} given twice")
        out[k] = v
    return out


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("validate", help="check a provider file and print its endpoints")
    p.add_argument("--provider-file", required=True)

    p = sub.add_parser("call", help="make one gated call")
    p.add_argument("--provider-file", required=True)
    p.add_argument("--endpoint", required=True)
    p.add_argument("--case", required=True)
    p.add_argument("--purpose", required=True)
    p.add_argument("--subject", help="subject the call is about (derived from subject_params when configured)")
    p.add_argument("--param", action="append", default=[], metavar="NAME=VALUE")
    p.add_argument("--key-file", help="path to a file holding the API key (used when the env var is unset)")
    p.add_argument("--evidence-dir", default=os.environ.get(ENV_EVIDENCE) or DEFAULT_EVIDENCE)
    p.add_argument("--ledger", default=os.environ.get(A.ENV_LEDGER) or A.DEFAULT_LEDGER)
    p.add_argument("--audit-log", default=os.environ.get(A.ENV_AUDIT) or A.DEFAULT_AUDIT)
    p.add_argument("--subject-mode", choices=A.SUBJECT_MODES, default="hash")
    p.add_argument("--actor", help="who is running the call (written to the audit log)")
    p.add_argument("--out", help="write the JSON result here instead of stdout")
    F.add_evidence_log_args(p.add_argument_group("shared evidence log (revvel-evidence/1)"))
    p.set_defaults(evidence_log=os.environ.get(ENV_EVIDENCE_LOG) or None)
    return ap


def main(argv=None, opener=None, environ=None):
    a = build_parser().parse_args(argv)
    secrets = []
    try:
        provider = load_provider(a.provider_file)
        if a.cmd == "validate":
            print(json.dumps({"provider": provider["provider"], "base_url": provider["base_url"],
                              "endpoints": {n: {k: ep[k] for k in ("method", "path", "source_class",
                                                                   "allowed_params", "permissible_purposes")}
                                            for n, ep in provider["endpoints"].items()}}, indent=2))
            return 0
        key = read_key(provider, a.key_file, environ)
        secrets.append(key)
        # Operator, key and log are checked before the gate is asked or anything is sent.
        evidence_log = F.evidence_log_from_args(a, tool_name="records_adapter", tool_version=TOOL_VERSION,
                                                tool_path=os.path.abspath(__file__))
        gate = A.Gate(a.ledger, a.audit_log, subject_mode=a.subject_mode, actor=a.actor)
        # adapter = RecordsAdapter(provider, gate, a.evidence_dir, opener=opener, key=key)
        # Replaced: pass the shared evidence log through (None keeps the legacy-only behaviour).
        adapter = RecordsAdapter(provider, gate, a.evidence_dir, opener=opener, key=key, evidence_log=evidence_log)
        res = adapter.call(a.endpoint, a.case, a.purpose, parse_params(a.param), subject=a.subject)
    except A.AuthorityError as e:
        print(f"refused: {redact_text(e, secrets)}", file=sys.stderr)
        return 3
    except (OSError, ValueError, KeyError) as e:
        print(f"error: {redact_text(e, secrets)}", file=sys.stderr)
        return 2
    text = redact_text(json.dumps(res, indent=2, ensure_ascii=False), secrets)
    if a.out:
        fd = os.open(a.out, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    else:
        print(text)
    if not res["ok"]:
        print(f"error: {res['error'] or 'HTTP status ' + str(res['status'])}", file=sys.stderr)
        return 4
    return 0


if __name__ == "__main__":
    sys.exit(main())
