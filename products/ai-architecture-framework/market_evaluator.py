import logging
import json

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class MarketEvaluator:
    """
    Agent that tracks market chatter, evaluates it, and generates
    Stripe/Gumroad artifacts for highly desirable AI operations.
    """
    def __init__(self):
        self.market_insights = []

    def evaluate_market_chatter(self):
        """Simulate evaluating mm web indexed search results."""
        logger.info("Evaluating market chatter based on deep MM web indexed search...")

        # Generates exactly 3 artifacts as requested
        self.market_insights = [
            {
                "topic": "AI Hardware Selection Framework",
                "demand": "High",
                "suggested_price": 29.00
            },
            {
                "topic": "CUDA MLOps Wrapper",
                "demand": "High",
                "suggested_price": 49.00
            },
            {
                "topic": "System Prompt & Architecture Design Patterns",
                "demand": "Medium-High",
                "suggested_price": 19.00
            }
        ]
        logger.info(f"Found {len(self.market_insights)} high-demand topics.")

    def create_mock_gumroad_product(self, product_name, price):
        """Mock call to Gumroad API to create a product."""
        # Ensure we deploy a free test version with the word "test" in it
        test_product_name = f"{product_name} - FREE TEST VERSION"
        logger.info(f"Creating Gumroad Product: {test_product_name} at $0.00")
        return {"platform": "gumroad", "product_name": test_product_name, "status": "created"}

    def create_mock_stripe_product(self, product_name, price):
        """Mock call to Stripe API to create a product."""
        # Ensure we deploy a free test version with the word "test" in it
        test_product_name = f"{product_name} - FREE TEST VERSION"
        logger.info(f"Creating Stripe Product: {test_product_name} at $0.00")
        return {"platform": "stripe", "product_name": test_product_name, "status": "created"}

    def generate_products(self):
        results = []
        for insight in self.market_insights:
            g_res = self.create_mock_gumroad_product(insight['topic'], insight['suggested_price'])
            s_res = self.create_mock_stripe_product(insight['topic'], insight['suggested_price'])
            results.append((g_res, s_res))
        logger.info("All 3 products successfully created in mock test environment.")
        return results

if __name__ == "__main__":
    evaluator = MarketEvaluator()
    evaluator.evaluate_market_chatter()
    evaluator.generate_products()
