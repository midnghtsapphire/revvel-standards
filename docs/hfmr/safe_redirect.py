"""Redirect handling that validates every Location before urllib follows it.

urllib's default opener follows redirects inside ``urlopen`` and only exposes the
final URL afterwards, so checking ``response.url`` once the call returns is too
late: the request to the redirect target has already been made. These helpers
run a caller-supplied URL check on each redirect target first.
"""

import socket
import urllib.request


class CheckedRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Raise (via ``check``) before a redirect to an unapproved URL is followed."""

    def __init__(self, check):
        super().__init__()
        self._check = check

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        self._check(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def checked_urlopen(check):
    """Return an ``urlopen``-compatible callable whose redirects are validated by ``check``."""
    opener = urllib.request.build_opener(CheckedRedirectHandler(check))

    # Original:
    # def _open(request, timeout=None):
    #     return opener.open(request, timeout=timeout)
    #   not urlopen-compatible: it had no data argument and timeout=None disabled the socket
    #   default timeout instead of inheriting it.
    def _open(url, data=None, timeout=socket._GLOBAL_DEFAULT_TIMEOUT):
        return opener.open(url, data, timeout)

    return _open
