import argparse
import json
from .acquire import fetch, save_manifest, verify_manifest, timeline
from .pipeline import analyze, verify_run
from .archive import inspect_file, register, verify as archive_verify, sources
# Original: from .historical import run as historical_run, inspect as historical_inspect, verify as historical_verify
#   importing it here made every command (CSV, archive, download) require NumPy; it is now
#   imported only in the branches that use the GeoTIFF pipeline.

p = argparse.ArgumentParser(prog="python -m hfmr")
s = p.add_subparsers(dest="cmd", required=True)
a = s.add_parser("analyze")
a.add_argument("--case", required=True)
a.add_argument("--input", required=True)
a.add_argument("--output", required=True)
a.add_argument("--before")
a.add_argument("--threshold", type=float, default=3.5)
a.add_argument("--cell-size-m", type=float)
a.add_argument("--origin-x", type=float)
a.add_argument("--origin-y", type=float)
a.add_argument("--crs")
h = s.add_parser("historical")
h.add_argument("--case", required=True)
h.add_argument("--before", required=True)
h.add_argument("--after", required=True)
h.add_argument("--output", required=True)
h.add_argument("--threshold", type=float, default=3.5)
h.add_argument("--min-pixels", type=int, default=2)
h.add_argument("--band", type=int, default=1)
h.add_argument("--resampling", choices=["nearest", "bilinear"], default="bilinear")
i = s.add_parser("inspect")
i.add_argument("--input", required=True)
v = s.add_parser("verify")
v.add_argument("--output", required=True)
ar = s.add_parser("archive-inspect")
ar.add_argument("--input", required=True)
reg = s.add_parser("archive-register")
reg.add_argument("--input", required=True)
reg.add_argument("--case", required=True)
reg.add_argument("--source-id", required=True)
reg.add_argument("--output", required=True)
reg.add_argument("--acquired")
reg.add_argument("--acquisition-basis", default="unknown")
reg.add_argument("--source-url")
av = s.add_parser("archive-verify")
av.add_argument("--manifest", required=True)
av.add_argument("--input", required=True)
sr = s.add_parser("archive-sources")
sr.add_argument("--registry", default="source_registry.csv")
tl = s.add_parser("archive-timeline")
tl.add_argument("--registry", default="source_registry.csv")
d = s.add_parser("archive-download")
d.add_argument("--url", required=True)
d.add_argument("--output", required=True)
d.add_argument("--manifest", required=True)
d.add_argument("--allow-host", action="append", required=True)
d.add_argument("--max-mb", type=int, default=100)
dv = s.add_parser("download-verify")
dv.add_argument("--manifest", required=True)
args = p.parse_args()
if args.cmd == "archive-timeline":
    print(json.dumps(timeline(args.registry), indent=2))
elif args.cmd == "archive-download":
    if __import__("pathlib").Path(args.manifest).exists():
        raise FileExistsError(args.manifest)
    m = fetch(args.url, args.output, args.allow_host, args.max_mb * 1024 * 1024)
    save_manifest(m, args.manifest)
    print(json.dumps(m, indent=2))
elif args.cmd == "download-verify":
    ok = verify_manifest(args.manifest)
    print("VERIFIED" if ok else "FAILED")
    raise SystemExit(0 if ok else 1)
elif args.cmd == "archive-inspect":
    print(json.dumps(inspect_file(args.input), indent=2, default=str))
elif args.cmd == "archive-register":
    print(
        json.dumps(
            register(
                args.input,
                args.case,
                args.source_id,
                args.output,
                args.acquired,
                args.acquisition_basis,
                args.source_url,
            ),
            indent=2,
            default=str,
        )
    )
elif args.cmd == "archive-verify":
    ok = archive_verify(args.manifest, args.input)
    print("VERIFIED" if ok else "FAILED")
    raise SystemExit(0 if ok else 1)
elif args.cmd == "archive-sources":
    print(json.dumps(sources(args.registry), indent=2))
elif args.cmd == "analyze":
    origin = None if args.origin_x is None or args.origin_y is None else [args.origin_x, args.origin_y]
    r = analyze(
        args.case,
        args.input,
        args.output,
        before=args.before,
        threshold=args.threshold,
        cell_size_m=args.cell_size_m,
        origin_xy=origin,
        crs=args.crs,
    )
    print(json.dumps({"candidates": r["result"]["candidate_count"], "output": args.output}))
elif args.cmd == "historical":
    from .historical import run as historical_run

    r = historical_run(
        args.case, args.before, args.after, args.output, args.threshold, args.min_pixels, args.band, args.resampling
    )
    print(
        json.dumps(
            {
                "candidates": r["outputs"]["candidate_count"],
                "overlap": r["processing"]["valid_overlap_fraction"],
                "output": args.output,
            }
        )
    )
elif args.cmd == "inspect":
    from .historical import inspect as historical_inspect

    print(json.dumps(historical_inspect(args.input), indent=2))
else:
    # Original:
    # ok = (
    #     historical_verify(args.output)
    #     if (__import__("pathlib").Path(args.output) / "difference.tif").exists()
    #     else verify_run(args.output)
    # )
    #   it inferred the run type from difference.tif existing, so deleting that raster sent a
    #   historical run to the generic verifier (which passed) and a stale difference.tif in a
    #   scalar run crashed. The verifier is now chosen from the manifest schema.
    try:
        schema = json.loads((__import__("pathlib").Path(args.output) / "manifest.json").read_text()).get("schema")
        if schema == "hfmr.historical.v1":
            from .historical import verify as historical_verify

            ok = historical_verify(args.output)
        # Original:
        # else:
        #     ok = verify_run(args.output)
        #   any unknown or missing schema fell through to the scalar verifier and could print
        #   VERIFIED; only the schema pipeline.analyze writes is verified as a scalar run now.
        elif schema == "hfmr.run.v1":
            ok = verify_run(args.output)
        else:
            ok = False
    # Original: except (OSError, ValueError, KeyError, AttributeError):
    #   a ledger event that is a list or string raised TypeError and crashed verify.
    except (OSError, ValueError, KeyError, AttributeError, TypeError, IndexError):
        # Missing or unreadable manifest, ledger or output artifact: not verified.
        ok = False
    print("VERIFIED" if ok else "FAILED")
    raise SystemExit(0 if ok else 1)

# Module 4 standalone CLI is exposed via: python -m hfmr.construction_cli
