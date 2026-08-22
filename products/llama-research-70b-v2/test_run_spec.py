import unittest
from .run_spec import generate_scale_spec


class TestRunSpec(unittest.TestCase):
    def test_generate_scale_spec(self):
        spec = generate_scale_spec()
        self.assertEqual(spec["model"], "Llama-Research-70B-v2")
        self.assertEqual(spec["parameters"], "70B")
        self.assertEqual(spec["data_mix"], "15T multilingual text and code")
        self.assertEqual(spec["compute"], "2048 H100 / 60 day")
        self.assertEqual(spec["flops"], "6.3e24")
        self.assertTrue(spec["chinchilla_clean"])
        self.assertTrue(spec["fp8"])


if __name__ == "__main__":
    unittest.main()
