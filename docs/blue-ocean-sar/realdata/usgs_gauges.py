"""USGS NWIS Instantaneous Values (IV) client and gauge comparison.

Service: ``https://waterservices.usgs.gov/nwis/iv/`` with ``sites``,
``startDT``, ``endDT``, ``parameterCd`` and ``format=json``. Parameter codes:

* ``00060`` discharge (ft3/s)
* ``00065`` gauge height (ft)
* ``00010`` water temperature (deg C)

The JSON is WaterML-as-JSON. The parser reads exactly these paths:

* ``value.timeSeries[]``
* ``.sourceInfo.siteCode[0].value`` and ``.sourceInfo.siteName``
* ``.variable.variableCode[0].value``, ``.variable.unit.unitCode``,
  ``.variable.noDataValue`` (``-999999`` in practice)
* ``.values[k].value[]`` with ``value`` (a string), ``dateTime`` and
  ``qualifiers``; ``.values[k].qualifier[]`` gives qualifier descriptions;
  ``.values[k].method[0].methodID`` separates multiple sensors at one site.

A point whose value equals ``noDataValue`` (or ``-999999``) is kept with
``value=None`` so gaps stay visible.

Gauge comparison
----------------
``compare_gauges`` reports discharge and temperature stats per site and flags
when two gauges in the same window differ by more than ``factor`` (default 3x).
**It cannot know which gauge governs the incident reach.** Confluences, dams
and tributaries decide that, and this tool has no river topology. The user must
say which gauge governs (``--governing``) and, optionally, which one is the
obvious-but-maybe-wrong one (``--obvious``). Without ``--governing`` the tool
only reports that the gauges disagree.

Network: uses ``urllib`` only. Where the host is unreachable, save a response
with a browser or ``curl`` elsewhere and pass it with ``--from-file``. Output
always records whether data came from the live service or a file.

CLI::

    python usgs_gauges.py --sites 12439500,12442500 --start 2026-05-27T00:00-07:00 --end 2026-05-28T23:59-07:00 \\
        --governing 12442500 --obvious 12439500 --out-csv iv.csv --out-json compare.json
    python usgs_gauges.py --from-file saved_iv.json --governing 12442500 --obvious 12439500

Exit codes: 0 ok; 1 the gauge-mismatch flag was raised (with ``--fail-on-mismatch``);
2 fetch/parse error or no discharge data for a named gauge.
"""

from __future__ import annotations

import argparse
import csv
import json
import statistics
import sys
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field

IV_URL = "https://waterservices.usgs.gov/nwis/iv/"
PARAMS = {"00060": "discharge", "00065": "gauge_height", "00010": "water_temp"}
DEFAULT_PARAMS = ("00060", "00065", "00010")
NO_DATA = -999999.0

GOVERNING_NOTE = (
    "This tool cannot know which gauge governs the incident reach: confluences, dams and tributaries decide that "
    "and no river topology is given to it. State the governing gauge explicitly (--governing) after placing the "
    "incident on the reach relative to confluences."
)


@dataclass
class Point:
    datetime: str
    value: float | None
    qualifiers: tuple


@dataclass
class Series:
    site: str
    site_name: str
    parameter_code: str
    parameter: str
    variable_name: str
    unit: str
    no_data_value: float
    method_id: str
    points: list = field(default_factory=list)
    qualifier_descriptions: dict = field(default_factory=dict)

    def values(self) -> list:
        return [p.value for p in self.points if p.value is not None]

    def stats(self) -> dict:
        v = self.values()
        quals: dict = {}
        for p in self.points:
            for q in p.qualifiers:
                quals[q] = quals.get(q, 0) + 1
        out = {
            "site": self.site,
            "site_name": self.site_name,
            "parameter_code": self.parameter_code,
            "parameter": self.parameter,
            "unit": self.unit,
            "method_id": self.method_id,
            "n_points": len(self.points),
            "n_missing": len(self.points) - len(v),
            "qualifier_counts": quals,
            "qualifier_descriptions": {k: self.qualifier_descriptions.get(k, "") for k in quals},
            "first_time": self.points[0].datetime if self.points else None,
            "last_time": self.points[-1].datetime if self.points else None,
        }
        if v:
            out.update(min=min(v), max=max(v), mean=statistics.fmean(v), median=statistics.median(v))
        else:
            out.update(min=None, max=None, mean=None, median=None)
        return out


class NWISError(RuntimeError):
    pass


def build_iv_url(sites, start: str, end: str, params=DEFAULT_PARAMS) -> str:
    if isinstance(sites, str):
        sites = [s for s in sites.split(",") if s]
    if isinstance(params, str):
        params = [p for p in params.split(",") if p]
    q = {
        "sites": ",".join(s.strip() for s in sites),
        "startDT": start,
        "endDT": end,
        "parameterCd": ",".join(params),
        "format": "json",
    }
    return IV_URL + "?" + urllib.parse.urlencode(q, safe=",:")


def fetch_iv(sites, start: str, end: str, params=DEFAULT_PARAMS, timeout: float = 30.0) -> dict:
    url = build_iv_url(sites, start, end, params)
    req = urllib.request.Request(url, headers={"User-Agent": "revvel-sar-realdata/1.0", "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:  # nosec B310 - fixed https host
            return json.loads(r.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
        raise NWISError(f"NWIS IV request failed ({url}): {exc}") from exc


def _to_float(raw, no_data: float):
    if raw is None:
        return None
    try:
        v = float(raw)
    except (TypeError, ValueError):
        return None
    if v == no_data or v == NO_DATA:
        return None
    return v


def parse_iv(doc: dict) -> list[Series]:
    """Parse an NWIS IV JSON document into one ``Series`` per site/parameter/method."""
    try:
        ts_list = doc["value"]["timeSeries"]
    except (KeyError, TypeError) as exc:
        raise NWISError("not an NWIS IV JSON document: missing value.timeSeries") from exc
    out = []
    for ts in ts_list:
        try:
            site = ts["sourceInfo"]["siteCode"][0]["value"]
            var = ts["variable"]
            pcode = var["variableCode"][0]["value"]
        except (KeyError, IndexError, TypeError) as exc:
            raise NWISError(f"timeSeries entry missing site or variable code: {exc}") from exc
        unit = (var.get("unit") or {}).get("unitCode", "")
        nd = var.get("noDataValue", NO_DATA)
        nd = float(nd) if nd is not None else NO_DATA
        for block in ts.get("values", []):
            methods = block.get("method") or [{}]
            method_id = str(methods[0].get("methodID", ""))
            qdesc = {q.get("qualifierCode"): q.get("qualifierDescription", "") for q in block.get("qualifier") or []}
            s = Series(
                site=site,
                site_name=ts["sourceInfo"].get("siteName", ""),
                parameter_code=pcode,
                parameter=PARAMS.get(pcode, pcode),
                variable_name=var.get("variableName", ""),
                unit=unit,
                no_data_value=nd,
                method_id=method_id,
                qualifier_descriptions=qdesc,
            )
            for v in block.get("value", []):
                s.points.append(
                    Point(v.get("dateTime"), _to_float(v.get("value"), nd), tuple(v.get("qualifiers") or ()))
                )
            out.append(s)
    return out


def tidy_rows(series: list[Series]) -> list[dict]:
    rows = []
    for s in series:
        for p in s.points:
            rows.append(
                {
                    "site": s.site,
                    "parameter_code": s.parameter_code,
                    "parameter": s.parameter,
                    "unit": s.unit,
                    "method_id": s.method_id,
                    "datetime": p.datetime,
                    "value": "" if p.value is None else p.value,
                    "missing": p.value is None,
                    "qualifiers": ";".join(p.qualifiers),
                }
            )
    return rows


def by_parameter(series: list[Series]) -> dict:
    out: dict = {}
    for s in series:
        out.setdefault(s.parameter, []).append(s)
    return out


def _site_param(series, site, pcode):
    hits = [s for s in series if s.site == site and s.parameter_code == pcode and s.values()]
    return hits[0] if hits else None


def compare_gauges(series: list[Series], governing: str | None = None, obvious: str | None = None, factor=3.0) -> dict:
    """Per-site discharge/temperature stats and a mismatch flag (median discharge ratio > factor)."""
    if factor <= 1:
        raise ValueError("factor must be > 1")
    sites = sorted({s.site for s in series})
    per_site = {}
    for site in sites:
        q = _site_param(series, site, "00060")
        t = _site_param(series, site, "00010")
        per_site[site] = {
            "site_name": (q or t).site_name if (q or t) else "",
            "discharge": q.stats() if q else None,
            "water_temp": t.stats() if t else None,
        }
    medians = {s: d["discharge"]["median"] for s, d in per_site.items() if d["discharge"]}
    result = {
        "sites": per_site,
        "factor": factor,
        "governing_site": governing,
        "obvious_site": obvious,
        "note": GOVERNING_NOTE,
        "mismatch": False,
        "ratio": None,
        "message": "",
    }
    for role, site in (("governing", governing), ("obvious", obvious)):
        if site and site not in medians:
            raise NWISError(f"{role} gauge {site} has no discharge (00060) data in this response")
    if governing and obvious:
        ratio = medians[governing] / medians[obvious] if medians[obvious] else float("inf")
        big = max(ratio, 1 / ratio) if ratio not in (0, float("inf")) else float("inf")
        result["ratio"] = ratio
        result["mismatch"] = big > factor
        result["message"] = (
            f"Median discharge: governing {governing} = {medians[governing]:g}, obvious {obvious} = "
            f"{medians[obvious]:g} (ratio {ratio:.1f}x). "
            + (
                f"MISMATCH > {factor:g}x: drift and danger estimates from {obvious} would be wrong for this reach."
                if result["mismatch"]
                else f"Within {factor:g}x."
            )
        )
    elif len(medians) >= 2:
        hi = max(medians, key=medians.get)
        lo = min(medians, key=medians.get)
        ratio = medians[hi] / medians[lo] if medians[lo] else float("inf")
        result["ratio"] = ratio
        result["mismatch"] = ratio > factor
        result["message"] = (
            f"Gauges disagree by {ratio:.1f}x ({hi} = {medians[hi]:g} vs {lo} = {medians[lo]:g}). "
            "No governing gauge stated, so the tool does not pick one."
            if result["mismatch"]
            else f"Gauges within {factor:g}x. No governing gauge stated."
        )
        if governing:
            result["message"] += f" Governing gauge {governing} stated; give --obvious to compare it to one gauge."
    else:
        result["message"] = "Need discharge from at least two gauges to compare."
    return result


def _write_csv(rows, path):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=[
                "site",
                "parameter_code",
                "parameter",
                "unit",
                "method_id",
                "datetime",
                "value",
                "missing",
                "qualifiers",
            ],
        )
        w.writeheader()
        w.writerows(rows)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description="USGS NWIS IV client and gauge comparison")
    ap.add_argument("--sites", help="comma-separated USGS site numbers")
    ap.add_argument("--start", help="startDT, ISO-8601 (e.g. 2026-05-27T00:00-07:00)")
    ap.add_argument("--end", help="endDT, ISO-8601")
    ap.add_argument("--params", default=",".join(DEFAULT_PARAMS))
    ap.add_argument("--from-file", nargs="+", help="saved NWIS IV JSON response(s); no network used")
    ap.add_argument("--governing", help="site number YOU have determined governs the incident reach")
    ap.add_argument("--obvious", help="site number of the nearest/obvious gauge to compare against")
    ap.add_argument("--factor", type=float, default=3.0)
    ap.add_argument("--out-csv")
    ap.add_argument("--out-json")
    ap.add_argument("--fail-on-mismatch", action="store_true", help="exit 1 when the mismatch flag is raised")
    ap.add_argument("--print-url", action="store_true", help="print the request URL and exit")
    a = ap.parse_args(argv)

    if a.print_url:
        if not (a.sites and a.start and a.end):
            ap.error("--print-url needs --sites, --start and --end")
        print(build_iv_url(a.sites, a.start, a.end, a.params))
        return 0
    try:
        if a.from_file:
            series = []
            for p in a.from_file:
                with open(p, encoding="utf-8") as f:
                    series.extend(parse_iv(json.load(f)))
            provenance = {"source": "file", "files": a.from_file, "live": False}
        else:
            if not (a.sites and a.start and a.end):
                ap.error("give --sites/--start/--end, or --from-file")
            series = parse_iv(fetch_iv(a.sites, a.start, a.end, a.params))
            provenance = {"source": "live", "url": build_iv_url(a.sites, a.start, a.end, a.params), "live": True}
        cmp = compare_gauges(series, a.governing, a.obvious, a.factor)
    except (NWISError, OSError, json.JSONDecodeError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    print(f"data source: {provenance['source']}" + ("" if provenance["live"] else " (NOT live; saved response)"))
    for site, d in cmp["sites"].items():
        q, t = d["discharge"], d["water_temp"]
        qs = (
            f"Q median {q['median']:g} {q['unit']} (min {q['min']:g}, max {q['max']:g}, missing {q['n_missing']})"
            if q
            else "Q n/a"
        )
        ts = f"T median {t['median']:g} {t['unit']}" if t else "T n/a"
        print(f"{site} {d['site_name']}: {qs}; {ts}")
    print(cmp["message"])
    print("NOTE: " + cmp["note"])
    if a.out_csv:
        _write_csv(tidy_rows(series), a.out_csv)
    if a.out_json:
        with open(a.out_json, "w", encoding="utf-8") as f:
            json.dump({"provenance": provenance, "comparison": cmp}, f, indent=2)
    return 1 if (a.fail_on_mismatch and cmp["mismatch"]) else 0


if __name__ == "__main__":
    sys.exit(main())
