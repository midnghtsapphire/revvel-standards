"""Synthetic artifact injection — manufacturing ground truth for the detector.

You cannot measure a detector on audio where you do not know the answer. If it
reports three defects, you have no way to learn it missed seven. So we take
clean audio, inject known defects at known timestamps, and score against labels
we wrote ourselves.

Two families, and the second one is the point:

    DEFECT  — things the detector must find (click, burst, dropout, ...)
    BENIGN  — things it must NOT flag (saturation, breath, pick noise, ...)

Any detector can hit 100% recall by flagging everything. The benign set is what
separates a useful tool from a smoke alarm, and it is the whole basis of the
intentionality claim in docs/repaint/GENERATIVE_AUDIO_QA.md. A detector that
scores well on defects and badly on benigns would sand the character off exactly
the kind of deliberately raw music this is built for.

Injection is deterministic given a seed so a corpus is reproducible.
"""

from __future__ import annotations

import dataclasses
from typing import Literal

import numpy as np

Kind = Literal["defect", "benign"]


@dataclasses.dataclass(frozen=True)
class Label:
    """Ground truth for one injected event."""

    name: str
    kind: Kind
    start_s: float
    end_s: float
    # Frequency band the event occupies, when it is band-limited.
    # None means broadband / not meaningfully band-limited.
    band_hz: tuple[float, float] | None = None

    @property
    def is_defect(self) -> bool:
        return self.kind == "defect"

    def overlaps(self, start_s: float, end_s: float, tolerance_s: float = 0.05) -> bool:
        """Whether a detector's reported span corresponds to this event."""
        return (start_s - tolerance_s) < self.end_s and (end_s + tolerance_s) > self.start_s


def _slice(sr: int, n: int, at_s: float, dur_s: float) -> slice:
    a = int(round(at_s * sr))
    b = min(n, a + max(1, int(round(dur_s * sr))))
    if a >= n:
        raise ValueError(f"injection at {at_s}s is past end of audio")
    return slice(a, b)


def _rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(x**2))) if x.size else 0.0


# --------------------------------------------------------------------------
# DEFECTS — the detector must find these
# --------------------------------------------------------------------------

def click(y: np.ndarray, sr: int, at_s: float, *, amplitude: float = 0.7) -> Label:
    """Single-sample impulse. The easiest defect; a detector that misses it is broken."""
    i = int(round(at_s * sr))
    if i >= y.size:
        raise ValueError(f"click at {at_s}s is past end of audio")
    y[i] += amplitude * (1.0 if y[i] <= 0 else -1.0)
    return Label("click", "defect", at_s, at_s + 1.0 / sr)


def burst(
    y: np.ndarray, sr: int, at_s: float, *, dur_s: float = 0.08, snr_db: float = 6.0,
    rng: np.random.Generator | None = None,
) -> Label:
    """Broadband noise burst, scaled relative to local signal level.

    Level is set from surrounding RMS rather than absolute, so the same call
    produces a comparably audible defect in a loud chorus and a quiet verse.
    """
    rng = rng or np.random.default_rng(0)
    sl = _slice(sr, y.size, at_s, dur_s)
    local = _rms(y[sl]) or _rms(y) or 1e-3
    level = local * (10 ** (snr_db / 20))
    y[sl] += rng.normal(0.0, level, size=sl.stop - sl.start)
    return Label("burst", "defect", at_s, at_s + dur_s)


def dropout(y: np.ndarray, sr: int, at_s: float, *, dur_s: float = 0.12) -> Label:
    """Unnatural silence. Hard-edged on purpose -- the discontinuity is the defect."""
    sl = _slice(sr, y.size, at_s, dur_s)
    y[sl] = 0.0
    return Label("dropout", "defect", at_s, at_s + dur_s)


def feedback_tone(
    y: np.ndarray, sr: int, at_s: float, *, dur_s: float = 0.9, freq_hz: float = 2600.0,
    gain: float = 0.35,
) -> Label:
    """Sustained resonant tone that swells -- the classic feedback squeal.

    Band-limited, so it is the case where a narrow notch is the right repair and
    a full-span regenerate is overkill. The detector should report the band.
    """
    sl = _slice(sr, y.size, at_s, dur_s)
    n = sl.stop - sl.start
    t = np.arange(n) / sr
    envelope = np.linspace(0.15, 1.0, n) ** 2
    local = _rms(y) or 1e-3
    y[sl] += gain * local * envelope * np.sin(2 * np.pi * freq_hz * t)
    return Label("feedback_tone", "defect", at_s, at_s + dur_s,
                 band_hz=(freq_hz * 0.9, freq_hz * 1.1))


def warble(y: np.ndarray, sr: int, at_s: float, *, dur_s: float = 0.5,
           rate_hz: float = 7.0, depth: float = 0.004) -> Label:
    """Pitch instability via time-varying resampling -- the granular/vocoder wobble.

    This is a generative failure mode with no acoustic equivalent, which is
    precisely why RX-class tools do not look for it.
    """
    sl = _slice(sr, y.size, at_s, dur_s)
    seg = y[sl]
    n = seg.size
    t = np.arange(n)
    warp = t + depth * sr * np.sin(2 * np.pi * rate_hz * t / sr)
    y[sl] = np.interp(np.clip(warp, 0, n - 1), t, seg)
    return Label("warble", "defect", at_s, at_s + dur_s)


def chunk_repeat(y: np.ndarray, sr: int, at_s: float, *, dur_s: float = 0.15) -> Label:
    """Duplicated musical event -- a stutter where the model repeated itself."""
    sl = _slice(sr, y.size, at_s, dur_s)
    n = sl.stop - sl.start
    src_start = max(0, sl.start - n)
    y[sl] = y[src_start:src_start + n]
    return Label("chunk_repeat", "defect", at_s, at_s + dur_s)


def hard_clip(y: np.ndarray, sr: int, at_s: float, *, dur_s: float = 0.2,
              ceiling: float = 0.35) -> Label:
    """Digital clipping inconsistent with the surrounding mix."""
    sl = _slice(sr, y.size, at_s, dur_s)
    peak = float(np.max(np.abs(y[sl]))) or 1.0
    y[sl] = np.clip(y[sl], -ceiling * peak, ceiling * peak) / ceiling
    return Label("hard_clip", "defect", at_s, at_s + dur_s)


# --------------------------------------------------------------------------
# BENIGN — the detector must NOT flag these
# --------------------------------------------------------------------------

def soft_saturation(y: np.ndarray, sr: int, at_s: float, *, dur_s: float = 1.2,
                    drive: float = 2.5) -> Label:
    """Tanh saturation. Nonlinear, adds harmonics, reduces crest factor.

    Reads as distortion to any naive detector. It is a guitar amp, and removing
    it would be vandalism.
    """
    sl = _slice(sr, y.size, at_s, dur_s)
    y[sl] = np.tanh(drive * y[sl]) / np.tanh(drive)
    return Label("soft_saturation", "benign", at_s, at_s + dur_s)


def breath(y: np.ndarray, sr: int, at_s: float, *, dur_s: float = 0.25,
           level_db: float = -30.0, rng: np.random.Generator | None = None) -> Label:
    """Low-level shaped noise before a phrase -- a singer inhaling.

    Broadband and uncorrelated with the music, so a flux-based detector will see
    it. It is intimacy, and stripping it is what makes vocals sound synthetic.
    """
    rng = rng or np.random.default_rng(1)
    sl = _slice(sr, y.size, at_s, dur_s)
    n = sl.stop - sl.start
    local = _rms(y) or 1e-3
    noise = rng.normal(0.0, local * (10 ** (level_db / 20)), size=n)
    # Soft attack/decay so it is not itself a discontinuity.
    y[sl] += noise * np.hanning(n)
    return Label("breath", "benign", at_s, at_s + dur_s)


def pick_noise(y: np.ndarray, sr: int, at_s: float, *, level: float = 0.06,
               rng: np.random.Generator | None = None) -> Label:
    """Brief high-frequency transient -- a pick or fret squeak.

    Deliberately close to `click` in duration. Distinguishing the two is the
    hardest and most important discrimination the detector has to make.
    """
    rng = rng or np.random.default_rng(2)
    dur_s = 0.006
    sl = _slice(sr, y.size, at_s, dur_s)
    n = sl.stop - sl.start
    local = _rms(y) or 1e-3
    decay = np.exp(-np.linspace(0, 6, n))
    y[sl] += level * local * decay * rng.normal(0.0, 1.0, size=n)
    return Label("pick_noise", "benign", at_s, at_s + dur_s)


def tape_hiss(y: np.ndarray, sr: int, at_s: float, *, dur_s: float = 2.0,
              level_db: float = -42.0, rng: np.random.Generator | None = None) -> Label:
    """Steady low-level broadband noise floor -- deliberate tape character."""
    rng = rng or np.random.default_rng(3)
    sl = _slice(sr, y.size, at_s, dur_s)
    local = _rms(y) or 1e-3
    y[sl] += rng.normal(0.0, local * (10 ** (level_db / 20)), size=sl.stop - sl.start)
    return Label("tape_hiss", "benign", at_s, at_s + dur_s)


DEFECTS = (click, burst, dropout, feedback_tone, warble, chunk_repeat, hard_clip)
BENIGNS = (soft_saturation, breath, pick_noise, tape_hiss)


# --------------------------------------------------------------------------
# Scoring
# --------------------------------------------------------------------------

@dataclasses.dataclass
class Score:
    """Detector performance against a labeled corpus.

    `false_alarm_rate` is reported separately from precision because it is the
    number that decides whether this tool is usable on raw music: it is the
    share of BENIGN events wrongly flagged as defects.
    """

    true_positives: int
    false_negatives: int
    false_alarms: int
    benign_total: int
    spurious: int

    @property
    def recall(self) -> float:
        d = self.true_positives + self.false_negatives
        return self.true_positives / d if d else 0.0

    @property
    def false_alarm_rate(self) -> float:
        return self.false_alarms / self.benign_total if self.benign_total else 0.0

    def summary(self) -> str:
        return (
            f"recall={self.recall:.1%} "
            f"false_alarm_rate={self.false_alarm_rate:.1%} "
            f"spurious={self.spurious}"
        )


def score_detections(
    labels: list[Label],
    detections: list[tuple[float, float]],
    *,
    tolerance_s: float = 0.05,
) -> Score:
    """Score reported (start_s, end_s) spans against ground truth.

    A detection matching several labels counts against each -- deliberate. A
    detector that reports one giant span covering the whole track should not be
    rewarded with perfect recall, so `spurious` catches detections matching
    nothing and the caller should weigh span width separately.
    """
    defects = [l for l in labels if l.is_defect]
    benigns = [l for l in labels if not l.is_defect]

    matched_defects = set()
    flagged_benigns = set()
    spurious = 0

    for start_s, end_s in detections:
        hit = False
        for i, lab in enumerate(defects):
            if lab.overlaps(start_s, end_s, tolerance_s):
                matched_defects.add(i)
                hit = True
        for i, lab in enumerate(benigns):
            if lab.overlaps(start_s, end_s, tolerance_s):
                flagged_benigns.add(i)
                hit = True
        if not hit:
            spurious += 1

    return Score(
        true_positives=len(matched_defects),
        false_negatives=len(defects) - len(matched_defects),
        false_alarms=len(flagged_benigns),
        benign_total=len(benigns),
        spurious=spurious,
    )


# --------------------------------------------------------------------------
# Human labels
# --------------------------------------------------------------------------

_KIND_WORDS = {
    "ok": "benign", "fine": "benign", "keep": "benign", "intentional": "benign",
    "good": "benign", "on purpose": "benign",
}


def parse_notes(text: str) -> list[Label]:
    """Turn timestamps typed by ear into labels.

    The person who made the record can hear the glitch and say where it is in
    seconds. That is ground truth from the real artifact distribution, which no
    synthetic injector reproduces -- and it costs one listen, not a project.

    Accepts one event per line, `timestamp description`, where timestamp is
    `M:SS`, `M:SS.mmm`, or plain seconds, optionally a range with `-`:

        0:47 squeal
        1:12.5-1:13 stutter
        95 dropout
        2:03 fuzz -- keep, on purpose

    Anything whose description contains a keep-word (keep, ok, intentional,
    on purpose, fine, good) is labeled benign, so the same pass that marks
    defects also builds the false-alarm set the intentionality test needs.

    Blank lines and lines starting with # are ignored.
    """
    labels: list[Label] = []

    def to_seconds(token: str) -> float:
        if ":" in token:
            mins, _, secs = token.partition(":")
            return int(mins) * 60 + float(secs)
        return float(token)

    for lineno, raw in enumerate(text.splitlines(), start=1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue

        stamp, _, description = line.partition(" ")
        description = description.strip() or "unlabeled"

        try:
            if "-" in stamp:
                a, _, b = stamp.partition("-")
                start_s, end_s = to_seconds(a), to_seconds(b)
            else:
                start_s = to_seconds(stamp)
                # A point in time becomes a short window; artifacts people
                # notice are audible, so they are not single samples.
                end_s = start_s + 0.25
        except ValueError as exc:
            raise ValueError(f"line {lineno}: cannot read timestamp {stamp!r}") from exc

        if end_s <= start_s:
            raise ValueError(f"line {lineno}: end {end_s} not after start {start_s}")

        lowered = description.lower()
        kind: Kind = "defect"
        for word in _KIND_WORDS:
            if word in lowered:
                kind = "benign"
                break

        labels.append(Label(description, kind, start_s, end_s))

    return labels
