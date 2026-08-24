#!/usr/bin/env python3
"""Repaint spike gate.

Renders one track, repaints spans of increasing width, and measures whether the
result is still the same singer with an inaudible seam. Writes a verdict.

    python scripts/spike/run_spike.py \
        --checkpoint-path /models/ace-step \
        --out-dir artifacts/spike-001

This is a GATE, not a demo. If it reports FAIL, WR-REPAINT-EDITOR stops at the
spike and reports, rather than building an editor on a core that cannot hold a
voice steady across an edit. Failing here costs a few GPU-hours. Failing after
the editor is built costs the quarter.
"""

from __future__ import annotations

import argparse
import json
import pathlib
import statistics
import sys
import time

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / "packages"))

from repaint_core import Conditioning, Edit, RepaintEngine  # noqa: E402
from repaint_core.metrics import (  # noqa: E402
    load_span,
    seam_discontinuity,
    voice_similarity,
)

# ---------------------------------------------------------------------------
# The bar. Set before running, not after seeing results.
# ---------------------------------------------------------------------------

# Speaker-embedding cosine between the original span and the repainted span.
# Below this, listeners hear a different singer on the repaired word.
MIN_VOICE_SIMILARITY = 0.80

# Seam flux z-score must not exceed the track's own 99th-percentile transition.
# Stated relative to the music because real songs contain loud legitimate jumps.
MAX_SEAM_Z_OVER_P99 = 1.5

# A word is roughly half a second. If the narrowest usable mask is wider than
# this, "fix one word" is not a feature -- you are regenerating whole phrases.
MAX_USABLE_MASK_S = 2.0

MASK_WIDTHS_S = (0.5, 1.0, 2.0, 4.0)

BASE_PROMPT = (
    "roots rock, 2020s, dry intimate production, acoustic guitar, harmonica, "
    "brushed snare, upright bass, weathered baritone male vocal, no reverb on "
    "vocals, 100 bpm, A major"
)

BASE_LYRICS = """[verse]
Packed the duffel with a rusted zipper pull
Left the coffee cold inside the mug
Didn't kiss the doorframe, didn't check the mail
Just watched the shadow stretch across the rug

[chorus]
Got gravel in the shoe and a hole in the plan
Watching the county line blur in the fan
Head down, walking out of the cloud
"""

# Same sheet, one word changed. This is what "fix one word" actually submits.
EDIT_LYRICS = BASE_LYRICS.replace("rusted zipper pull", "broken zipper pull")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--checkpoint-path", default="", help="ACE-Step checkpoint dir")
    ap.add_argument("--out-dir", default="artifacts/spike", type=pathlib.Path)
    ap.add_argument("--seed", type=int, default=20260823)
    ap.add_argument("--duration", type=float, default=60.0)
    ap.add_argument("--gpu-cost-per-hour", type=float, default=1.80,
                    help="USD/hr for the rented GPU, used for cost-per-edit")
    args = ap.parse_args()

    out: pathlib.Path = args.out_dir
    out.mkdir(parents=True, exist_ok=True)

    conditioning = Conditioning(
        prompt=BASE_PROMPT,
        audio_duration=args.duration,
        seed=args.seed,
    )
    engine = RepaintEngine(args.checkpoint_path)

    # --- 1. base render -----------------------------------------------------
    base_path = out / "base.wav"
    print(f"[spike] rendering base track -> {base_path}")
    t0 = time.perf_counter()
    pipeline = engine._load()
    pipeline(
        task="text2music",
        prompt=BASE_PROMPT,
        lyrics=BASE_LYRICS,
        manual_seeds=[args.seed],
        save_path=str(base_path),
        **{k: v for k, v in conditioning.to_dict().items()
           if k not in ("seed", "prompt")},
    )
    base_elapsed = time.perf_counter() - t0
    print(f"[spike] base render took {base_elapsed:.1f}s")

    # Edit spans sit mid-phrase, away from section boundaries, so a clean seam
    # cannot be an accident of landing on a natural transition.
    center_s = 12.0
    rows: list[dict] = []

    for width in MASK_WIDTHS_S:
        start_s = center_s - width / 2
        end_s = center_s + width / 2

        for label, lyrics in (("repaint", None), ("edit", EDIT_LYRICS)):
            dest = out / f"{label}_{width:g}s.wav"
            print(f"[spike] {label} width={width}s -> {dest.name}")
            try:
                receipt = engine.apply(
                    src_audio_path=str(base_path),
                    conditioning=conditioning,
                    edit=Edit(start_s=start_s, end_s=end_s, lyrics=lyrics),
                    source_lyrics=BASE_LYRICS,
                    save_path=str(dest),
                )
            except Exception as exc:  # noqa: BLE001 - a failed run is a datapoint
                rows.append({"op": label, "width_s": width, "error": repr(exc)})
                print(f"[spike]   FAILED: {exc}")
                continue

            orig_span, sr = load_span(str(base_path), start_s, end_s)
            new_span, _ = load_span(str(dest), start_s, end_s)
            full, full_sr = load_span(str(dest), 0.0, args.duration)

            seam = seam_discontinuity(full, full_sr, start_s=start_s, end_s=end_s)
            sim = voice_similarity(orig_span, new_span, sr)

            rows.append({
                "op": label,
                "width_s": width,
                "elapsed_s": receipt["elapsed_s"],
                "cost_usd": round(
                    receipt["elapsed_s"] / 3600 * args.gpu_cost_per_hour, 4
                ),
                "voice_similarity": None if sim is None else round(sim, 4),
                "seam_z_worst": round(seam.worst, 3),
                "seam_baseline_p99": round(seam.baseline_p99, 3),
                "seam_headroom": round(seam.baseline_p99 * MAX_SEAM_Z_OVER_P99
                                       - seam.worst, 3),
            })

    # --- 2. verdict ---------------------------------------------------------
    ok = [r for r in rows if "error" not in r]
    unmeasured = [r for r in ok if r["voice_similarity"] is None]

    def passes(r: dict) -> bool:
        if r["voice_similarity"] is None:
            return False
        return (
            r["voice_similarity"] >= MIN_VOICE_SIMILARITY
            and r["seam_z_worst"] <= r["seam_baseline_p99"] * MAX_SEAM_Z_OVER_P99
        )

    passing = [r for r in ok if passes(r)]
    narrowest = min((r["width_s"] for r in passing), default=None)

    if unmeasured:
        verdict, reason = "INCONCLUSIVE", (
            "voice drift was not measured (resemblyzer missing) -- a PASS cannot "
            "be claimed without it"
        )
    elif not passing:
        verdict, reason = "FAIL", "no mask width held voice identity and seam"
    elif narrowest > MAX_USABLE_MASK_S:
        verdict, reason = "FAIL", (
            f"narrowest usable mask is {narrowest}s (> {MAX_USABLE_MASK_S}s) -- "
            "too coarse for single-word edits"
        )
    else:
        verdict, reason = "PASS", f"single-word edits viable at {narrowest}s masks"

    report = {
        "verdict": verdict,
        "reason": reason,
        "bar": {
            "min_voice_similarity": MIN_VOICE_SIMILARITY,
            "max_seam_z_over_p99": MAX_SEAM_Z_OVER_P99,
            "max_usable_mask_s": MAX_USABLE_MASK_S,
        },
        "seed": args.seed,
        "base_render_s": round(base_elapsed, 2),
        "narrowest_passing_mask_s": narrowest,
        "median_cost_usd_per_edit": (
            round(statistics.median([r["cost_usd"] for r in ok]), 4) if ok else None
        ),
        "rows": rows,
    }

    (out / "spike.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"\n[spike] {verdict}: {reason}")
    print(f"[spike] wrote {out / 'spike.json'}")
    return 0 if verdict == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
