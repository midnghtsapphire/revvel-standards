"""Measurements for the repaint spike gate.

Two questions decide whether this product is buildable on ACE-Step:

  1. Can you hear the seam where the repaint starts and stops?
  2. Is it still the same singer after the edit?

Question 2 is the one that kills products. A seam is fixable with a crossfade;
a voice that drifts is not fixable at all.

Both metrics are reference-free in the sense that they compare the repaired
render against the *original* render, which we always have.
"""

from __future__ import annotations

import dataclasses
import warnings

import numpy as np


@dataclasses.dataclass
class SeamResult:
    """Spectral discontinuity at a mask boundary, in z-units.

    The score is the boundary's spectral flux expressed as a z-score against the
    distribution of flux across the rest of the track. A value near 0 means the
    boundary looks like any other frame transition in the song. Large positive
    values mean an audible jump.

    Interpreting this needs care: real music is full of legitimate large flux
    events (downbeats, drum hits, section changes). That is exactly why the score
    is relative to the track's own flux distribution rather than an absolute
    threshold, and why `baseline_p99` is reported alongside it.
    """

    z_at_start: float
    z_at_end: float
    baseline_p99: float

    @property
    def worst(self) -> float:
        return max(self.z_at_start, self.z_at_end)


def _stft_flux(y: np.ndarray, sr: int, hop: int = 512, n_fft: int = 2048) -> tuple[np.ndarray, float]:
    """Frame-to-frame spectral flux and seconds-per-frame."""
    import librosa

    S = np.abs(librosa.stft(y, n_fft=n_fft, hop_length=hop))
    # Positive-only difference: we care about energy appearing, not decaying.
    diff = np.diff(S, axis=1)
    flux = np.sqrt((np.maximum(diff, 0.0) ** 2).sum(axis=0))
    return flux, hop / sr


def seam_discontinuity(
    repaired: np.ndarray,
    sr: int,
    *,
    start_s: float,
    end_s: float,
    exclude_pad_s: float = 0.25,
) -> SeamResult:
    """Score how much the repaint boundaries stand out from the track's own texture.

    `exclude_pad_s` keeps frames adjacent to each boundary out of the baseline
    distribution, so the seam is not compared against itself.
    """
    flux, sec_per_frame = _stft_flux(repaired, sr)
    if flux.size < 8:
        raise ValueError("audio too short to score a seam")

    def frame_of(t: float) -> int:
        return int(np.clip(round(t / sec_per_frame), 0, flux.size - 1))

    i_start, i_end = frame_of(start_s), frame_of(end_s)
    pad = max(1, int(round(exclude_pad_s / sec_per_frame)))

    mask = np.ones(flux.size, dtype=bool)
    for idx in (i_start, i_end):
        mask[max(0, idx - pad):min(flux.size, idx + pad + 1)] = False

    baseline = flux[mask]
    if baseline.size < 8:
        raise ValueError("not enough audio outside the seam to form a baseline")

    mu = float(baseline.mean())
    sigma = float(baseline.std()) or 1e-9

    return SeamResult(
        z_at_start=float((flux[i_start] - mu) / sigma),
        z_at_end=float((flux[i_end] - mu) / sigma),
        baseline_p99=float((np.percentile(baseline, 99) - mu) / sigma),
    )


def voice_similarity(
    original: np.ndarray,
    repaired: np.ndarray,
    sr: int,
) -> float | None:
    """Cosine similarity between speaker embeddings of two spans. Range [-1, 1].

    Returns None when no embedding backend is installed, so the spike harness can
    report "not measured" instead of silently substituting a weaker proxy metric.
    A number that looks like a measurement but is not one is worse than a gap.

    Requires `resemblyzer`. Feed it *vocal* spans -- run stem separation first if
    the mix is dense, or the embedding mostly describes the instrumental bed.
    """
    try:
        from resemblyzer import VoiceEncoder, preprocess_wav
    except ImportError:
        warnings.warn(
            "resemblyzer not installed -- voice drift NOT measured. "
            "Install it before trusting a spike PASS verdict.",
            stacklevel=2,
        )
        return None

    encoder = VoiceEncoder()
    a = encoder.embed_utterance(preprocess_wav(original, source_sr=sr))
    b = encoder.embed_utterance(preprocess_wav(repaired, source_sr=sr))
    denom = float(np.linalg.norm(a) * np.linalg.norm(b)) or 1e-9
    return float(np.dot(a, b) / denom)


def load_span(path: str, start_s: float, end_s: float) -> tuple[np.ndarray, int]:
    """Load a mono span of audio. Returns (samples, sample_rate)."""
    import librosa

    y, sr = librosa.load(path, sr=None, mono=True)
    a = int(max(0, start_s) * sr)
    b = int(min(end_s * sr, len(y)))
    if b <= a:
        raise ValueError(f"empty span {start_s}-{end_s}s in {path}")
    return y[a:b], sr
