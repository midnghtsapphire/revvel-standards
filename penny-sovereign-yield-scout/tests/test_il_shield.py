import math
import pytest
import sys
import os

# Add tools to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../tools')))

from il_shield import (
    impermanent_loss_50_50,
    impermanent_loss_weighted,
    concentrated_liquidity_il,
    shield_check,
    ShieldResult
)

def test_impermanent_loss_50_50():
    # 1.0 -> 0.0
    assert math.isclose(impermanent_loss_50_50(1.0), 0.0, abs_tol=1e-9)

    # 2.0 -> approx -0.0571909584
    # 2 * sqrt(2) / (1 + 2) - 1 = 2 * 1.41421356 / 3 - 1 = 2.82842712 / 3 - 1 = 0.94280904 - 1 = -0.05719096
    assert math.isclose(impermanent_loss_50_50(2.0), -0.0571909584, rel_tol=1e-7)

    # 0.5 -> same as 2.0
    # 2 * sqrt(0.5) / (1 + 0.5) - 1 = 2 * 0.70710678 / 1.5 - 1 = 1.41421356 / 1.5 - 1 = 0.94280904 - 1 = -0.05719096
    assert math.isclose(impermanent_loss_50_50(0.5), -0.0571909584, rel_tol=1e-7)

    # 4.0 -> -0.2
    # 2 * sqrt(4) / (1 + 4) - 1 = 2 * 2 / 5 - 1 = 4 / 5 - 1 = 0.8 - 1 = -0.2
    assert math.isclose(impermanent_loss_50_50(4.0), -0.2, abs_tol=1e-9)

    # invalid inputs
    with pytest.raises(ValueError, match="price_ratio must be > 0"):
        impermanent_loss_50_50(0)
    with pytest.raises(ValueError, match="price_ratio must be > 0"):
        impermanent_loss_50_50(-1.0)

def test_impermanent_loss_weighted():
    # 1.0, any weight -> 0.0
    assert math.isclose(impermanent_loss_weighted(1.0, 0.8), 0.0, abs_tol=1e-9)

    # 2.0, 0.8 -> approx -0.0427533
    # (2 ** 0.2) / (0.8 + 0.2 * 2) - 1 = 1.14869835 / 1.2 - 1 = 0.9572486 - 1 = -0.0427514 (approx)
    # Let's re-calculate: 2^0.2 = 1.1486983547441298
    # 0.8 + 0.2 * 2 = 1.2
    # 1.1486983547441298 / 1.2 - 1 = 0.9572486289534415 - 1 = -0.0427513710465585
    assert math.isclose(impermanent_loss_weighted(2.0, 0.8), -0.0427513710465585, rel_tol=1e-7)

    # 2.0, 0.5 -> should match 50/50
    assert math.isclose(impermanent_loss_weighted(2.0, 0.5), impermanent_loss_50_50(2.0), abs_tol=1e-9)

    # invalid weights
    with pytest.raises(ValueError, match="weight_a must be between 0 and 1 exclusive"):
        impermanent_loss_weighted(2.0, 0.0)
    with pytest.raises(ValueError, match="weight_a must be between 0 and 1 exclusive"):
        impermanent_loss_weighted(2.0, 1.0)

def test_concentrated_liquidity_il():
    # Inside range
    # Ratio 1.0, range [0.8, 1.2] -> 0.0
    assert math.isclose(concentrated_liquidity_il(1.0, 0.8, 1.2), 0.0, abs_tol=1e-9)

    # Ratio 0.9, range [0.8, 1.2]
    # edge_proximity = min(abs(0.9-0.8)/0.4, abs(0.9-1.2)/0.4) = min(0.1/0.4, 0.3/0.4) = 0.25
    # base_il = impermanent_loss_50_50(0.9)
    # expected = base_il * (1 - 0.25) = base_il * 0.75
    base_il = impermanent_loss_50_50(0.9)
    assert math.isclose(concentrated_liquidity_il(0.9, 0.8, 1.2), base_il * 0.75, abs_tol=1e-9)

    # Outside range
    # Ratio 1.5, range [0.8, 1.2] -> base IL
    assert math.isclose(concentrated_liquidity_il(1.5, 0.8, 1.2), impermanent_loss_50_50(1.5), abs_tol=1e-9)

def test_shield_check():
    # Approved
    res = shield_check("ETH", "USDC", 1.1, max_il_pct=5.0)
    assert res.shield_approved is True
    assert res.estimated_il_pct < 5.0
    assert "✅" in res.reason

    # Blocked
    res = shield_check("ETH", "USDC", 2.0, max_il_pct=5.0)
    assert res.shield_approved is False
    assert res.estimated_il_pct > 5.0
    assert "❌" in res.reason

    # Weighted Approved (IL is ~4.27% for 80/20 at 2x)
    res = shield_check("ETH", "USDC", 2.0, pool_type="weighted", weight_a=0.8, max_il_pct=5.0)
    assert res.shield_approved is True
    assert math.isclose(res.estimated_il_pct, 4.2751, abs_tol=1e-4)

    # Invalid pool type
    with pytest.raises(ValueError, match="Unknown pool_type: invalid"):
        shield_check("ETH", "USDC", 1.1, pool_type="invalid")

    # Concentrated missing params
    with pytest.raises(ValueError, match="price_lower and price_upper required for concentrated pools"):
        shield_check("ETH", "USDC", 1.1, pool_type="concentrated")

def test_shield_result_dataclass():
    res = ShieldResult(
        token0="ETH",
        token1="USDC",
        price_ratio=1.1,
        pool_type="50_50",
        estimated_il_pct=0.22,
        max_il_pct=5.0,
        shield_approved=True,
        reason="Looks good"
    )
    assert res.token0 == "ETH"
    assert res.timestamp != ""
    d = res.to_dict()
    assert d["token0"] == "ETH"
    assert "timestamp" in d
