#!/usr/bin/env python3
"""Probe every satellite and terrain data source, pick working mirrors, tune timeouts.

What "self-healing" means here, measurably:

  1. Each service (Sentinel-2 search, Sentinel-2 COG download, Copernicus DEM,
     USGS 3DEP, NASA CMR, USGS water data) has one or more mirrors.
  2. Every mirror is probed --samples times with a small real request whose
     *content* is checked, not just the status code: a STAC search must
     return features, a COG must start with the TIFF magic bytes and honour
     an HTTP Range request (which is what streaming reads depend on), a CMR
     search must return a collection, and so on.
  3. For each service the first healthy mirror in preference order is
     selected (or the fastest, where the service says latency is what
     matters). A mirror that failed most recent runs in --state is skipped
     while another is healthy.
  4. A timeout and retry count are derived from the latencies observed.
  5. The result is written as a config other steps read (--config-out); the
     live workflow uses it to choose its STAC catalogue and timeouts.
  6. Exit 1 when any required service has no healthy mirror. A scheduled run
     that exits 1 shows red in GitHub Actions and emails the repo owner.
     That is the alarm; nothing here prints "patched" without a check.

Run on a schedule (see .github/workflows/blue-ocean-sar-source-health.yml) or
by hand:

  python source_health.py --out health.json --config-out download_config.json
  python source_health.py --only sentinel2-search,copernicus-dem --samples 3
  python source_health.py --state state.json   # remembers the last 20 runs

Exit codes: 0 every required service has a healthy mirror; 1 at least one
does not; 2 bad input.
"""

# ---------------------------------------------------------------------------
# NOTEBOOK
#
# The pasted pipeline asked for code that would "self heal 24/7 optimizing the
# satellite data download configurations". The older AEGIS script in the case
# files did "self-healing" by printing "patch applied" and exiting 0 whatever
# happened. That is decoration (CLAUDE.md gotcha 9: what would fail if it were
# false? nothing). Here self-healing is narrower and real: probe, check the
# content, switch to a mirror that passes, widen timeouts when sources are
# slow, and go red when there is nothing left to switch to. It cannot fix a
# provider outage, rotate credentials, or rewrite code; nothing honest can.
# ---------------------------------------------------------------------------

import argparse
import datetime as _dt
import json
import math
import os
import statistics
import sys
import time

try:
    from . import fetch as F
    from . import stac
except ImportError:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import fetch as F
    import stac

VERSION = "1.0.0"
TIFF_MAGIC = (b"II*\x00", b"MM\x00*", b"II+\x00", b"MM\x00+")
PROBE_MAX_BYTES = 2 * 1024 * 1024
STATE_KEEP = 20
# A small area that every global source covers (eastern Kansas, USA).
PROBE_BBOX = [-95.30, 38.90, -95.20, 39.00]
COP_TILE = "Copernicus_DSM_COG_10_N38_00_W096_00_DEM"


def _stac_mirror(name):
    cat = stac.CATALOGS[name]
    return {"name": name, "kind": "stac", "root": cat["root"], "hosts": list(cat["hosts"])}


def default_services():
    """The built-in service list. Mirrors are tried in the order given."""
    return [
        {
            "name": "sentinel2-search", "required": True, "selection": "first-healthy",
            "collection": "sentinel-2-l2a",
            # earth-search first: its asset links are anonymous S3 COGs that
            # s2_ndvi.py / s2_change.py read directly. The others work for
            # search, but planetary-computer assets need SAS signing and CDSE
            # assets need an account.
            "mirrors": [_stac_mirror("earth-search"), _stac_mirror("planetary-computer"), _stac_mirror("cdse")],
        },
        {
            "name": "sentinel2-cog", "required": True, "selection": "first-healthy",
            "mirrors": [{
                "name": "sentinel-cogs-us-west-2", "kind": "s3-cog",
                "root": "https://sentinel-cogs.s3.us-west-2.amazonaws.com",
                "hosts": ["sentinel-cogs.s3.us-west-2.amazonaws.com"],
                "prefix": "sentinel-s2-l2a-cogs/15/S/UD/",
            }],
        },
        {
            "name": "copernicus-dem", "required": True, "selection": "first-healthy",
            "mirrors": [{
                "name": "copernicus-dem-30m-s3", "kind": "s3-cog",
                "root": "https://copernicus-dem-30m.s3.amazonaws.com",
                "hosts": ["copernicus-dem-30m.s3.amazonaws.com"],
                "prefix": f"{COP_TILE}/", "key_suffix": "_DEM.tif",
            }],
        },
        {
            "name": "usgs-3dep", "required": False, "selection": "first-healthy",
            "mirrors": [{
                "name": "nationalmap-imageserver", "kind": "arcgis-json",
                "root": "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer",
                "hosts": ["elevation.nationalmap.gov"], "expect_key": "extent",
            }],
        },
        {
            "name": "nasa-cmr", "required": False, "selection": "first-healthy",
            "mirrors": [{
                "name": "cmr-earthdata", "kind": "cmr",
                "root": "https://cmr.earthdata.nasa.gov/search/collections.json",
                "hosts": ["cmr.earthdata.nasa.gov"], "short_name": "GEDI02_A",
            }],
        },
        {
            "name": "usgs-water", "required": False, "selection": "first-healthy",
            "mirrors": [{
                "name": "nwis-waterservices", "kind": "nwis",
                "root": "https://waterservices.usgs.gov/nwis/iv/",
                "hosts": ["waterservices.usgs.gov"], "site": "06892350",
            }],
        },
    ]


# ---------------------------------------------------------------------------
# probes: each returns a short detail string or raises F.FetchError / ProbeFailed


class ProbeFailed(Exception):
    """The source answered, but the answer is not what a working source returns."""


def _json_object(r):
    """The response body as a JSON object, or ProbeFailed (a list or scalar is not a working answer)."""
    d = r.json()
    if not isinstance(d, dict):
        raise ProbeFailed(f"expected a JSON object, got {type(d).__name__}")
    return d


def _iso(d):
    return d.strftime("%Y-%m-%dT%H:%M:%SZ")


def probe_stac(m, svc, now, kw):
    body = {"collections": [svc.get("collection", "sentinel-2-l2a")], "bbox": PROBE_BBOX, "limit": 1,
            "datetime": f"{_iso(now - _dt.timedelta(days=90))}/{_iso(now)}"}
    r = F.fetch(m["root"] + "/search", allowed_hosts=m["hosts"], method="POST", json_body=body,
                headers={"Accept": "application/geo+json, application/json"}, **kw)
    # page = r.json()
    # Replaced (review 2026-10-16): a JSON list or scalar crashed the run at .get() instead of failing over.
    page = _json_object(r)
    feats = page.get("features")
    if not isinstance(feats, list):
        raise ProbeFailed("search response has no features list")
    if not feats:
        raise ProbeFailed("search returned 0 items for a 90-day window that always has scenes")
    return f"{len(feats)} item(s), first {feats[0].get('id', '?')}"


def _s3_first_tif(m, kw):
    params = {"list-type": "2", "prefix": m["prefix"], "max-keys": "200"}
    r = F.fetch(m["root"] + "/", allowed_hosts=m["hosts"], params=params, **kw)
    text = r.body.decode("utf-8", "replace")
    if "<ListBucketResult" not in text:
        raise ProbeFailed("bucket listing is not an S3 ListBucketResult")
    suffix = (m.get("key_suffix") or ".tif").lower()
    keys = [k for k in _xml_values(text, "Key") if k.lower().endswith(suffix)]
    if not keys:
        raise ProbeFailed(f"no *{suffix} under prefix {m['prefix']}")
    return keys[0]


def _xml_values(text, tag):
    out, start = [], 0
    open_t, close_t = f"<{tag}>", f"</{tag}>"
    while True:
        i = text.find(open_t, start)
        if i < 0:
            return out
        j = text.find(close_t, i)
        if j < 0:
            return out
        out.append(text[i + len(open_t):j].replace("&amp;", "&"))
        start = j + len(close_t)


def probe_s3_cog(m, svc, now, kw):
    key = _s3_first_tif(m, kw)
    rkw = dict(kw, max_bytes=4096)
    r = F.fetch(f"{m['root']}/{key}", allowed_hosts=m["hosts"], headers={"Range": "bytes=0-15"},
                accept_status=(206,), **rkw)
    head = r.body or b""
    if head[:4] not in TIFF_MAGIC:
        raise ProbeFailed(f"{key} does not start with TIFF magic bytes")
    return f"range read ok on {key}"


def probe_arcgis_json(m, svc, now, kw):
    # d = F.fetch(m["root"], allowed_hosts=m["hosts"], params={"f": "json"}, **kw).json()
    d = _json_object(F.fetch(m["root"], allowed_hosts=m["hosts"], params={"f": "json"}, **kw))
    if "error" in d:
        raise ProbeFailed(f"service error: {d['error']}")
    if m.get("expect_key") and m["expect_key"] not in d:
        raise ProbeFailed(f"service description has no '{m['expect_key']}'")
    return d.get("name") or "service description ok"


def probe_cmr(m, svc, now, kw):
    # d = F.fetch(m["root"], allowed_hosts=m["hosts"], params={"short_name": m["short_name"], "page_size": "1"},
    #             **kw).json()
    d = _json_object(F.fetch(m["root"], allowed_hosts=m["hosts"],
                             params={"short_name": m["short_name"], "page_size": "1"}, **kw))
    feed = d.get("feed")
    entries = (feed.get("entry") if isinstance(feed, dict) else None) or []
    if not isinstance(entries, list) or not all(isinstance(e, dict) for e in entries):
        raise ProbeFailed("feed.entry is not a list of objects")
    if not entries:
        raise ProbeFailed(f"no collection for short_name {m['short_name']}")
    return entries[0].get("id", "collection ok")


def probe_nwis(m, svc, now, kw):
    params = {"format": "json", "sites": m["site"], "parameterCd": "00060,00065", "period": "P2D"}
    # d = F.fetch(m["root"], allowed_hosts=m["hosts"], params=params, **kw).json()
    d = _json_object(F.fetch(m["root"], allowed_hosts=m["hosts"], params=params, **kw))
    value = d.get("value")
    series = (value.get("timeSeries") if isinstance(value, dict) else None) or []
    if not isinstance(series, list):
        raise ProbeFailed("value.timeSeries is not a list")
    if not series:
        raise ProbeFailed(f"no time series for site {m['site']}")
    return f"{len(series)} series"


PROBES = {"stac": probe_stac, "s3-cog": probe_s3_cog, "arcgis-json": probe_arcgis_json,
          "cmr": probe_cmr, "nwis": probe_nwis}


# ---------------------------------------------------------------------------
# running


def probe_mirror(m, svc, *, samples, timeout, now, opener=None, clock=time.monotonic, sleep=time.sleep):
    if m.get("kind") not in PROBES:
        raise ValueError(f"mirror {m.get('name')}: unknown kind {m.get('kind')!r}")
    kw = {"timeout": timeout, "retries": 0, "max_bytes": PROBE_MAX_BYTES, "sleep": sleep}
    if opener is not None:
        kw["opener"] = opener
    results = []
    for i in range(samples):
        t0 = clock()
        try:
            detail = PROBES[m["kind"]](m, svc, now, kw)
            results.append({"ok": True, "latency_s": round(clock() - t0, 3), "detail": detail})
        except ProbeFailed as e:
            results.append({"ok": False, "latency_s": round(clock() - t0, 3), "error": f"bad content: {e}"})
        except F.FetchError as e:
            results.append({"ok": False, "latency_s": round(clock() - t0, 3), "error": str(e),
                            "status": e.status})
        if i + 1 < samples:
            sleep(1.0)
    ok_n = sum(r["ok"] for r in results)
    lat = [r["latency_s"] for r in results if r["ok"]]
    return {
        "name": m["name"], "root": m["root"], "samples": results, "ok_samples": ok_n,
        # Healthy: at least half of this run's samples passed their content check.
        "healthy": ok_n * 2 >= samples and ok_n > 0,
        "median_latency_s": round(statistics.median(lat), 3) if lat else None,
        "max_latency_s": max(lat) if lat else None,
    }


def recommend_network(mirror_result, default_timeout):
    """Timeout = 4x the slowest successful sample (10-120 s); retries 3 if any sample failed, else 2."""
    worst = mirror_result.get("max_latency_s")
    timeout = default_timeout if worst is None else min(120.0, max(10.0, math.ceil(4 * worst)))
    retries = 3 if mirror_result["ok_samples"] < len(mirror_result["samples"]) else 2
    return timeout, retries


def history_success(state, svc_name, mirror_name):
    runs = (((state or {}).get("history") or {}).get(svc_name) or {}).get(mirror_name) or []
    if len(runs) < 4:
        return None
    return sum(1 for r in runs if r) / len(runs)


def select(svc, mirror_results, state=None):
    healthy = [r for r in mirror_results if r["healthy"]]
    if not healthy:
        return None, "no healthy mirror"
    # Skip mirrors that failed most recent runs while another is healthy now.
    # steady = [r for r in healthy if (history_success(state, svc["name"], r["name"]) or 1.0) >= 0.5]
    # Replaced (review 2026-10-16): `0.0 or 1.0` is 1.0, so a mirror that failed every recorded run was
    # treated as having no history and never skipped. None (too little history) is the only pass-through.
    steady = []
    for r in healthy:
        rate = history_success(state, svc["name"], r["name"])
        if rate is None or rate >= 0.5:
            steady.append(r)
    pool = steady or healthy
    why = "" if steady else "every healthy mirror has a poor recent record; using one anyway"
    if svc.get("selection") == "fastest-healthy":
        best = min(pool, key=lambda r: r["median_latency_s"])
        return best, why or f"fastest healthy mirror ({best['median_latency_s']} s median)"
    best = pool[0]
    if best["name"] != mirror_results[0]["name"]:
        return best, why or f"failed over from {mirror_results[0]['name']}"
    return best, why or "preferred mirror healthy"


def update_state(state, report, keep=STATE_KEEP):
    state = dict(state or {})
    hist = dict(state.get("history") or {})
    for s in report["services"]:
        sh = dict(hist.get(s["name"]) or {})
        for m in s["mirrors"]:
            sh[m["name"]] = (list(sh.get(m["name"]) or []) + [bool(m["healthy"])])[-keep:]
        hist[s["name"]] = sh
    state["history"] = hist
    state["updated_utc"] = report["checked_utc"]
    state["version"] = VERSION
    return state


def run(services, *, samples=2, timeout=20.0, state=None, now=None, opener=None,
        clock=time.monotonic, sleep=time.sleep):
    now = now or _dt.datetime.now(_dt.timezone.utc)
    out_services, config = [], {}
    for svc in services:
        mres = [probe_mirror(m, svc, samples=samples, timeout=timeout, now=now, opener=opener,
                             clock=clock, sleep=sleep) for m in svc["mirrors"]]
        best, why = select(svc, mres, state)
        entry = {"name": svc["name"], "required": bool(svc.get("required")), "mirrors": mres,
                 "selected": best["name"] if best else None, "reason": why,
                 "status": "ok" if best and best["name"] == mres[0]["name"] else
                           ("degraded" if best else "down")}
        out_services.append(entry)
        if best:
            t, r = recommend_network(best, timeout)
            config[svc["name"]] = {"mirror": best["name"], "root": best["root"], "timeout_s": t, "retries": r,
                                   "fallbacks": [m["name"] for m in mres if m["healthy"] and m is not best]}
    down_required = [s["name"] for s in out_services if s["required"] and s["status"] == "down"]
    report = {
        "tool": "source_health.py", "version": VERSION, "checked_utc": _iso(now), "samples": samples,
        "services": out_services, "down_required": down_required,
        "down_optional": [s["name"] for s in out_services if not s["required"] and s["status"] == "down"],
        "degraded": [s["name"] for s in out_services if s["status"] == "degraded"],
        "ok": not down_required,
    }
    cfg = {"generated_utc": _iso(now), "source_health_version": VERSION, "services": config}
    return report, cfg


# Fields each mirror kind reads, and their types (review 2026-10-16: malformed but valid JSON
# used to crash with a traceback instead of exit 2).
KIND_FIELDS = {"stac": {}, "s3-cog": {"prefix": str}, "arcgis-json": {}, "cmr": {"short_name": str},
               "nwis": {"site": str}}


def validate_services(services, path):
    if not isinstance(services, list) or not services:
        raise ValueError(f"{path}: expected a non-empty JSON list of services")
    names = set()
    for s in services:
        if not isinstance(s, dict) or not isinstance(s.get("name"), str) or not s["name"]:
            raise ValueError(f"{path}: every service must be an object with a name")
        if s["name"] in names:
            raise ValueError(f"{path}: duplicate service {s['name']}")
        names.add(s["name"])
        if s.get("selection", "first-healthy") not in ("first-healthy", "fastest-healthy"):
            raise ValueError(f"{path}: {s['name']}: selection must be first-healthy or fastest-healthy")
        if not isinstance(s.get("mirrors"), list) or not s["mirrors"]:
            raise ValueError(f"{path}: {s['name']}: mirrors must be a non-empty list")
        for m in s["mirrors"]:
            if not isinstance(m, dict) or not isinstance(m.get("name"), str) or not m["name"]:
                raise ValueError(f"{path}: {s['name']}: every mirror must be an object with a name")
            if m.get("kind") not in PROBES:
                raise ValueError(f"{path}: mirror {m['name']}: kind must be one of {sorted(PROBES)}")
            if not isinstance(m.get("root"), str):
                raise ValueError(f"{path}: mirror {m['name']}: root must be a URL string")
            hosts = m.get("hosts")
            if not isinstance(hosts, list) or not hosts:
                raise ValueError(f"{path}: mirror {m['name']}: hosts must be a non-empty list")
            for h in hosts:
                if not isinstance(h, str) or not h or "/" in h:
                    raise ValueError(f"{path}: bad host {h!r}")
            for field, typ in KIND_FIELDS[m["kind"]].items():
                if not isinstance(m.get(field), typ) or not m[field]:
                    raise ValueError(f"{path}: mirror {m['name']}: {m['kind']} needs a {field}")
            try:
                F.check_url(m["root"], hosts)
            except F.PolicyError as e:
                raise ValueError(f"{path}: mirror {m['name']}: {e}") from e


def load_services(path=None, only=None):
    services = default_services()
    if path:
        with open(path, encoding="utf-8") as f:
            services = json.load(f)
        # if not isinstance(services, list):
        #     raise ValueError(f"{path}: expected a JSON list of services")
        # for s in services:
        #     if not s.get("name") or not s.get("mirrors"):
        #         raise ValueError(f"{path}: every service needs a name and mirrors")
        #     for m in s["mirrors"]:
        #         if m.get("kind") not in PROBES:
        #             raise ValueError(f"{path}: mirror {m.get('name')}: kind must be one of {sorted(PROBES)}")
        #         for h in m.get("hosts") or []:
        #             if not isinstance(h, str) or "/" in h:
        #                 raise ValueError(f"{path}: bad host {h!r}")
        #         try:
        #             F.check_url(m["root"], m["hosts"])
        #         except F.PolicyError as e:
        #             raise ValueError(f"{path}: mirror {m.get('name')}: {e}") from e
        # Replaced (review 2026-10-16): a service or mirror that was not an object, or lacked root,
        # hosts or its kind's fields, crashed with a traceback. validate_services checks every shape.
        validate_services(services, path)
    if only:
        want = {x.strip() for x in only.split(",") if x.strip()}
        unknown = want - {s["name"] for s in services}
        if unknown:
            raise ValueError(f"--only: unknown service(s) {', '.join(sorted(unknown))}")
        services = [s for s in services if s["name"] in want]
    return services


def summary_markdown(report):
    lines = [f"Source health {report['checked_utc']}: {'OK' if report['ok'] else 'REQUIRED SOURCE DOWN'}", "",
             "| Service | Status | Selected | Reason |", "| --- | --- | --- | --- |"]
    for s in report["services"]:
        lines.append(f"| {s['name']} | {s['status']} | {s['selected'] or '-'} | {s['reason']} |")
    return "\n".join(lines) + "\n"


def _write_json(obj, path):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)
    os.replace(tmp, path)


def build_parser():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--services", help="JSON list of services/mirrors to use instead of the built-in list")
    ap.add_argument("--only", help="comma-separated service names to probe")
    ap.add_argument("--samples", type=int, default=2, help="probes per mirror (default 2)")
    ap.add_argument("--timeout", type=float, default=20.0, help="seconds per probe (default 20)")
    ap.add_argument("--state", help="JSON file of recent results; read, then updated after the run")
    ap.add_argument("--out", help="write the full report here (default stdout)")
    ap.add_argument("--config-out", help="write the selected mirrors, timeouts and retries here")
    ap.add_argument("--summary-md", help="append a Markdown summary here (e.g. $GITHUB_STEP_SUMMARY)")
    return ap


def main(argv=None, opener=None, now=None, sleep=time.sleep):
    a = build_parser().parse_args(argv)
    try:
        if not 1 <= a.samples <= 10:
            raise ValueError("--samples must be 1..10")
        if not 1 <= a.timeout <= 300:
            raise ValueError("--timeout must be 1..300 seconds")
        services = load_services(a.services, a.only)
        state = None
        if a.state and os.path.exists(a.state):
            with open(a.state, encoding="utf-8") as f:
                state = json.load(f)
            # Review 2026-10-16: a non-object state file used to crash in history_success().
            if not isinstance(state, dict) or not isinstance(state.get("history", {}), dict) or not all(
                    isinstance(v, dict) and all(isinstance(x, list) for x in v.values())
                    for v in state.get("history", {}).values()):
                raise ValueError(f"{a.state}: not a source_health state file")
        report, cfg = run(services, samples=a.samples, timeout=a.timeout, state=state, now=now,
                          opener=opener, sleep=sleep)
        if a.out:
            _write_json(report, a.out)
        else:
            print(json.dumps(report, indent=2))
        if a.config_out:
            _write_json(cfg, a.config_out)
        if a.state:
            _write_json(update_state(state, report), a.state)
        if a.summary_md:
            with open(a.summary_md, "a", encoding="utf-8") as f:
                f.write(summary_markdown(report))
    except (OSError, ValueError) as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    for s in report["services"]:
        if s["status"] != "ok":
            print(f"{s['status']}: {s['name']} - {s['reason']}", file=sys.stderr)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
