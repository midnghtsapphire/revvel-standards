"""Masked-repaint primitive over ACE-Step.

One operation backs both product features:

    fix a word        -> task="edit",    new lyrics into the masked span
    remove an artifact -> task="repaint", lyrics unchanged over the masked span

Both hold seed and conditioning fixed so the repaired span keeps the singer's
identity. That is the entire product thesis; see docs/repaint/CONSISTENCY.md.

The ACE-Step pipeline is loaded lazily so this module can be imported (and its
request-building logic tested) on a machine with no GPU and no checkpoints.
"""

from __future__ import annotations

import dataclasses
import json
import pathlib
import time
from typing import Any, Literal, Sequence

Task = Literal["repaint", "edit"]

# ACE-Step generation settings that must not drift between the source render
# and any later repaint of it. Changing any of these changes the singer.
CONDITIONING_FIELDS = (
    "prompt",
    "audio_duration",
    "infer_step",
    "guidance_scale",
    "scheduler_type",
    "cfg_type",
    "omega_scale",
    "guidance_interval",
    "guidance_interval_decay",
    "min_guidance_scale",
    "use_erg_tag",
    "use_erg_lyric",
    "use_erg_diffusion",
    "guidance_scale_text",
    "guidance_scale_lyric",
    "lora_name_or_path",
    "lora_weight",
)


class ConditioningMismatch(ValueError):
    """Raised when a repaint would run under different conditioning than the source.

    This is a hard error rather than a warning: a silent mismatch produces a
    repaired span in a subtly different voice, which is the single failure mode
    the product exists to avoid.
    """


@dataclasses.dataclass(frozen=True)
class Conditioning:
    """Locked generation settings for one song.

    Persisted alongside the audio. Every repaint of that audio replays it.
    """

    prompt: str
    audio_duration: float
    seed: int
    infer_step: int = 60
    guidance_scale: float = 15.0
    scheduler_type: str = "euler"
    cfg_type: str = "apg"
    omega_scale: float = 10.0
    guidance_interval: float = 0.5
    guidance_interval_decay: float = 0.0
    min_guidance_scale: float = 3.0
    use_erg_tag: bool = True
    use_erg_lyric: bool = True
    use_erg_diffusion: bool = True
    guidance_scale_text: float = 0.0
    guidance_scale_lyric: float = 0.0
    lora_name_or_path: str = "none"
    lora_weight: float = 1.0

    def to_dict(self) -> dict[str, Any]:
        return dataclasses.asdict(self)

    @classmethod
    def from_dict(cls, raw: dict[str, Any]) -> "Conditioning":
        known = {f.name for f in dataclasses.fields(cls)}
        return cls(**{k: v for k, v in raw.items() if k in known})

    def assert_matches(self, other: "Conditioning") -> None:
        drifted = [
            f
            for f in CONDITIONING_FIELDS
            if getattr(self, f) != getattr(other, f)
        ]
        if drifted:
            raise ConditioningMismatch(
                "conditioning drifted from source render on: "
                + ", ".join(drifted)
                + " -- repainting under different conditioning changes the singer"
            )


@dataclasses.dataclass(frozen=True)
class Edit:
    """One masked edit against a source render.

    start_s / end_s bound the span to regenerate. `lyrics` is the FULL lyric
    sheet for the song, with the replacement word already substituted -- ACE-Step
    edits against a whole target sheet, not a fragment.

    Leave `lyrics` as None for artifact removal: the span is re-rendered from the
    original lyric sheet, which is what makes glitch-removal and word-replacement
    the same operation with a different payload.
    """

    start_s: float
    end_s: float
    lyrics: str | None = None
    # How much of the diffusion trajectory the edit is allowed to touch.
    # Narrow band = closer to the original, less freedom to fix the problem.
    n_min: float = 0.0
    n_max: float = 1.0

    @property
    def task(self) -> Task:
        return "edit" if self.lyrics is not None else "repaint"

    def validate(self, duration_s: float) -> None:
        if self.start_s < 0:
            raise ValueError(f"start_s must be >= 0, got {self.start_s}")
        if self.end_s <= self.start_s:
            raise ValueError(
                f"end_s ({self.end_s}) must be greater than start_s ({self.start_s})"
            )
        if self.end_s > duration_s:
            raise ValueError(
                f"end_s ({self.end_s}) exceeds source duration ({duration_s})"
            )
        if not 0.0 <= self.n_min <= self.n_max <= 1.0:
            raise ValueError(
                f"require 0 <= n_min <= n_max <= 1, got {self.n_min}/{self.n_max}"
            )


def build_request(
    *,
    src_audio_path: str,
    conditioning: Conditioning,
    edit: Edit,
    source_lyrics: str,
    save_path: str,
) -> dict[str, Any]:
    """Map an Edit onto ACE-Step pipeline kwargs.

    Pure function -- no GPU, no model, no I/O. This is the piece worth testing,
    because every consistency guarantee the product makes is expressed here.

    ACE-Step takes repaint bounds as integer seconds, so spans are widened
    outward (floor the start, ceil the end) rather than rounded. Rounding inward
    would leave a sliver of the defect behind, which is worse than repainting a
    few extra milliseconds of clean audio.
    """
    edit.validate(conditioning.audio_duration)

    import math

    repaint_start = int(math.floor(edit.start_s))
    repaint_end = int(math.ceil(edit.end_s))
    if repaint_end <= repaint_start:
        repaint_end = repaint_start + 1

    request: dict[str, Any] = {
        "task": edit.task,
        "src_audio_path": src_audio_path,
        "repaint_start": repaint_start,
        "repaint_end": repaint_end,
        "lyrics": source_lyrics,
        "manual_seeds": [conditioning.seed],
        # Pin the retake seed to the render seed. Left unset, ACE-Step draws a
        # fresh one and the repainted span drifts off the source voice.
        "retake_seeds": [conditioning.seed],
        "save_path": save_path,
        **{
            k: v
            for k, v in conditioning.to_dict().items()
            if k not in ("seed",)
        },
    }

    if edit.task == "edit":
        request["edit_target_lyrics"] = edit.lyrics
        request["edit_target_prompt"] = conditioning.prompt
        request["edit_n_min"] = edit.n_min
        request["edit_n_max"] = edit.n_max

    return request


class RepaintEngine:
    """Thin adapter over ACEStepPipeline.

    Deliberately narrow: the editor talks to `apply()` and nothing else, so a
    different backend (DiffRhythm 2, YuE) can be swapped in behind the same
    contract without touching the UI.
    """

    def __init__(
        self,
        checkpoint_dir: str = "",
        *,
        dtype: str = "bfloat16",
        cpu_offload: bool = False,
        torch_compile: bool = False,
        device_id: int = 0,
    ) -> None:
        self.checkpoint_dir = checkpoint_dir
        self.dtype = dtype
        self.cpu_offload = cpu_offload
        self.torch_compile = torch_compile
        self.device_id = device_id
        self._pipeline = None

    def _load(self):
        if self._pipeline is None:
            import os

            os.environ.setdefault("CUDA_VISIBLE_DEVICES", str(self.device_id))
            from acestep.pipeline_ace_step import ACEStepPipeline

            self._pipeline = ACEStepPipeline(
                checkpoint_dir=self.checkpoint_dir,
                dtype=self.dtype,
                cpu_offload=self.cpu_offload,
                torch_compile=self.torch_compile,
            )
        return self._pipeline

    def apply(
        self,
        *,
        src_audio_path: str,
        conditioning: Conditioning,
        edit: Edit,
        source_lyrics: str,
        save_path: str,
    ) -> dict[str, Any]:
        """Run one masked edit. Returns a receipt describing what was done."""
        request = build_request(
            src_audio_path=src_audio_path,
            conditioning=conditioning,
            edit=edit,
            source_lyrics=source_lyrics,
            save_path=save_path,
        )
        pipeline = self._load()
        started = time.perf_counter()
        pipeline(**request)
        elapsed = time.perf_counter() - started

        return {
            "task": edit.task,
            "src_audio_path": src_audio_path,
            "save_path": save_path,
            "span_s": [edit.start_s, edit.end_s],
            "repaint_bounds_s": [
                request["repaint_start"],
                request["repaint_end"],
            ],
            "seed": conditioning.seed,
            "elapsed_s": round(elapsed, 3),
            "conditioning": conditioning.to_dict(),
        }


def write_session(path: str | pathlib.Path, receipts: Sequence[dict[str, Any]]) -> None:
    """Persist an edit history conforming to schemas/repaint-session.schema.json."""
    payload = {"version": 1, "edits": list(receipts)}
    pathlib.Path(path).write_text(json.dumps(payload, indent=2), encoding="utf-8")
