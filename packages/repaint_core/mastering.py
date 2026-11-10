"""Automated mastering and the gate that makes automating it safe.

Mastering without listening is only defensible if something else checks the
result. So `verify()` is the load-bearing half of this module, not `master()`:
it measures integrated loudness and true peak against a platform profile and
refuses the file if it misses.

True peak is measured properly -- 4x oversampled per ITU-R BS.1770 -- because
sample peak and true peak are different numbers, and the entire reason streaming
platforms want -1.0 dBTP is the inter-sample peaks that appear only after
oversampling. A file that reads -0.3 dBFS at sample rate can be well over 0 dBTP
once Ogg Vorbis or AAC reconstructs it, which is what produces encoder
distortion on an otherwise clean master.
"""

from __future__ import annotations

import dataclasses
import pathlib

import numpy as np


@dataclasses.dataclass(frozen=True)
class Profile:
    """Delivery target for one platform."""

    name: str
    target_lufs: float
    max_true_peak_dbtp: float
    # How far integrated loudness may sit from target before we fail the file.
    tolerance_lu: float = 1.0


# Amazon is the outlier on both axes: louder target, and a -2.0 dBTP ceiling
# because peaks rise further when re-encoded to their lossy formats.
PROFILES: dict[str, Profile] = {
    "spotify": Profile("Spotify", -14.0, -1.0),
    "youtube": Profile("YouTube", -14.0, -1.0),
    "apple": Profile("Apple Music", -16.0, -1.0),
    "deezer": Profile("Deezer", -15.0, -1.0),
    "amazon": Profile("Amazon Music", -13.0, -2.0),
}

# One master serves the whole field: platforms turn content down far more
# readily than up, so hitting the -14 cluster with the strictest peak ceiling
# in the set is the deliverable. Encoded here so nobody re-derives it per release.
DELIVERY = Profile("Universal delivery", -14.0, -2.0, tolerance_lu=1.0)


class MissingDependency(RuntimeError):
    """A required audio dependency is absent.

    Raised rather than degraded: a mastering step that silently skips
    verification is worse than one that stops, because the failure is invisible
    until a listener hears the distortion.
    """


@dataclasses.dataclass
class Measurement:
    integrated_lufs: float
    true_peak_dbtp: float
    sample_peak_dbfs: float
    sample_rate: int
    channels: int

    @property
    def intersample_margin_db(self) -> float:
        """How far true peak exceeds sample peak.

        Large values mean the waveform is heavily limited -- the peaks are
        hiding between samples. Useful as a smell test on an automated master.
        """
        return self.true_peak_dbtp - self.sample_peak_dbfs


@dataclasses.dataclass
class Verdict:
    passed: bool
    profile: Profile
    measurement: Measurement
    failures: list[str]

    def summary(self) -> str:
        m = self.measurement
        status = "PASS" if self.passed else "FAIL"
        line = (
            f"{status} [{self.profile.name}] "
            f"{m.integrated_lufs:.2f} LUFS (target {self.profile.target_lufs:+.1f}) "
            f"{m.true_peak_dbtp:.2f} dBTP (ceiling {self.profile.max_true_peak_dbtp:+.1f})"
        )
        if self.failures:
            line += "\n  - " + "\n  - ".join(self.failures)
        return line


def _load(path: str | pathlib.Path) -> tuple[np.ndarray, int]:
    """Load audio as (samples, sample_rate). Shape is (n,) or (n, channels)."""
    try:
        import soundfile as sf
    except ImportError as exc:  # pragma: no cover - environment dependent
        raise MissingDependency(
            "soundfile is required to measure audio; pip install soundfile"
        ) from exc
    data, sr = sf.read(str(path), always_2d=False)
    return np.asarray(data, dtype=np.float64), int(sr)


def true_peak_dbtp(y: np.ndarray, sr: int, *, oversample: int = 4) -> float:
    """True peak in dBTP, oversampled per ITU-R BS.1770.

    Sample peak misses maxima that fall between samples. Those are exactly the
    peaks a lossy encoder reconstructs above 0 dBFS, so measuring without
    oversampling reports a number that is comfortably wrong in the unsafe
    direction.

    Upsampling is ideal band-limited interpolation done by zero-padding the
    spectrum -- numpy only, no scipy. The result is floored at the sample peak
    because true peak can never be lower, which also guards the small edge
    error FFT interpolation introduces by assuming periodicity.

    Allocates `oversample` times the signal length; block this if it is ever
    pointed at very long files.
    """
    if y.size == 0:
        raise ValueError("cannot measure an empty signal")

    work = np.asarray(y, dtype=np.float64)
    work = work if work.ndim == 1 else work.T  # channels first

    n = work.shape[-1]
    sample_peak = float(np.max(np.abs(work)))

    if n > 1 and oversample > 1:
        spec = np.fft.rfft(work, axis=-1)
        up_n = n * oversample
        padded = np.zeros(work.shape[:-1] + (up_n // 2 + 1,), dtype=spec.dtype)
        padded[..., : spec.shape[-1]] = spec
        up = np.fft.irfft(padded, n=up_n, axis=-1) * oversample
        peak = max(sample_peak, float(np.max(np.abs(up))))
    else:
        peak = sample_peak

    if peak <= 0.0:
        return -np.inf
    return float(20.0 * np.log10(peak))


def measure(path: str | pathlib.Path) -> Measurement:
    """Measure integrated loudness and true peak of a rendered file."""
    try:
        import pyloudnorm
    except ImportError as exc:  # pragma: no cover - environment dependent
        raise MissingDependency(
            "pyloudnorm is required for LUFS measurement; pip install pyloudnorm"
        ) from exc

    y, sr = _load(path)
    meter = pyloudnorm.Meter(sr)
    integrated = float(meter.integrated_loudness(y))

    sample_peak = float(np.max(np.abs(y))) if y.size else 0.0
    sample_peak_db = 20.0 * np.log10(sample_peak) if sample_peak > 0 else -np.inf

    return Measurement(
        integrated_lufs=integrated,
        true_peak_dbtp=true_peak_dbtp(y, sr),
        sample_peak_dbfs=float(sample_peak_db),
        sample_rate=sr,
        channels=1 if y.ndim == 1 else int(y.shape[1]),
    )


def check(measurement: Measurement, profile: Profile = DELIVERY) -> Verdict:
    """Judge a measurement against a delivery profile. Pure -- no file access."""
    failures: list[str] = []

    delta = measurement.integrated_lufs - profile.target_lufs
    if abs(delta) > profile.tolerance_lu:
        direction = "louder" if delta > 0 else "quieter"
        failures.append(
            f"integrated loudness {measurement.integrated_lufs:.2f} LUFS is "
            f"{abs(delta):.2f} LU {direction} than the {profile.target_lufs:+.1f} "
            f"target (tolerance {profile.tolerance_lu:.1f} LU)"
        )

    if measurement.true_peak_dbtp > profile.max_true_peak_dbtp:
        failures.append(
            f"true peak {measurement.true_peak_dbtp:.2f} dBTP exceeds the "
            f"{profile.max_true_peak_dbtp:+.1f} dBTP ceiling -- lossy encoders "
            f"will clip this"
        )

    return Verdict(not failures, profile, measurement, failures)


def verify(path: str | pathlib.Path, profile: Profile = DELIVERY) -> Verdict:
    """Measure a file and judge it. The gate that makes automation safe."""
    return check(measure(path), profile)


def master(
    target: str | pathlib.Path,
    reference: str | pathlib.Path,
    out: str | pathlib.Path,
    *,
    bit_depth: int = 24,
) -> pathlib.Path:
    """Reference-based master via Matchering.

    Matches RMS, frequency response, peak amplitude, and stereo width of
    `target` to `reference`. Reference-based rather than a black-box "AI
    master" so the result is explainable and controllable: the knob is which
    record you point it at.

    Deliberately does NOT resample. Generated audio has a native rate, and
    upsampling it to look like hi-res adds file size and zero information.
    """
    try:
        import matchering as mg
    except ImportError as exc:  # pragma: no cover - environment dependent
        raise MissingDependency(
            "matchering is required for automated mastering; pip install matchering"
        ) from exc

    out = pathlib.Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)

    result = (
        mg.pcm24(str(out)) if bit_depth == 24 else mg.pcm16(str(out))
    )
    mg.process(target=str(target), reference=str(reference), results=[result])
    return out


def master_and_verify(
    target: str | pathlib.Path,
    reference: str | pathlib.Path,
    out: str | pathlib.Path,
    *,
    profile: Profile = DELIVERY,
) -> Verdict:
    """Master, then gate. Returns the verdict; the file is written either way.

    The file is kept on failure on purpose -- you want to hear what missed and
    by how much, not have it deleted out from under you.
    """
    master(target, reference, out)
    return verify(out, profile)
