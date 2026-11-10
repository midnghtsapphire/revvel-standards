"""HFMR reference core: reproducible feature-level likelihood fusion and audit ledger.
Not validated for forensic identification or human-remains inference.
"""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
from typing import Mapping
import hashlib, json, math, os

HYPOTHESES = ('background','metal','void','soil_disturbance','other')

def canonical(obj):
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), allow_nan=False).encode()

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
            raise ValueError('invalid observation or uncertainty')
        if len(self.source_sha256) != 64 or any(c not in '0123456789abcdef' for c in self.source_sha256):
            raise ValueError('invalid source digest')

@dataclass(frozen=True)
class CalibratedModel:
    # Reference parameters must come from held-out calibration data, never guessed.
    means: Mapping[str, Mapping[str,float]]
    intrinsic_sd: Mapping[str, Mapping[str,float]]
    priors: Mapping[str,float]
    calibration_id: str

    def validate(self):
        if set(self.priors) != set(HYPOTHESES) or any(not math.isfinite(p) or p <= 0 for p in self.priors.values()):
            raise ValueError('positive prior required for every hypothesis')
        if not math.isclose(sum(self.priors.values()),1,abs_tol=1e-9):
            raise ValueError('priors must sum to one')
        if not self.calibration_id:
            raise ValueError('calibration provenance required')

def infer(observations: list[Observation], model: CalibratedModel):
    """Gaussian feature likelihoods; at most one observation per dependency group.
    This conservative policy prevents naïve double counting. Correlated multivariate
    fusion requires a separately validated joint covariance model.
    """
    model.validate()
    groups = set()
    for o in observations:
        o.validate()
        if o.dependency_group in groups:
            raise ValueError('dependent observations: use joint covariance model or select one')
        groups.add(o.dependency_group)
    logp = {h:math.log(model.priors[h]) for h in HYPOTHESES}
    for o in observations:
        for h in HYPOTHESES:
            mu = model.means[h][o.sensor]
            intrinsic = model.intrinsic_sd[h][o.sensor]
            if intrinsic <= 0 or not math.isfinite(intrinsic):
                raise ValueError('invalid model standard deviation')
            variance = intrinsic**2 + o.sigma**2
            logp[h] += -0.5*(math.log(2*math.pi*variance)+(o.feature-mu)**2/variance)
    z = max(logp.values())
    w = {h:math.exp(v-z) for h,v in logp.items()}
    total = sum(w.values())
    return {'posterior':{h:w[h]/total for h in HYPOTHESES},
            'calibration_id':model.calibration_id,
            'input_hashes':[o.source_sha256 for o in observations],
            'warning':'Model probabilities are not human-remains probabilities.'}

class Ledger:
    """Append-only hash chain demonstration; signatures and trusted time are external.
    Local files alone are not tamper-proof; anchor heads in independently controlled WORM storage.
    """
    def __init__(self, path): self.path = Path(path)
    def append(self, event):
        self.path.parent.mkdir(parents=True,exist_ok=True)
        entries = self.read()
        prev = entries[-1]['entry_hash'] if entries else '0'*64
        record = {'sequence':len(entries),'previous_hash':prev,'event':event}
        record['entry_hash'] = sha256(canonical(record))
        with self.path.open('ab') as f:
            f.write(canonical(record)+b'\n'); f.flush(); os.fsync(f.fileno())
        return record['entry_hash']
    def read(self):
        if not self.path.exists(): return []
        return [json.loads(line) for line in self.path.read_bytes().splitlines() if line]
    def verify(self, expected_head=None):
        prev = '0'*64
        entries = self.read()
        for i,entry in enumerate(entries):
            digest = entry.get('entry_hash')
            body = {k:v for k,v in entry.items() if k!='entry_hash'}
            if entry.get('sequence')!=i or entry.get('previous_hash')!=prev or sha256(canonical(body))!=digest:
                return False
            prev=digest
        return expected_head is None or prev==expected_head
