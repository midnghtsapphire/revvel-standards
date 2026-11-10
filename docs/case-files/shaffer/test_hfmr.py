import tempfile, unittest
from pathlib import Path
from hfmr import *

class TestHFMR(unittest.TestCase):
    def model(self):
        return CalibratedModel(
            means={h:{'demo':i} for i,h in enumerate(HYPOTHESES)},
            intrinsic_sd={h:{'demo':0.5} for h in HYPOTHESES},
            priors={h:0.2 for h in HYPOTHESES},calibration_id='SYNTHETIC-TEST-ONLY')
    def test_posterior_normalizes(self):
        o=Observation('demo',1.0,0.1,'group-a','a'*64)
        p=infer([o],self.model())['posterior']
        self.assertAlmostEqual(sum(p.values()),1)
        self.assertEqual(max(p,key=p.get),'metal')
    def test_dependency_rejected(self):
        o=Observation('demo',1,0.1,'same','a'*64)
        with self.assertRaises(ValueError): infer([o,o],self.model())
    def test_ledger_tamper(self):
        with tempfile.TemporaryDirectory() as d:
            f=Path(d)/'ledger.jsonl'; ledger=Ledger(f)
            head=ledger.append({'action':'ingest','sha256':'a'*64})
            self.assertTrue(ledger.verify(head))
            f.write_bytes(f.read_bytes().replace(b'ingest',b'change'))
            self.assertFalse(ledger.verify(head))
    def test_head_detects_truncation(self):
        with tempfile.TemporaryDirectory() as d:
            ledger=Ledger(Path(d)/'ledger.jsonl')
            ledger.append({'a':1}); head=ledger.append({'a':2})
            ledger.path.write_bytes(ledger.path.read_bytes().splitlines()[0]+b'\n')
            self.assertFalse(ledger.verify(head))
if __name__=='__main__': unittest.main()
