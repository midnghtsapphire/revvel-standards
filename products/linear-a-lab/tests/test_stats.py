import unittest

from gorila_ge.corpus import load_corpus
from pipeline import stats


class TestStats(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = load_corpus()

    def test_kuro_is_frequent(self):
        freq = stats.word_frequencies(self.corpus)
        self.assertGreaterEqual(freq["KU-RO"], 30)

    def test_kuro_cross_site(self):
        sites = stats.site_distribution(self.corpus, "KU-RO")
        self.assertGreaterEqual(len(sites), 2)
        self.assertIn("HT", sites)

    def test_ht13_audit_flags_half_unit(self):
        results = {r.inscription: r for r in stats.kuro_checks(self.corpus)}
        self.assertIn("HT13", results)
        r = results["HT13"]
        self.assertAlmostEqual(r.declared, 130.5)
        # entries sum to 131: the famous half-unit discrepancy must surface
        self.assertAlmostEqual(r.computed, 131.0)
        self.assertAlmostEqual(r.discrepancy, 0.5)
        self.assertFalse(r.ok)

    def test_audit_finds_exact_documents(self):
        results = stats.kuro_checks(self.corpus)
        self.assertGreaterEqual(len(results), 5)
        exact = [r for r in results if r.ok]
        # KU-RO totals verify exactly on a meaningful share of clean docs
        self.assertGreaterEqual(len(exact), 1)

    def test_evidence_pack_shape(self):
        pack = stats.evidence_pack(self.corpus, "KU-RO")
        self.assertEqual(pack["word"], "KU-RO")
        self.assertGreater(pack["occurrences"], 0)
        self.assertIn("followed_by", pack)
        self.assertIn("sample_contexts", pack)

    def test_evidence_pack_unknown_word(self):
        pack = stats.evidence_pack(self.corpus, "ZZ-ZZ-ZZ")
        self.assertEqual(pack["occurrences"], 0)
        self.assertIsNone(pack["rank"])


if __name__ == "__main__":
    unittest.main()
