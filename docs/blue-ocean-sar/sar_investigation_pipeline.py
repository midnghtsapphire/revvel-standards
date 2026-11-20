"""SAR investigation pipeline.

Ties the existing tools into one run per case, following
INVESTIGATION_PROCESS.md:

  intake -> provenance -> detect (6-band CA-CFAR) -> export (GeoJSON + .cot)
         -> optional publish to a TAK server -> run manifest

Rules it inherits (and does not weaken):
- No sources, no run: process_multiband_sar raises MissingSourceError unless
  --demo is passed, and demo output is labelled UNSOURCED/SYNTHETIC.
- An empty candidate list is a valid answer; the pipeline says so and exits 0.
- Every output is a lead for a ground team, never a finding.

Usage (demo, no real data needed):
  python3 sar_investigation_pipeline.py --case-id CASE-001 --demo

Usage (real scene):
  python3 sar_investigation_pipeline.py --case-id CASE-001 \
      --raster scene.tif --source-desc "Sentinel-1 GRD S1A_..." \
      --source-ref "https://.../S1A_..." --elapsed-hours 18 \
      --lkp-lat 49.3825 --lkp-lon -122.9415 --publish-host takserver --tls
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

from provenance import DataSource
from sar_person_finder_v3 import MultiBandSAREngine


def build_sources(args):
    """DataSource list for the run. A measured source must carry a reference
    (provenance.py enforces it); --demo falls back to a synthetic source."""
    if args.raster and args.source_desc:
        return [DataSource(args.source_desc, "measured", reference=args.source_ref)]
    if args.demo:
        return [DataSource("generate_multiband_raster(): synthetic demo", "synthetic")]
    return None  # let the engine raise MissingSourceError with its own message


def publish_targets(cot_paths, args):
    """Send each .cot file to the TAK server. Returns per-file results.
    Import is lazy so detection-only runs never touch the network stack."""
    from sar_dual_comms_publisher import DualCommsTAKPublisher

    pub = DualCommsTAKPublisher(
        primary_host=args.publish_host,
        primary_port=args.publish_port,  # None -> 8089 with TLS, 8087 without
        use_tls=args.tls,
        tls_ca_file=args.ca_file,
        tls_cert_file=args.cert_file,
        tls_key_file=args.key_file,
        multicast=False,  # unencrypted; enable deliberately, not from a pipeline
    )
    results = []
    for path in cot_paths:
        with open(path, "r", encoding="utf-8") as f:
            xml = f.read()
        res = pub.publish_cot_event(xml)
        res["cot_file"] = os.path.basename(path)
        results.append(res)
        print(f"  {res['cot_file']}: primary={res['primary_status']}")
    return results


def main(argv=None):
    ap = argparse.ArgumentParser(description="One SAR investigation run per case")
    ap.add_argument("--case-id", required=True, help="case ID for file names and the manifest")
    ap.add_argument("--out-dir", default=None, help="default: runs/<case-id>")
    ap.add_argument("--lkp-lat", type=float, default=49.3825, help="last known position latitude")
    ap.add_argument("--lkp-lon", type=float, default=-122.9415, help="last known position longitude")
    ap.add_argument("--elapsed-hours", type=float, default=6.0, help="hours since LKP")
    ap.add_argument("--raster", default=None, help="6-band GeoTIFF scene; omit with --demo")
    ap.add_argument("--source-desc", default=None, help="what the raster is (product name)")
    ap.add_argument("--source-ref", default="", help="URL, path or scene ID a third party can check")
    ap.add_argument("--geolocation-error-m", type=float, default=None,
                    help="stated 1-sigma geolocation error (CoT ce is 'unknown' without it)")
    ap.add_argument("--demo", action="store_true",
                    help="synthetic raster, unverified exports allowed; labelled SYNTHETIC")
    ap.add_argument("--publish-host", default=None, help="TAK server; omit to skip publishing")
    ap.add_argument("--publish-port", type=int, default=None)
    ap.add_argument("--tls", action="store_true")
    ap.add_argument("--ca-file", default=None)
    ap.add_argument("--cert-file", default=None)
    ap.add_argument("--key-file", default=None)
    args = ap.parse_args(argv)

    if args.raster and not args.source_desc:
        ap.error("--raster needs --source-desc (and --source-ref) so the scene is sourced")
    if not args.raster and not args.demo:
        ap.error("give --raster (a real scene) or --demo (synthetic)")

    out_dir = args.out_dir or os.path.join("runs", args.case_id)
    os.makedirs(out_dir, exist_ok=True)
    started = datetime.now(timezone.utc)

    # 1. Engine, configured from the case facts (not defaults standing in for facts).
    engine = MultiBandSAREngine(
        lkp_lat=args.lkp_lat,
        lkp_lon=args.lkp_lon,
        elapsed_hours=args.elapsed_hours,
        geolocation_error_m=args.geolocation_error_m,
    )

    # 2. Scene: real raster, or a generated synthetic one for demos.
    raster = args.raster
    if raster is None:
        raster = os.path.join(out_dir, "synthetic_demo_scene.tif")
        engine.generate_multiband_raster(raster)
        print(f"[demo] synthetic scene written to {raster}")

    # 3. Detect. MissingSourceError propagates with its own message by design.
    sources = build_sources(args)
    targets = engine.process_multiband_sar(
        raster, sources=sources, allow_unverified=args.demo
    )
    if not targets:
        print("No cell passed the CFAR threshold: no candidates. "
              "That is a valid result, not an error.")

    # 4. Export (gated by require_export_provenance inside the engine).
    geojson_path = os.path.join(out_dir, f"{args.case_id}_candidates.geojson")
    cot_dir = os.path.join(out_dir, "cot")
    cot_paths = []
    if targets:
        engine.export_geojson(targets, geojson_path, allow_unverified=args.demo)
        cot_paths = engine.export_cot_files(targets, cot_dir, allow_unverified=args.demo)
        print(f"{len(targets)} candidate(s) -> {geojson_path} and {len(cot_paths)} .cot file(s)")

    # 5. Optional publish. SENT means unacknowledged bytes, nothing more.
    publish_results = []
    if args.publish_host and cot_paths:
        print(f"Publishing to {args.publish_host} ({'TLS' if args.tls else 'plain TCP'})...")
        publish_results = publish_targets(cot_paths, args)

    # 6. Run manifest: what ran, on what, with what result. The scene hash in
    # each target already pins the input; this records the run as a whole.
    manifest = {
        "case_id": args.case_id,
        "started_utc": started.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "raster": os.path.abspath(raster),
        "demo": args.demo,
        "lkp": {"lat": args.lkp_lat, "lon": args.lkp_lon},
        "elapsed_hours": args.elapsed_hours,
        "candidates": len(targets),
        "scene_sha256": targets[0]["scene_sha256"] if targets else None,
        "run_id": targets[0]["run_id"] if targets else None,
        "geojson": geojson_path if targets else None,
        "cot_files": [os.path.basename(p) for p in cot_paths],
        "publish": publish_results,
        "ground_verified": False,  # always; only a ground search confirms
    }
    manifest_path = os.path.join(out_dir, f"{args.case_id}_run_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
    print(f"Run manifest: {manifest_path}")

    # Exit code: 0 for a clean run (even with zero candidates); 1 when a
    # requested publish sent nothing on any channel.
    if args.publish_host and cot_paths and not any(r["sent_via"] for r in publish_results):
        print("NOT SENT on any channel.", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
