import unittest

from gorila_ge.corpus import classify_token, load_corpus
from gorila_ge.signs import fraction_value


class TestTokenizer(unittest.TestCase):
    def test_classify_number(self):
        self.assertEqual(classify_token("130"), {"t": "num", "v": 130})

    def test_classify_fraction(self):
        t = classify_token("¹⁄₂")  # ¹⁄₂
        self.assertEqual(t["t"], "frac")
        self.assertEqual(t["v"], 0.5)

    def test_classify_word_and_logo(self):
        self.assertEqual(classify_token("KA-U-DE-TA")["t"], "word")
        self.assertEqual(classify_token("VIN")["t"], "logo")

    def test_classify_divider_newline(self):
        self.assertEqual(classify_token("\U00010101"), {"t": "div"})
        self.assertEqual(classify_token("\n"), {"t": "nl"})

    def test_fraction_values(self):
        self.assertAlmostEqual(fraction_value("1/4"), 0.25)
        self.assertIsNone(fraction_value("NOPE"))


class TestCorpus(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.corpus = load_corpus()

    def test_corpus_size(self):
        self.assertGreaterEqual(len(self.corpus), 1500)

    def test_ht13_structure(self):
        ht13 = self.corpus["HT13"]
        self.assertEqual(ht13.site, "HT")
        self.assertEqual(ht13.period, "LMIB")
        words = ht13.words()
        self.assertIn("KA-U-DE-TA", words)
        self.assertIn("KU-RO", words)
        # heading + 6 entry lines + total line
        self.assertGreaterEqual(len(ht13.lines()), 7)

    def test_ht13_kuro_line_total(self):
        ht13 = self.corpus["HT13"]
        kuro_lines = [ln for ln in ht13.lines() if "KU-RO" in ln.words()]
        self.assertEqual(len(kuro_lines), 1)
        self.assertAlmostEqual(kuro_lines[0].numeric_total(), 130.5)


if __name__ == "__main__":
    unittest.main()
