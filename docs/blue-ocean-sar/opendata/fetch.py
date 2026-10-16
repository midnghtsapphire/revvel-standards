#!/usr/bin/env python3
"""Shared HTTP fetch helper for the open-data connectors.

Every connector in this folder goes through fetch() so the same rules apply to
all of them:

  * HTTPS only (one exception: traffic_cams.py may fetch a plain-http still
    image whose exact URL is listed in the public camera catalogue);
  * a per-module host allow-list, checked for the first URL and for every
    redirect hop (redirects are followed here, by hand, never by urllib);
  * a response size cap, a timeout, and a bounded number of retries with
    exponential backoff on 429 / 5xx / network errors, honouring Retry-After;
  * a polite User-Agent that names the project (and the CONTACT_EMAIL
    environment variable when it is set);
  * optional evidence capture, two formats:
      - evidence_log (CLI --evidence-log DIR): the shared revvel-evidence/1 log
        from ../evidence (SYSTEM_REVIEW C5/M1). Each response becomes one
        hash-chained entry that hashes all of its metadata: operator, host,
        tool and git commit, clock state, URL, status, the server's Date
        header, the TLS peer-certificate SHA-256 (captured by the default
        opener), redacted response headers and request body hash. Entries can
        be Ed25519-signed (--evidence-key) and stored under a unique
        <seq>_<sha256>.bin name, so two captures in one second never collide.
      - evidence_dir (CLI --evidence-dir DIR, DEPRECATED, kept unchanged for
        backward compatibility): raw bytes plus a JSON sidecar holding sha256,
        URL, UTC time and status. No chain, no operator, metadata not hashed,
        and two identical responses in the same second share one name (the
        second overwrites the first).
    Both may be given at once;
  * secrets come only from environment variables or a file whose *path* is
    given on the command line. They are never accepted as argv values, never
    logged, are redacted from every saved or logged URL, and a response body
    that contains a secret is not written to evidence (only its hash is).

Credentials sent in headers (Authorization, API-key headers) are attached only
to hosts in `auth_hosts` (default: the first request's host), so a redirect to
another host never carries them.

Tests swap the network for an injectable `opener(request, timeout)` callable
that returns a response-like object (status, headers, read(n)).

This module is named fetch.py rather than http.py on purpose: a top-level
http.py would shadow the standard library's http package (urllib.request
imports http.client) whenever this folder is on sys.path.
"""

import datetime as _dt
import email.utils
import hashlib
import http.client
import http.cookiejar
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

PROJECT = "revvel-standards blue-ocean-sar opendata"
VERSION = "0.1"
DEFAULT_TIMEOUT = 30.0
DEFAULT_MAX_BYTES = 50 * 1024 * 1024
DEFAULT_RETRIES = 3
DEFAULT_BACKOFF = 1.0
MAX_RETRY_WAIT = 120.0
MAX_REDIRECTS = 5
RETRY_STATUSES = {429, 500, 502, 503, 504}
REDIRECT_STATUSES = {301, 302, 303, 307, 308}

# Query parameters whose values are always replaced with REDACTED in any URL
# that is logged or saved. "sig" covers Azure SAS tokens (Planetary Computer).
SENSITIVE_PARAMS = {
    "token", "access_token", "api_key", "apikey", "key", "sig", "signature",
    "password", "passwd", "secret", "client_secret", "auth", "code",
    "subscription-key", "x-api-key",
}
SENSITIVE_HEADERS = {"authorization", "ocp-apim-subscription-key", "x-api-key", "cookie"}
# Response headers never copied into evidence metadata (session cookies and the like).
SENSITIVE_RESPONSE_HEADERS = SENSITIVE_HEADERS | {"set-cookie", "proxy-authorization", "www-authenticate"}
REDACTED = "REDACTED"
ENV_EVIDENCE_PASSPHRASE = "EVIDENCE_KEY_PASSPHRASE"  # same variable as `python3 -m evidence`
_HEX64 = re.compile(r"^[0-9a-f]{64}$")


class FetchError(Exception):
    """The request could not be completed (network, HTTP status, size cap)."""

    def __init__(self, message, status=None):
        super().__init__(message)
        self.status = status


class PolicyError(FetchError):
    """The request was refused before sending: scheme, host or redirect policy."""


class Response:
    """A completed response. `body` is bytes (None when streamed to a file)."""

    def __init__(self, url, final_url, status, headers, body, sha256, nbytes, fetched_at, evidence=None,
                 evidence_entry=None, tls_cert_sha256=None):
        self.url = url
        self.final_url = final_url
        self.status = status
        self.headers = headers
        self.body = body
        self.sha256 = sha256
        self.nbytes = nbytes
        self.fetched_at = fetched_at
        self.evidence = evidence  # legacy sidecar path (evidence_dir), or None
        self.evidence_entry = evidence_entry  # shared-log entry dict (evidence_log), or None
        self.tls_cert_sha256 = tls_cert_sha256

    def header(self, name, default=None):
        return self.headers.get(name.lower(), default)

    def json(self):
        try:
            return json.loads(self.body.decode("utf-8"))
        except (UnicodeDecodeError, ValueError, AttributeError) as e:
            raise FetchError(f"response from {self.final_url} is not JSON: {e}", self.status)


# --------------------------------------------------------------------------
# secrets


def secret_from_env_or_file(env_var, file_path=None):
    """Return a secret from `file_path` (if given) or env var `env_var`, or None.

    The CLI only ever takes a *path* (e.g. --token-file); the value itself is
    never an argv parameter, so it does not show up in `ps` or shell history.
    """
    if file_path:
        try:
            with open(file_path, encoding="utf-8") as f:
                value = f.readline().strip()
        except OSError as e:
            raise ValueError(f"cannot read secret file {file_path}: {e.strerror}")
        if not value:
            raise ValueError(f"secret file {file_path} is empty")
        return value
    value = os.environ.get(env_var, "").strip()
    return value or None


def redact_text(text, secrets=()):
    """Replace every literal occurrence of each secret (and its URL-quoted form)."""
    if not text:
        return text
    for s in secrets:
        if not s or len(s) < 4:
            continue
        for form in {s, urllib.parse.quote(s, safe=""), urllib.parse.quote_plus(s)}:
            text = text.replace(form, REDACTED)
    return text


def redact_url(url, secrets=()):
    """Return `url` with sensitive query values and any secret literals redacted."""
    try:
        parts = urllib.parse.urlsplit(url)
    except ValueError:
        return REDACTED
    netloc = parts.netloc
    if "@" in netloc:
        netloc = REDACTED + "@" + netloc.rsplit("@", 1)[1]
    query = parts.query
    if query:
        pairs = urllib.parse.parse_qsl(query, keep_blank_values=True)
        pairs = [(k, REDACTED if k.lower() in SENSITIVE_PARAMS else v) for k, v in pairs]
        query = urllib.parse.urlencode(pairs, safe=",:/")
    out = urllib.parse.urlunsplit((parts.scheme, netloc, parts.path, query, ""))
    return redact_text(out, secrets)


# --------------------------------------------------------------------------
# policy


def host_allowed(host, allowed_hosts):
    """True if `host` equals an entry, or matches a '*.example.com' entry."""
    host = (host or "").lower().rstrip(".")
    if not host:
        return False
    for pat in allowed_hosts:
        pat = pat.lower()
        if pat.startswith("*."):
            if host.endswith(pat[1:]) and host != pat[2:]:
                return True
        elif host == pat:
            return True
    return False


def check_url(url, allowed_hosts, allow_http=False):
    """Validate scheme/host/port/userinfo. Returns the lower-cased host."""
    try:
        parts = urllib.parse.urlsplit(url)
        port = parts.port
    except ValueError as e:
        raise PolicyError(f"malformed URL: {e}")
    schemes = {"https", "http"} if allow_http else {"https"}
    if parts.scheme.lower() not in schemes:
        raise PolicyError(f"refusing scheme {parts.scheme or '(none)'!r}: only {'/'.join(sorted(schemes))} allowed")
    if parts.username or parts.password:
        raise PolicyError("refusing URL with embedded credentials")
    if port not in (None, 443, 80) or (port == 80 and parts.scheme.lower() == "https"):
        raise PolicyError(f"refusing non-standard port {port}")
    host = (parts.hostname or "").lower()
    if not host_allowed(host, allowed_hosts):
        raise PolicyError(f"host {host or '(none)'!r} is not in this module's allow-list")
    return host


def user_agent():
    contact = os.environ.get("CONTACT_EMAIL", "").strip()
    ua = f"{PROJECT}/{VERSION} (search-and-rescue open-data research; python-urllib"
    if contact:
        ua += f"; contact: {contact}"
    return ua + ")"


# --------------------------------------------------------------------------
# default (real network) opener


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def peer_cert_fingerprint(sock):
    """SHA-256 (hex) of the TLS peer certificate (DER) on `sock`, or None."""
    try:
        der = sock.getpeercert(binary_form=True)
    except (AttributeError, ValueError, OSError):
        return None
    return hashlib.sha256(der).hexdigest() if der else None


class _CertRecordingHTTPSConnection(http.client.HTTPSConnection):
    """HTTPSConnection that remembers the peer certificate's SHA-256 once TLS is up.

    Through a CONNECT proxy this is the certificate presented inside the
    tunnel; behind a TLS-intercepting proxy it is the proxy's certificate.
    """

    peer_cert_sha256 = None

    def connect(self):
        super().connect()
        self.peer_cert_sha256 = peer_cert_fingerprint(self.sock)


class CertRecordingHTTPSHandler(urllib.request.HTTPSHandler):
    """HTTPSHandler that sets `peer_cert_sha256` on every response it returns."""

    def https_open(self, req):
        conns = []

        def factory(host, **kw):
            conn = _CertRecordingHTTPSConnection(host, **kw)
            conns.append(conn)
            return conn

        resp = self.do_open(factory, req, context=self._context)
        resp.peer_cert_sha256 = conns[-1].peer_cert_sha256 if conns else None
        return resp


def peer_cert_of(resp):
    """The `peer_cert_sha256` an opener attached to a response (or HTTPError), if it is valid hex."""
    for obj in (resp, getattr(resp, "fp", None)):
        value = getattr(obj, "peer_cert_sha256", None) if obj is not None else None
        if isinstance(value, str) and _HEX64.match(value):
            return value
    return None


def default_opener(context=None, proxies=None):
    """Return an opener(request, timeout) that never follows redirects itself
    and returns HTTP error responses instead of raising, so fetch() sees every
    hop. A cookie jar is shared across the hops of one fetch (Earthdata Login
    sets a session cookie during its redirect dance). Each HTTPS response
    carries `peer_cert_sha256` for the evidence log. `context` overrides the
    TLS context (tests); `proxies` overrides the environment's proxies."""
    # od = urllib.request.build_opener(_NoRedirect(), urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
    # Replaced: the stock HTTPSHandler discards the peer certificate, so the TLS fingerprint
    # (SYSTEM_REVIEW C5) could not be recorded. Lesson: capture provenance where the bytes arrive.
    handlers = [_NoRedirect(), CertRecordingHTTPSHandler(context=context),
                urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())]
    if proxies is not None:
        handlers.append(urllib.request.ProxyHandler(proxies))
    od = urllib.request.build_opener(*handlers)

    def _open(req, timeout):
        try:
            return od.open(req, timeout=timeout)
        except urllib.error.HTTPError as e:
            if peer_cert_of(e) is not None:
                e.peer_cert_sha256 = peer_cert_of(e)
            return e

    return _open


def _norm_headers(h):
    out = {}
    if h is None:
        return out
    items = h.items() if hasattr(h, "items") else h
    for k, v in items:
        out[str(k).lower()] = str(v)
    return out


def _status(resp):
    s = getattr(resp, "status", None)
    if s is None:
        s = getattr(resp, "code", None)
    if s is None and hasattr(resp, "getcode"):
        s = resp.getcode()
    return int(s)


def _retry_after(value, now=None):
    """Seconds from a Retry-After header (delta-seconds or HTTP-date), or None."""
    if not value:
        return None
    value = value.strip()
    if value.isdigit():
        return float(value)
    try:
        when = email.utils.parsedate_to_datetime(value)
    except (TypeError, ValueError):
        return None
    if when.tzinfo is None:
        when = when.replace(tzinfo=_dt.timezone.utc)
    now = now or _dt.datetime.now(_dt.timezone.utc)
    return max(0.0, (when - now).total_seconds())


def utc_now():
    return _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


# --------------------------------------------------------------------------
# evidence


def _contains_secret(body, secrets):
    for s in secrets:
        if s and len(s) >= 4 and s.encode("utf-8") in body:
            return True
    return False


def save_evidence(evidence_dir, *, url, final_url, method, status, headers, body, sha256, nbytes,
                  fetched_at, secrets=(), request_body=None, body_path=None):
    """DEPRECATED legacy format: <time>_<sha16>.bin (raw bytes) and .json (sidecar). Returns sidecar path.

    Kept byte-for-byte unchanged so existing evidence directories, the cmr/stac
    --evidence-dir runs and `python3 -m evidence import` (format
    fetch-sidecars, whose tests pin this behaviour) keep working. Known flaw
    (SYSTEM_REVIEW C5): the name has one-second resolution, so a second
    identical response in the same second OVERWRITES the first. Use the shared
    log instead (fetch(evidence_log=...), CLI --evidence-log), whose stored
    names are <seq>_<sha256>.bin and never collide.
    """
    os.makedirs(evidence_dir, exist_ok=True)
    stamp = fetched_at.replace(":", "").replace("-", "")
    # Lesson: a time stamp is not an identifier. This name collided within a second (SYSTEM_REVIEW C5).
    # base = os.path.join(evidence_dir, f"{stamp}_{sha256[:16]}")
    # Now a numeric suffix is added and files are opened with "x", so a repeat never overwrites.
    n = 0
    while True:
        base = os.path.join(evidence_dir, f"{stamp}_{sha256[:16]}" + (f"_{n}" if n else ""))
        if not (os.path.exists(base + ".json") or os.path.exists(base + ".bin")):
            break
        n += 1
    meta = {
        "url": redact_url(url, secrets),
        "final_url": redact_url(final_url, secrets),
        "method": method,
        "status": status,
        "fetched_at_utc": fetched_at,
        "sha256": sha256,
        "bytes": nbytes,
        "content_type": headers.get("content-type"),
        "user_agent": user_agent(),
    }
    if request_body is not None:
        meta["request_body_sha256"] = hashlib.sha256(request_body).hexdigest()
        text = request_body.decode("utf-8", "replace")
        if len(text) <= 65536:
            meta["request_body"] = redact_text(text, secrets)
    if body_path is not None:
        meta["body_file"] = os.path.abspath(body_path)
    elif body is not None and _contains_secret(body, secrets):
        meta["body_withheld"] = "response body contains a secret value; only its sha256 is recorded"
    elif body is not None:
        with open(base + ".bin", "xb") as f:
            f.write(body)
        meta["body_file"] = os.path.basename(base + ".bin")
    with open(base + ".json", "x", encoding="utf-8") as f:
        json.dump(meta, f, indent=1, sort_keys=True)
        f.write("\n")
    return base + ".json"


# -------------------------------------------------------------------------- shared evidence log


def evidence_core():
    """Import the shared evidence library (docs/blue-ocean-sar/evidence) from any working directory.

    Imported lazily so the connectors still run without `cryptography` unless
    --evidence-log is used.
    """
    parent = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    if parent not in sys.path:
        sys.path.insert(0, parent)
    from evidence import core  # noqa: E402
    return core


def _evidence_passphrase(passphrase_file=None):
    if passphrase_file:
        with open(passphrase_file, "rb") as f:
            value = f.readline().rstrip(b"\r\n")
        if not value:
            raise ValueError(f"passphrase file {passphrase_file} is empty")
        return value
    env = os.environ.get(ENV_EVIDENCE_PASSPHRASE, "")
    return env.encode("utf-8") if env else None


def open_evidence_log(directory, *, operator=None, key_path=None, passphrase_file=None,
                      tool_name="opendata-fetch", tool_version=VERSION, tool_path=None):
    """Open (or start) a shared revvel-evidence/1 log, checking everything before any network call.

    operator: --operator value, else $EVIDENCE_OPERATOR (required).
    key_path: optional Ed25519 private key (PKCS#8 PEM, mode 0600); the
      passphrase, if any, comes from `passphrase_file` or $EVIDENCE_KEY_PASSPHRASE.
    Raises ValueError (exit 2 in every CLI) on a missing operator, an
    unreadable key, a broken log or a signing-mode mismatch with the log.
    """
    try:
        core = evidence_core()
    except ImportError as e:
        raise ValueError(f"the evidence log needs ../evidence and the 'cryptography' package ({e})")
    key = None
    if key_path:
        try:
            key = core.load_private_key(key_path, _evidence_passphrase(passphrase_file))
        except (OSError, ValueError, TypeError, core.EvidenceError) as e:
            raise ValueError(f"cannot load evidence key {key_path}: {e}")
    tool = core.tool_info(tool_name, tool_version, tool_path or os.path.abspath(__file__))
    log = core.EvidenceLog(directory, operator=operator, private_key=key, tool=tool)
    if not log.operator:
        raise ValueError(f"the evidence log needs an operator: --operator NAME or ${core.ENV_OPERATOR}")
    try:
        entries = log.read_entries()
        core.chain_head(entries)
    except (OSError, ValueError, core.EvidenceError) as e:
        raise ValueError(f"evidence log {directory} cannot be extended: {e}")
    if entries and entries[-1].get("key_id") != log.key_id:
        raise ValueError(f"evidence log {directory} is " + ("signed with another key" if entries[-1].get("key_id")
                                                            else "unsigned") + "; use the same signing mode and key")
    return log


def redact_bytes(body, secrets=()):
    """Replace each secret (and its URL-quoted forms) in `body` with REDACTED; returns (bytes, count)."""
    n = 0
    for s in secrets:
        if not s or len(s) < 4:
            continue
        for form in {s, urllib.parse.quote(s, safe=""), urllib.parse.quote_plus(s)}:
            fb = form.encode("utf-8")
            n += body.count(fb)
            body = body.replace(fb, REDACTED.encode("ascii"))
    return body, n


def evidence_headers(headers, secrets=()):
    """Response headers for evidence metadata: sensitive ones dropped to REDACTED, secrets redacted."""
    return {k: (REDACTED if k.lower() in SENSITIVE_RESPONSE_HEADERS else redact_text(v, secrets))
            for k, v in sorted(headers.items())}


def log_evidence(evidence_log, *, url, final_url, method, status, headers, body, sha256, nbytes, fetched_at,
                 secrets=(), request_body=None, body_path=None, tls_cert_sha256=None, hops=(), legacy_sidecar=None):
    """Append one response to a shared evidence log. Returns the entry. Raises FetchError if it cannot."""
    extra = {
        "url": redact_url(url, secrets), "final_url": redact_url(final_url, secrets), "method": method,
        "redirects": [redact_url(h, secrets) for h in hops], "fetched_at_utc": fetched_at,
        "content_type": headers.get("content-type"), "response_headers": evidence_headers(headers, secrets),
        "user_agent": user_agent(), "sha256_as_received": sha256, "bytes_as_received": nbytes,
    }
    if request_body is not None:
        extra["request_body_sha256"] = hashlib.sha256(request_body).hexdigest()
        text = request_body.decode("utf-8", "replace")
        if len(text) <= 65536:
            extra["request_body"] = redact_text(text, secrets)
    if legacy_sidecar:
        extra["legacy_sidecar"] = os.path.basename(legacy_sidecar)
    kw = dict(kind="http-response", source=redact_url(final_url, secrets), status=status,
              server_date=headers.get("date"), tls_cert_sha256=tls_cert_sha256, extra=extra)
    try:
        if body_path is not None:
            extra["streamed_to"] = os.path.abspath(body_path)
            return evidence_log.append(path=body_path, **kw)
        stored, nred = redact_bytes(body or b"", secrets)
        if nred:
            # Never store a secret: keep the redacted bytes and the as-received hash.
            extra["secret_redactions"] = nred
            extra["body_redacted"] = "response body contained a secret value; stored with it replaced"
        return evidence_log.append(stored, **kw)
    except Exception as e:  # EvidenceError, OSError: the capture postcondition does not hold
        raise FetchError(f"evidence log append failed for {redact_url(final_url, secrets)}: "
                         f"{redact_text(str(e), secrets)}", status)


# --------------------------------------------------------------------------
# fetch


def _read_capped(resp, max_bytes, url_for_msg, stream_to=None):
    h = hashlib.sha256()
    total = 0
    chunks = []
    out = open(stream_to, "wb") if stream_to else None
    try:
        while True:
            chunk = resp.read(min(1 << 16, max_bytes + 1 - total))
            if not chunk:
                break
            total += len(chunk)
            if total > max_bytes:
                raise FetchError(f"response from {url_for_msg} exceeds the {max_bytes}-byte cap")
            h.update(chunk)
            if out:
                out.write(chunk)
            else:
                chunks.append(chunk)
    except BaseException:
        if out:
            out.close()
            out = None
            os.remove(stream_to)
        raise
    finally:
        if out:
            out.close()
        close = getattr(resp, "close", None)
        if close:
            close()
    return (None if stream_to else b"".join(chunks)), h.hexdigest(), total


def fetch(url, *, allowed_hosts, method="GET", params=None, data=None, json_body=None, headers=None,
          secrets=(), auth_hosts=None, timeout=DEFAULT_TIMEOUT, max_bytes=DEFAULT_MAX_BYTES,
          retries=DEFAULT_RETRIES, backoff=DEFAULT_BACKOFF, max_retry_wait=MAX_RETRY_WAIT,
          evidence_dir=None, opener=None, allow_http=False, same_host_redirects_only=False,
          stream_to=None, accept_status=(200,), sleep=time.sleep, log=None, evidence_log=None):
    """Fetch `url` under the module policy and return a Response.

    params: dict/list of query parameters appended to the URL.
    data: bytes or dict (form-encoded) request body; json_body: JSON request body.
    secrets: secret values to redact from logs/evidence (header values in
      SENSITIVE_HEADERS are added automatically).
    auth_hosts: hosts allowed to receive SENSITIVE_HEADERS; default first host.
    accept_status: statuses returned as success; any other final status raises.
    evidence_dir: DEPRECATED legacy sidecar directory (see save_evidence).
    evidence_log: an evidence.core.EvidenceLog (see open_evidence_log); the
      final response of every fetch, accepted or not, is appended to it.
    """
    log = log or (lambda m: None)
    opener = opener or default_opener()
    headers = dict(headers or {})
    secrets = [s for s in secrets if s]
    secrets += [v for k, v in headers.items() if k.lower() in SENSITIVE_HEADERS and v]
    secrets += [v.split(" ", 1)[1] for k, v in headers.items()
                if k.lower() == "authorization" and " " in v]
    if params:
        sep = "&" if urllib.parse.urlsplit(url).query else "?"
        url = url + sep + urllib.parse.urlencode(params, doseq=True, safe=",:/")
    body = None
    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
        headers.setdefault("Content-Type", "application/json")
    elif isinstance(data, dict):
        body = urllib.parse.urlencode(data).encode("utf-8")
        headers.setdefault("Content-Type", "application/x-www-form-urlencoded")
    elif data is not None:
        body = data
    headers.setdefault("User-Agent", user_agent())
    headers.setdefault("Accept", "application/json, application/geo+json;q=0.9, */*;q=0.5")

    first_host = check_url(url, allowed_hosts, allow_http)
    auth_hosts = set(h.lower() for h in (auth_hosts or [first_host]))
    current, cur_method, cur_body = url, method.upper(), body
    attempt = 0
    hops = 0
    hop_urls = []
    while True:
        host = check_url(current, allowed_hosts, allow_http)
        send_headers = {k: v for k, v in headers.items()
                        if k.lower() not in SENSITIVE_HEADERS or host_allowed(host, auth_hosts)}
        if cur_body is None:
            send_headers.pop("Content-Type", None)
        req = urllib.request.Request(current, data=cur_body, headers=send_headers, method=cur_method)
        safe_url = redact_url(current, secrets)
        log(f"{cur_method} {safe_url}")
        try:
            resp = opener(req, timeout)
            status = _status(resp)
        except (urllib.error.URLError, OSError, ValueError) as e:
            reason = redact_text(str(getattr(e, "reason", e)), secrets)
            if attempt < retries:
                wait = min(backoff * (2 ** attempt), max_retry_wait)
                attempt += 1
                log(f"network error ({reason}); retry {attempt}/{retries} in {wait:.1f}s")
                sleep(wait)
                continue
            raise FetchError(f"{cur_method} {safe_url} failed: {reason}")
        rheaders = _norm_headers(getattr(resp, "headers", None))

        if status in REDIRECT_STATUSES:
            loc = rheaders.get("location")
            close = getattr(resp, "close", None)
            if close:
                close()
            if not loc:
                raise FetchError(f"redirect {status} from {safe_url} without Location", status)
            hops += 1
            if hops > MAX_REDIRECTS:
                raise FetchError(f"too many redirects from {redact_url(url, secrets)}", status)
            nxt = urllib.parse.urljoin(current, loc)
            try:
                nxt_host = check_url(nxt, allowed_hosts, allow_http)
            except PolicyError as e:
                raise PolicyError(f"redirect from {safe_url} to {redact_url(nxt, secrets)} refused: {e}", status)
            if same_host_redirects_only and nxt_host != host:
                raise PolicyError(f"redirect from {safe_url} to another host ({nxt_host}) refused", status)
            if status == 303 or (status in (301, 302) and cur_method == "POST"):
                cur_method, cur_body = "GET", None
            log(f"redirect {status} -> {redact_url(nxt, secrets)}")
            hop_urls.append(current)
            current = nxt
            continue

        if status in RETRY_STATUSES and attempt < retries:
            ra = _retry_after(rheaders.get("retry-after"))
            close = getattr(resp, "close", None)
            if close:
                close()
            if ra is not None and ra > max_retry_wait:
                raise FetchError(f"{safe_url} returned {status} and asked to wait {ra:.0f}s "
                                 f"(over the {max_retry_wait:.0f}s cap); try later", status)
            wait = ra if ra is not None else min(backoff * (2 ** attempt), max_retry_wait)
            attempt += 1
            log(f"HTTP {status}; retry {attempt}/{retries} in {wait:.1f}s")
            sleep(wait)
            continue

        fetched_at = utc_now()
        ok = status in accept_status
        tls_fp = peer_cert_of(resp)
        content, sha, n = _read_capped(resp, max_bytes, safe_url, stream_to if ok else None)
        ev = None
        entry = None
        if evidence_dir:
            ev = save_evidence(evidence_dir, url=url, final_url=current, method=cur_method, status=status,
                               headers=rheaders, body=content, sha256=sha, nbytes=n, fetched_at=fetched_at,
                               secrets=secrets, request_body=cur_body,
                               body_path=stream_to if (ok and stream_to) else None)
        if evidence_log is not None:
            entry = log_evidence(evidence_log, url=url, final_url=current, method=cur_method, status=status,
                                 headers=rheaders, body=content, sha256=sha, nbytes=n, fetched_at=fetched_at,
                                 secrets=secrets, request_body=cur_body,
                                 body_path=stream_to if (ok and stream_to) else None,
                                 tls_cert_sha256=tls_fp, hops=hop_urls, legacy_sidecar=ev)
            log(f"evidence seq {entry['seq']} entry_hash {entry['entry_hash'][:16]}")
        if not ok:
            snippet = ""
            if content:
                snippet = redact_text(content[:300].decode("utf-8", "replace"), secrets).replace("\n", " ")
            raise FetchError(f"{cur_method} {safe_url} returned HTTP {status}: {snippet}", status)
        log(f"HTTP {status}, {n} bytes, sha256 {sha[:16]}")
        # return Response(url, current, status, rheaders, content, sha, n, fetched_at, ev)
        # Replaced: also return the shared-log entry and the TLS fingerprint to the caller.
        return Response(url, current, status, rheaders, content, sha, n, fetched_at, ev,
                        evidence_entry=entry, tls_cert_sha256=tls_fp)


def fetch_json(url, **kw):
    return fetch(url, **kw).json()


# --------------------------------------------------------------------------
# CLI helpers shared by the connectors


def add_common_args(ap):
    g = ap.add_argument_group("network")
    # g.add_argument("--evidence-dir", help="save raw response bytes + sha256/URL/time/status sidecars here")
    # Replaced help text only: the sidecar format is now deprecated in favour of --evidence-log.
    g.add_argument("--evidence-dir", help="DEPRECATED legacy format: raw bytes + unchained JSON sidecars "
                                          "(sha256/URL/time/status); prefer --evidence-log")
    add_evidence_log_args(g)
    g.add_argument("--timeout", type=float, default=DEFAULT_TIMEOUT, help="seconds per request")
    g.add_argument("--retries", type=int, default=DEFAULT_RETRIES, help="retries on 429/5xx/network errors")
    g.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES, help="response size cap")
    g.add_argument("--verbose", "-v", action="store_true", help="log requests (redacted) to stderr")
    ap.add_argument("--out", help="write JSON here instead of stdout")
    return ap


def add_evidence_log_args(g):
    """--evidence-log / --operator / --evidence-key / --evidence-key-passphrase-file (shared by every tool)."""
    g.add_argument("--evidence-log", metavar="DIR",
                   help="append every response to this shared revvel-evidence/1 log (hash-chained, all "
                        "metadata hashed, server Date and TLS fingerprint); see ../evidence/README.md")
    g.add_argument("--operator", help="who is capturing (required with --evidence-log; default $EVIDENCE_OPERATOR)")
    g.add_argument("--evidence-key", metavar="PATH",
                   help="Ed25519 private key (PEM, mode 0600) to sign each evidence entry; passphrase, if any, "
                        f"from --evidence-key-passphrase-file or ${ENV_EVIDENCE_PASSPHRASE}")
    g.add_argument("--evidence-key-passphrase-file", metavar="PATH", help="file holding the key passphrase")
    return g


def evidence_log_from_args(a, tool_name="opendata-fetch", tool_version=VERSION, tool_path=None):
    """The EvidenceLog the CLI flags ask for, or None. Raises ValueError (exit 2) on bad input."""
    if not getattr(a, "evidence_log", None):
        for flag in ("evidence_key", "evidence_key_passphrase_file"):
            if getattr(a, flag, None):
                raise ValueError(f"--{flag.replace('_', '-')} needs --evidence-log")
        return None
    return open_evidence_log(a.evidence_log, operator=getattr(a, "operator", None),
                             key_path=getattr(a, "evidence_key", None),
                             passphrase_file=getattr(a, "evidence_key_passphrase_file", None),
                             tool_name=tool_name, tool_version=tool_version, tool_path=tool_path)


def common_kwargs(a, opener=None):
    if a.timeout <= 0 or a.retries < 0 or a.max_bytes <= 0:
        raise ValueError("--timeout and --max-bytes must be positive, --retries non-negative")
    kw = {"timeout": a.timeout, "retries": a.retries, "max_bytes": a.max_bytes, "evidence_dir": a.evidence_dir}
    ev_log = evidence_log_from_args(a)
    if ev_log is not None:
        kw["evidence_log"] = ev_log
    if a.evidence_dir:
        print("warning: --evidence-dir writes the deprecated sidecar format (no chain, no operator, metadata "
              "not hashed); use --evidence-log DIR --operator NAME", file=sys.stderr)
    if opener is not None:
        kw["opener"] = opener
    if a.verbose:
        kw["log"] = lambda m: print(m, file=sys.stderr)
    return kw


def write_output(obj, out=None):
    text = json.dumps(obj, indent=2)
    if out:
        with open(out, "w", encoding="utf-8") as f:
            f.write(text + "\n")
    else:
        print(text)


def parse_bbox(text):
    """'west,south,east,north' in WGS84 degrees -> [w, s, e, n]."""
    try:
        vals = [float(v) for v in str(text).split(",")]
    except ValueError:
        raise ValueError(f"bbox {text!r}: expected four numbers west,south,east,north")
    if len(vals) != 4:
        raise ValueError(f"bbox {text!r}: expected four numbers west,south,east,north")
    w, s, e, n = vals
    if not (-180 <= w <= 180 and -180 <= e <= 180 and -90 <= s <= 90 and -90 <= n <= 90):
        raise ValueError(f"bbox {text!r}: out of WGS84 range")
    if w >= e or s >= n:
        raise ValueError(f"bbox {text!r}: need west < east and south < north")
    return vals


_DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def parse_instant(text, end=False):
    """ISO date or datetime -> RFC 3339 UTC string. A bare date becomes the
    start (or, with end=True, the last second) of that day."""
    text = text.strip()
    if _DATE_RE.match(text):
        d = _dt.date.fromisoformat(text)
        return d.isoformat() + ("T23:59:59Z" if end else "T00:00:00Z")
    try:
        t = _dt.datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        raise ValueError(f"not an ISO date/time: {text!r}")
    if t.tzinfo is None:
        t = t.replace(tzinfo=_dt.timezone.utc)
    return t.astimezone(_dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def parse_interval(text):
    """'start/end' (either side may be '..' or empty) -> (start|None, end|None)."""
    if "/" not in text:
        s = parse_instant(text)
        return s, parse_instant(text, end=True) if _DATE_RE.match(text.strip()) else s
    a, b = text.split("/", 1)
    start = None if a.strip() in ("", "..") else parse_instant(a)
    stop = None if b.strip() in ("", "..") else parse_instant(b, end=True)
    if start is None and stop is None:
        raise ValueError("interval needs at least one end")
    if start and stop and start > stop:
        raise ValueError(f"interval {text!r} ends before it starts")
    return start, stop


_NEG_VALUE_RE = re.compile(r"^-\d")


def join_negative_values(argv):
    """['--bbox', '-83.1,39.9,...'] -> ['--bbox=-83.1,39.9,...'].

    argparse reads a value such as '-83.1,39.9,-82.9,40.05' (any western
    longitude) as an unknown option; no option here starts with '-<digit>', so
    gluing it to the preceding --flag is unambiguous."""
    out = []
    i = 0
    while i < len(argv):
        tok = argv[i]
        if (tok.startswith("--") and "=" not in tok and i + 1 < len(argv)
                and _NEG_VALUE_RE.match(argv[i + 1])):
            out.append(f"{tok}={argv[i + 1]}")
            i += 2
            continue
        out.append(tok)
        i += 1
    return out


def cli_main(parser, run, argv=None, opener=None):
    """Shared main(): exit 0 on success, 2 on bad input or a refused URL
    (policy), 3 when the remote service failed or the outcome was not met."""
    argv = join_negative_values(list(sys.argv[1:] if argv is None else argv))
    a = parser.parse_args(argv)
    try:
        res = run(a, opener)
    except PolicyError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except FetchError as e:
        print(f"error: {e}", file=sys.stderr)
        return 3
    except (OSError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    write_output(res, getattr(a, "out", None))
    return 0
