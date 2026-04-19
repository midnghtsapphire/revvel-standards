import math
import pytest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../tools')))

from auto_compounder_api import estimate_gas_cost

def test_estimate_gas_cost_standard():
    # Example 1: 1.0 gwei, 200,000 units, 3500 USD/ETH
    assert math.isclose(estimate_gas_cost(1.0, 200_000, 3500.0), 1.0 * 200_000 * 1e-9 * 3500.0, rel_tol=1e-9)
    assert math.isclose(estimate_gas_cost(1.0, 200_000, 3500.0), 0.7, rel_tol=1e-9)

def test_estimate_gas_cost_default_args():
    # gas_units default is 200,000, eth_price_usd default is 3500.0
    assert math.isclose(estimate_gas_cost(1.0), 0.7, rel_tol=1e-9)

def test_estimate_gas_cost_zero():
    # Zero gas price
    assert estimate_gas_cost(0.0) == 0.0
    # Zero gas units
    assert estimate_gas_cost(1.0, gas_units=0) == 0.0
    # Zero eth price
    assert estimate_gas_cost(1.0, eth_price_usd=0.0) == 0.0

def test_estimate_gas_cost_large_values():
    # Large gas price (10,000 gwei)
    # Large gas units (2,000,000)
    # Large eth price (100,000)
    assert math.isclose(estimate_gas_cost(10000.0, 2_000_000, 100_000.0), 10000.0 * 2_000_000 * 1e-9 * 100_000.0, rel_tol=1e-9)
