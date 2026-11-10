"""Shared evidence library: hash-chained, signed, RFC 3161-timestamped capture logs.

See README.md in this folder. Public API::

    from evidence import core, tsa, importers
    log = core.EvidenceLog(dir, operator="J. Smith", private_key=core.load_private_key(path))
    log.append(b"...", kind="http-response", source=url, status=200)
    tsa.stamp_head(dir)
    report = core.verify_log(dir, public_key=..., court=True, tsa_cafile=...)
"""

from .core import FORMAT, VERSION  # noqa: F401
