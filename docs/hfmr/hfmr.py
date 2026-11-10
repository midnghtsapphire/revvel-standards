"""HFMR reference core: reproducible feature-level likelihood fusion and audit ledger.
Not validated for forensic identification or human-remains inference.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping

HYPOTHESES = ("background", "metal", "void", "soil_disturbance", "other")

# If even the best-fitting hypothesis is more than this many combined standard
# deviations from an observation, the input is outside what the model was
# calibrated on and the result is an abstention, not a posterior.
OOD_Z_LIMIT = 4.0

try:  # POSIX advisory locking for the ledger; absent on Windows.
    import fcntl
except ImportError:  # pragma: no cover
    fcntl = None


def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


@dataclass(frozen=True)
class Observation:
    sensor: str
    feature: float
    sigma: float
    dependency_group: str
    source_sha256: str

    def validate(self):
        if not math.isfinite(self.feature) or not math.isfinite(self.sigma) or self.sigma <= 0:
            raise ValueError("invalid observation or uncertainty")
        if len(self.source_sha256) != 64 or any(c not in "0123456789abcdef" for c in self.source_sha256):
            raise ValueError("invalid source digest")


@dataclass(frozen=True)
class CalibratedModel:
    # Reference parameters must come from held-out calibration data, never guessed.
    means: Mapping[str, Mapping[str, float]]
    intrinsic_sd: Mapping[str, Mapping[str, float]]
    priors: Mapping[str, float]
    calibration_id: str

    def validate(self):
        if set(self.priors) != set(HYPOTHESES) or any(not math.isfinite(p) or p <= 0 for p in self.priors.values()):
            raise ValueError("positive prior required for every hypothesis")
        if not math.isclose(sum(self.priors.values()), 1, abs_tol=1e-9):
            raise ValueError("priors must sum to one")
        if not self.calibration_id:
            raise ValueError("calibration provenance required")
        for table_name, table in (("means", self.means), ("intrinsic_sd", self.intrinsic_sd)):
            if set(table) != set(HYPOTHESES):
                raise ValueError(f"{table_name} must define every hypothesis: {sorted(HYPOTHESES)}")
        # A NaN or infinite calibrated mean would turn every likelihood, and so the whole
        # posterior, into NaN; reject it before any arithmetic.
        for h in HYPOTHESES:
            for sensor, mu in self.means[h].items():
                if not math.isfinite(mu):
                    raise ValueError(f"invalid calibrated mean for {h!r}/{sensor!r}")

    def check_sensor(self, sensor: str):
        missing = [h for h in HYPOTHESES if sensor not in self.means[h] or sensor not in self.intrinsic_sd[h]]
        if missing:
            raise ValueError(f"sensor {sensor!r} has no calibration for hypotheses: {missing}")


DUPLICATE_SOURCE_POLICIES = ("refuse", "dedupe")


def drop_repeated_sources(observations: list[Observation]):
    """Keep the first observation for each source_sha256; return (kept, warnings).

    The same reading filed under two dependency-group labels is still one reading
    (SYSTEM_REVIEW H5: 0.526 became 0.671 when it was counted twice).
    """
    kept, seen, warnings = [], {}, []
    for i, o in enumerate(observations):
        if o.source_sha256 in seen:
            first = observations[seen[o.source_sha256]]
            warnings.append(
                f"observation {i} (sensor {o.sensor!r}, group {o.dependency_group!r}) repeats source_sha256 "
                f"{o.source_sha256} of observation {seen[o.source_sha256]} (group {first.dependency_group!r}); "
                "dropped so one reading is counted once"
            )
            continue
        seen[o.source_sha256] = i
        kept.append(o)
    return kept, warnings


def infer(observations: list[Observation], model: CalibratedModel, ood_z_limit: float = OOD_Z_LIMIT,
          duplicate_sources: str = "refuse"):
    """Gaussian feature likelihoods; at most one observation per dependency group.
    This conservative policy prevents naïve double counting. Correlated multivariate
    fusion requires a separately validated joint covariance model.

    A source_sha256 may appear only once in the input, whatever dependency group it
    is filed under: two labels on one reading are not two readings (SYSTEM_REVIEW H5).
    duplicate_sources="refuse" (default) raises ValueError; "dedupe" keeps the first
    observation for each digest and lists every dropped one under "dedupe_warnings"
    in the result.

    Returns decision "abstain" with posterior None when no hypothesis explains the
    observations within ood_z_limit standard deviations: normalising likelihoods that
    are all tiny would otherwise report near-certainty for whichever is least bad.
    """
    model.validate()
    # NaN makes `best_fit_z > ood_z_limit` always false (abstention disabled); a negative or
    # zero limit forces abstention for every input. Neither is a usable calibration limit.
    if not math.isfinite(ood_z_limit) or ood_z_limit <= 0:
        raise ValueError("ood_z_limit must be a finite positive number")
    if duplicate_sources not in DUPLICATE_SOURCE_POLICIES:
        raise ValueError(f"duplicate_sources must be one of {DUPLICATE_SOURCE_POLICIES}")
    if not observations:
        raise ValueError("no observations: posterior would just restate the priors")
    for o in observations:
        o.validate()
    kept, dedupe_warnings = drop_repeated_sources(list(observations))
    if dedupe_warnings and duplicate_sources == "refuse":
        raise ValueError("repeated source_sha256: the same reading cannot be counted twice "
                         "(pass duplicate_sources='dedupe' to keep the first): " + "; ".join(dedupe_warnings))
    observations = kept
    groups = set()
    for o in observations:
        # o.validate()  # validated above, before the repeated-source check (SYSTEM_REVIEW H5)
        # Lesson: the old loop only checked dependency_group, a label the caller chooses. One reading filed under
        # two labels counted twice (0.526 -> 0.671). Deduplicate on what the data is (its digest), not its label.
        model.check_sensor(o.sensor)
        if o.dependency_group in groups:
            raise ValueError("dependent observations: use joint covariance model or select one")
        groups.add(o.dependency_group)
    logp = {h: math.log(model.priors[h]) for h in HYPOTHESES}
    worst_z = {h: 0.0 for h in HYPOTHESES}
    for o in observations:
        for h in HYPOTHESES:
            mu = model.means[h][o.sensor]
            intrinsic = model.intrinsic_sd[h][o.sensor]
            if intrinsic <= 0 or not math.isfinite(intrinsic):
                raise ValueError("invalid model standard deviation")
            variance = intrinsic**2 + o.sigma**2
            logp[h] += -0.5 * (math.log(2 * math.pi * variance) + (o.feature - mu) ** 2 / variance)
            worst_z[h] = max(worst_z[h], abs(o.feature - mu) / math.sqrt(variance))
    best_fit_z = min(worst_z.values())
    if best_fit_z > ood_z_limit:
        return {
            "decision": "abstain",
            "posterior": None,
            "best_fit_z": best_fit_z,
            "ood_z_limit": ood_z_limit,
            "calibration_id": model.calibration_id,
            "input_hashes": [o.source_sha256 for o in observations],
            "dedupe_warnings": dedupe_warnings,
            "warning": "Observations fall outside every calibrated hypothesis; no posterior is reported.",
        }
    z = max(logp.values())
    w = {h: math.exp(v - z) for h, v in logp.items()}
    total = sum(w.values())
    return {
        "decision": "posterior",
        "best_fit_z": best_fit_z,
        "posterior": {h: w[h] / total for h in HYPOTHESES},
        "calibration_id": model.calibration_id,
        "input_hashes": [o.source_sha256 for o in observations],
        "dedupe_warnings": dedupe_warnings,
        "warning": "Model probabilities are not human-remains probabilities.",
    }


class Ledger:
    """Append-only hash chain demonstration; signatures and trusted time are external.
    Local files alone are not tamper-proof; anchor heads in independently controlled WORM storage.
    """

    def __init__(self, path):
        self.path = Path(path)

    def append(self, event):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        # Hold an exclusive lock across read-then-write so two writers cannot both
        # claim the same sequence number (POSIX only; single-writer elsewhere).
        lock = self.path.with_name(self.path.name + ".lock").open("a")
        try:
            if fcntl is not None:
                fcntl.flock(lock, fcntl.LOCK_EX)
            entries = self.read()
            prev = entries[-1]["entry_hash"] if entries else "0" * 64
            record = {"sequence": len(entries), "previous_hash": prev, "event": event}
            record["entry_hash"] = sha256(canonical(record))
            with self.path.open("ab") as f:
                f.write(canonical(record) + b"\n")
                f.flush()
                os.fsync(f.fileno())
            return record["entry_hash"]
        finally:
            if fcntl is not None:
                fcntl.flock(lock, fcntl.LOCK_UN)
            lock.close()

    def read(self):
        if not self.path.exists():
            return []
        return [json.loads(line) for line in self.path.read_bytes().splitlines() if line]

    def verify(self, expected_head=None):
        prev = "0" * 64
        try:
            entries = self.read()
        except (ValueError, UnicodeDecodeError):
            return False  # a corrupt or truncated line is a failed verification, not a crash
        for i, entry in enumerate(entries):
            if not isinstance(entry, dict):
                return False
            digest = entry.get("entry_hash")
            body = {k: v for k, v in entry.items() if k != "entry_hash"}
            # Original: if entry.get("sequence") != i or entry.get("previous_hash") != prev or sha256(canonical(body)) != digest:  # noqa: E501
            #   canonical() raises ValueError on NaN/Infinity, which json.loads accepts from a corrupt line.
            try:
                body_hash = sha256(canonical(body))
            except ValueError:
                return False  # a non-standard JSON constant is a failed verification, not a crash
            if entry.get("sequence") != i or entry.get("previous_hash") != prev or body_hash != digest:
                return False
            prev = digest
        return expected_head is None or prev == expected_head
