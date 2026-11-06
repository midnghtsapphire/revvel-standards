"""Recorded-response opener for the tests (no network).

FakeOpener maps requests to canned responses. Each route is matched by
(method, url predicate) in order; a route with a list of responses hands them
out one per call. Every request is recorded (url, method, headers, body) so
tests can assert on exactly what would have gone over the wire.
"""

import email.message
import io
import json
import os

FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "fixtures")


def fixture_bytes(name):
    with open(os.path.join(FIXTURES, name), "rb") as f:
        return f.read()


def read_bytes(path):
    with open(path, "rb") as f:
        return f.read()


def read_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def fixture_json(name):
    return json.loads(fixture_bytes(name).decode("utf-8"))


class FakeResponse:
    def __init__(self, status=200, body=b"", headers=None):
        self.status = status
        if isinstance(body, (dict, list)):
            body = json.dumps(body).encode("utf-8")
            headers = dict({"Content-Type": "application/json"}, **(headers or {}))
        elif isinstance(body, str):
            body = body.encode("utf-8")
        self._buf = io.BytesIO(body)
        m = email.message.Message()
        for k, v in (headers or {}).items():
            m[k] = v
        self.headers = m

    def read(self, n=-1):
        return self._buf.read(n)

    def close(self):
        pass


class FakeOpener:
    def __init__(self, routes=()):
        self.routes = [list(r) for r in routes]
        self.requests = []

    def add(self, method, match, *responses):
        self.routes.append([method, match, list(responses)])
        return self

    def __call__(self, req, timeout):
        url = req.full_url
        method = req.get_method()
        body = req.data
        hdrs = {k.lower(): v for k, v in req.header_items()}
        self.requests.append({"url": url, "method": method, "headers": hdrs, "body": body})
        for route in self.routes:
            m, match, responses = route
            if m not in (None, method):
                continue
            ok = match(url, body) if callable(match) else url.startswith(match)
            if not ok:
                continue
            if not responses:
                raise AssertionError(f"route for {url} exhausted")
            r = responses.pop(0) if len(responses) > 1 else responses[0]
            if isinstance(r, Exception):
                raise r
            if callable(r):
                r = r(url, body, hdrs)
            return FakeResponse(*r) if isinstance(r, tuple) else r
        raise AssertionError(f"no fake route for {method} {url}")
