import unittest
import os
import sys

# Ensure products directory is in the path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import cuda_mlops_wrapper
from cuda_mlops_wrapper import CUDAMlopsWrapper
import market_evaluator
from market_evaluator import MarketEvaluator

class TestAIArchitectureFramework(unittest.TestCase):

    def test_cuda_mlops_wrapper(self):
        """Test the CUDAMlopsWrapper logic"""
        wrapper = CUDAMlopsWrapper()

        # Test evaluation
        self.assertTrue(wrapper.evaluate_task("heavy-task", 100))
        self.assertFalse(wrapper.evaluate_task("light-task", 5))

        # Test provisioning and training
        wrapper.provision_compute(instances=4)
        self.assertEqual(wrapper.active_gpus, 4)
        self.assertTrue(wrapper.is_provisioned)

        wrapper.run_training("heavy-task") # Should pass without raising exception

        # Test termination
        wrapper.terminate_compute()
        self.assertEqual(wrapper.active_gpus, 0)
        self.assertFalse(wrapper.is_provisioned)

    def test_market_evaluator(self):
        """Test MarketEvaluator functionality and free test validation constraint"""
        evaluator = MarketEvaluator()
        evaluator.evaluate_market_chatter()

        # Check exactly 3 artifacts exist
        self.assertEqual(len(evaluator.market_insights), 3)

        results = evaluator.generate_products()
        self.assertEqual(len(results), 3)

        # Verify the structure matches expected output (test word requirement simulation)
        for gumroad_res, stripe_res in results:
            self.assertEqual(gumroad_res["platform"], "gumroad")
            self.assertEqual(stripe_res["platform"], "stripe")
            # Ensure "TEST" is in the generated output as required
            self.assertIn("TEST", gumroad_res["product_name"])
            self.assertIn("TEST", stripe_res["product_name"])

    def test_markdown_and_html_artifacts_exist(self):
        """Test that the required markdown and HTML artifacts were generated."""
        system_prompt_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../ai_architecture_system.md'))
        self.assertTrue(os.path.exists(system_prompt_path))

        dashboard_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../oaudrey/hardware-dashboard.html'))
        self.assertTrue(os.path.exists(dashboard_path))

if __name__ == '__main__':
    unittest.main()
