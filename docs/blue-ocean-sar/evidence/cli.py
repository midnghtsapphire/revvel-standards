"""Command line for the shared evidence library.

    python3 -m evidence keygen  --private op.key --public op.pub
    python3 -m evidence capture --log DIR --operator NAME [--key op.key] (--url U | --file F | --stdin) --kind K
    python3 -m evidence head    --log DIR
    python3 -m evidence timestamp --log DIR [--tsa URL ...] [--tsa-ca PEM]
    python3 -m evidence verify  --log DIR [--public-key op.pub] [--expect-head H] [--court] [--tsa-ca PEM]
    python3 -m evidence import  PATH [--format F] [--into DIR --operator NAME [--key op.key]]

Run from docs/blue-ocean-sar/ (or run this file directly). Exit codes: 0 the
postcondition holds; 1 it does not (verification failed, no TSA answered, the
capture failed); 2 bad input (arguments, missing files, unreadable keys).
Secrets (key passphrases) come from a file path or EVIDENCE_KEY_PASSPHRASE,
never from argv.
"""

import argparse
import contextlib
import json
import os
import sys

if __package__ in (None, ""):  # run as a script: make the package importable
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    __package__ = "evidence"  # noqa: A001

from . import core, importers, tsa  # noqa: E402

EXIT_OK, EXIT_FAIL, EXIT_BAD_INPUT = 0, 1, 2
ENV_PASSPHRASE = "EVIDENCE_KEY_PASSPHRASE"


class BadInput(Exception):
    pass


def _passphrase(path):
    if path:
        with open(path, "rb") as f:
            value = f.readline().rstrip(b"\r\n")
        if not value:
            raise BadInput(f"passphrase file {path} is empty")
        return value
    env = os.environ.get(ENV_PASSPHRASE, "")
    return env.encode() if env else None


def _private_key(args):
    if not getattr(args, "key", None):
        return None
    try:
        return core.load_private_key(args.key, _passphrase(args.passphrase_file))
    except (OSError, ValueError, TypeError) as exc:
        raise BadInput(f"cannot load private key {args.key}: {exc}")


def _log(args):
    tool = core.tool_info(args.tool_name, args.tool_version, args.tool_path) if args.tool_name else None
    log = core.EvidenceLog(args.log, operator=args.operator, private_key=_private_key(args), tool=tool)
    if not log.operator:
        raise BadInput(f"an operator is required: --operator NAME or {core.ENV_OPERATOR}")
    return log


def _print(obj, as_json, out):
    if as_json:
        out.write(json.dumps(obj, indent=1, sort_keys=True, default=str) + "\n")


def cmd_keygen(args, out):
    kid = core.generate_keypair(args.private, args.public, _passphrase(args.passphrase_file))
    out.write(f"key_id {kid}\nprivate key {args.private} (mode 600, keep it offline)\npublic key {args.public}\n")
    return EXIT_OK


def _extra(args):
    if not args.extra_json:
        return {}
    with open(args.extra_json, encoding="utf-8") as f:
        extra = json.load(f)
    if not isinstance(extra, dict):
        raise BadInput("--extra-json must hold a JSON object")
    return extra


def cmd_capture(args, out):
    log = _log(args)
    extra = _extra(args)
    sources = [bool(args.url), bool(args.file), bool(args.stdin)]
    if sum(sources) != 1:
        raise BadInput("give exactly one of --url, --file, --stdin")
    if args.url:
        try:
            e = log.capture_https(args.url, kind=args.kind or "http-response", extra=extra, cafile=args.cafile,
                                  timeout=args.timeout)
        except OSError as exc:
            out.write(f"capture failed: {exc}\n")
            return EXIT_FAIL
    else:
        if not args.kind:
            raise BadInput("--kind is required for --file and --stdin")
        kw = dict(kind=args.kind, status=args.status, server_date=args.server_date,
                  tls_cert_sha256=args.tls_cert_sha256, extra=extra)
        if args.file:
            e = log.append(path=args.file, source=args.source or os.path.abspath(args.file), **kw)
        else:
            e = log.append(sys.stdin.buffer.read(), source=args.source or "stdin", **kw)
    out.write(f"seq {e['seq']} sha256 {e['sha256']} file {e['file']}\nhead {e['entry_hash']}\n")
    return EXIT_OK


def cmd_head(args, out):
    entries = core.EvidenceLog(args.log, operator="").read_entries()
    count, head = core.chain_head(entries)
    out.write(f"count {count}\nhead {head}\n")
    return EXIT_OK


def cmd_timestamp(args, out):
    try:
        res = tsa.stamp_head(args.log, tsa_urls=args.tsa or tsa.DEFAULT_TSAS, cafile=args.tsa_ca,
                             timeout=args.timeout)
    except tsa.TSAError as exc:
        out.write(f"timestamp failed: {exc}\n")
        return EXIT_FAIL
    out.write(f"seq {res['seq']} head {res['head']}\nTSA {res['tsa_url']} time {res['gen_time']}\n"
              f"token {res['token']}\nverified against CA: {res['verified_against_ca']}\n")
    return EXIT_OK


def cmd_verify(args, out):
    pub = None
    if args.public_key:
        try:
            pub = core.load_public_key(args.public_key)
        except (OSError, ValueError) as exc:
            raise BadInput(f"cannot load public key {args.public_key}: {exc}")
    if args.expect_head is not None and not core.HEX64.match(args.expect_head):
        raise BadInput("--expect-head must be 64 lower-case hex digits")
    rep = core.verify_log(args.log, public_key=pub, expect_head=args.expect_head, court=args.court,
                          tsa_cafile=args.tsa_ca)
    if args.json:
        _print(rep, True, out)
    else:
        out.write(f"{'OK' if rep['ok'] else 'FAIL'}: {rep['count']} entries, head {rep['head']}, "
                  f"signed {rep['signed']}, {len(rep['tokens'])} RFC 3161 token(s)"
                  f"{', court mode' if args.court else ''}\n")
        for t in rep["tokens"]:
            out.write(f"  token {t['file']}: seq {t.get('covers_seq')} time {t.get('gen_time')} "
                      f"covers head {t['covers_head']} CA-verified {t['signature_verified']}\n")
        for p in rep["problems"]:
            out.write(f"  problem: {p}\n")
        for w in rep["warnings"]:
            out.write(f"  warning: {w}\n")
    return EXIT_OK if rep["ok"] else EXIT_FAIL


def cmd_import(args, out):
    rep = importers.import_any(args.path, args.format, args.expect_head)
    new = []
    if args.into:
        if not rep["verified"]:
            out.write("refusing to import: the legacy set does not verify\n")
        else:
            new = importers.to_evidence_log(rep, _log(args))
    shown = {k: v for k, v in rep.items() if k != "records"}
    if args.json:
        _print(dict(shown, imported=len(new)), True, out)
    else:
        out.write(f"{rep['format']} {rep['path']}: {'VERIFIED' if rep['verified'] else 'FAIL'} "
                  f"({rep['count']} entries, head {rep['head']})\n")
        for p in rep["problems"]:
            out.write(f"  problem: {p}\n")
        for n in rep["notes"]:
            out.write(f"  note: {n}\n")
        for lack in rep["lacks"]:
            out.write(f"  lacks {lack['guarantee']}: {lack['detail']}\n")
        if new:
            out.write(f"imported {len(new)} entries into {args.into}; new head {new[-1]['entry_hash']}\n")
    return EXIT_OK if rep["verified"] and (not args.into or new or not rep["records"]) else EXIT_FAIL


def _signer_args(sp):
    sp.add_argument("--operator", help=f"who is capturing (default: env {core.ENV_OPERATOR})")
    sp.add_argument("--key", help="Ed25519 private key PEM; sign every entry (a signed log must stay signed)")
    sp.add_argument("--passphrase-file", help=f"file holding the key passphrase (or env {ENV_PASSPHRASE})")
    sp.add_argument("--tool-name", help="name of the tool doing the capture (default: this library)")
    sp.add_argument("--tool-version", default="unknown", help="version of --tool-name")
    sp.add_argument("--tool-path", help="file or dir of the tool, for `git rev-parse HEAD`")


def build_parser():
    ap = argparse.ArgumentParser(prog="evidence", description="Shared hash-chained, signed, timestamped "
                                 "evidence log (exit 0 ok, 1 fail, 2 bad input)")
    sub = ap.add_subparsers(dest="cmd", required=True)

    sp = sub.add_parser("keygen", help="make an Ed25519 operator key pair")
    sp.add_argument("--private", required=True, help="private key PEM to create (mode 600, never overwritten)")
    sp.add_argument("--public", required=True, help="public key PEM to create")
    sp.add_argument("--passphrase-file", help=f"encrypt the private key with this file's first line "
                                              f"(or env {ENV_PASSPHRASE})")

    sp = sub.add_parser("capture", help="store bytes and append one chained entry")
    sp.add_argument("--log", required=True, help="evidence directory")
    _signer_args(sp)
    sp.add_argument("--url", help="fetch this https URL (records status, Date header, TLS fingerprint)")
    sp.add_argument("--file", help="capture this local file")
    sp.add_argument("--stdin", action="store_true", help="capture stdin")
    sp.add_argument("--kind", help="what this is, e.g. http-response, photo, records-response")
    sp.add_argument("--source", help="where it came from (URL, device, person); default the URL/path")
    sp.add_argument("--status", type=int, help="response status, when capturing a saved response")
    sp.add_argument("--server-date", help="the server's Date header, when capturing a saved response")
    sp.add_argument("--tls-cert-sha256", help="TLS peer certificate SHA-256, when known")
    sp.add_argument("--extra-json", help="file with a JSON object of extra metadata (hashed)")
    sp.add_argument("--cafile", help="CA bundle for --url")
    sp.add_argument("--timeout", type=float, default=30.0)

    sp = sub.add_parser("head", help="print the entry count and head hash (record it somewhere else)")
    sp.add_argument("--log", required=True)

    sp = sub.add_parser("timestamp", help="get an RFC 3161 token over the current head")
    sp.add_argument("--log", required=True)
    sp.add_argument("--tsa", action="append", help=f"TSA URL; repeat for fallbacks (default {tsa.DEFAULT_TSAS})")
    sp.add_argument("--tsa-ca", help="CA bundle to verify the reply against (recommended)")
    sp.add_argument("--timeout", type=float, default=30.0)

    sp = sub.add_parser("verify", help="recompute every hash, signature, file and token")
    sp.add_argument("--log", required=True)
    sp.add_argument("--public-key", help="operator public key PEM; every entry must verify with it")
    sp.add_argument("--expect-head", help="head hash recorded outside this machine")
    sp.add_argument("--court", action="store_true",
                    help="require --expect-head or a CA-verified RFC 3161 token over the final head")
    sp.add_argument("--tsa-ca", help="CA bundle for verifying RFC 3161 tokens")
    sp.add_argument("--json", action="store_true")

    sp = sub.add_parser("import", help="re-verify an older evidence format and list what it lacks")
    sp.add_argument("path", help="legacy evidence directory or log file")
    sp.add_argument("--format", choices=importers.FORMATS, help="default: detect")
    sp.add_argument("--expect-head", help="legacy head recorded elsewhere")
    sp.add_argument("--into", help="also copy the verified set into this shared evidence directory")
    _signer_args(sp)
    sp.add_argument("--json", action="store_true")
    return ap


COMMANDS = {"keygen": cmd_keygen, "capture": cmd_capture, "head": cmd_head, "timestamp": cmd_timestamp,
            "verify": cmd_verify, "import": cmd_import}


def main(argv=None, out=None, err=None):
    out, err = out or sys.stdout, err or sys.stderr
    try:
        with contextlib.redirect_stderr(err):
            args = build_parser().parse_args(argv)
    except SystemExit as exc:
        return EXIT_OK if exc.code == 0 else EXIT_BAD_INPUT
    if not hasattr(args, "log"):
        args.log = getattr(args, "into", None)
    try:
        return COMMANDS[args.cmd](args, out)
    except (BadInput, core.EvidenceError, OSError, ValueError) as exc:
        err.write(f"error: {exc}\n")
        return EXIT_BAD_INPUT


if __name__ == "__main__":
    sys.exit(main())
