import math
import os
import sys
import json
import time
import pytest
from fastapi.testclient import TestClient

# Add tools to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../tools')))

from auto_compounder_api import (
    app,
    estimate_gas_cost,
    gas_guard_check,
    estimate_accumulated_yield,
    fetch_eth_price_usd,
    _positions,
    _compound_history,
    LOG_FILE
)

client = TestClient(app)

VALID_API_KEY = "test-key-123"
AUTH_HEADER = {"X-API-Key": VALID_API_KEY}

@pytest.fixture(autouse=True)
def setup_env(monkeypatch):
    monkeypatch.setenv("COMPOUND_API_KEY", VALID_API_KEY)

@pytest.fixture(autouse=True)
def reset_state():
    """Reset the global state before each test."""
    _positions.clear()
    _compound_history.clear()

    import auto_compounder_api
    auto_compounder_api._last_hash = "0" * 64
    auto_compounder_api._eth_price_cache.clear()

    # Backup and reset log file
    log_content = None
    if LOG_FILE.exists():
        with open(LOG_FILE, "r") as f:
            log_content = f.read()
        LOG_FILE.unlink()

    yield

    # Restore log file
    if log_content is not None:
        with open(LOG_FILE, "w") as f:
            f.write(log_content)
    elif LOG_FILE.exists():
        LOG_FILE.unlink()

# --- Helper Tests ---

def test_estimate_gas_cost():
    # 1.0 gwei, 200k units, $3500 ETH = 1.0 * 200_000 * 1e-9 * 3500 = 0.7
    assert math.isclose(estimate_gas_cost(1.0, 200_000, 3500.0), 0.7, rel_tol=1e-5)

    # 10.0 gwei, 200k units, $3000 ETH = 10.0 * 200_000 * 1e-9 * 3000 = 6.0
    assert math.isclose(estimate_gas_cost(10.0, 200_000, 3000.0), 6.0, rel_tol=1e-5)

def test_gas_guard_check():
    # Pass: $0.50 gas, $100 yield -> 0.5% (max 2%)
    passed, msg = gas_guard_check(0.5, 100.0)
    assert passed is True
    assert "Gas guard passed" in msg

    # Fail: $5.0 gas, $100 yield -> 5% (max 2%)
    passed, msg = gas_guard_check(5.0, 100.0)
    assert passed is False
    assert "exceeds" in msg

    # Fail: 0 yield
    passed, msg = gas_guard_check(0.5, 0.0)
    assert passed is False
    assert "No accumulated yield" in msg

def test_estimate_accumulated_yield():
    # $10k position, 10% APY, 24h -> 10000 * 0.1 / 365 = 2.7397
    assert math.isclose(estimate_accumulated_yield(10000.0, 10.0, 24.0), 2.739726, rel_tol=1e-5)

    # $10k position, 10% APY, 12h -> half of above = 1.36986
    assert math.isclose(estimate_accumulated_yield(10000.0, 10.0, 12.0), 1.369863, rel_tol=1e-5)

# --- API Tests ---

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"
    assert "timestamp" in data
    assert data["positions_tracked"] == 0
    assert data["compounds_executed"] == 0

def test_compound_execute():
    req_data = {
        "protocol": "aave-v3",
        "pool_id": "0x123",
        "wallet": "0xabc",
        "position_usd": 100000.0, # Large position
        "apy": 20.0, # High APY
        "gas_price_gwei": 1.0, # Low gas
        "chain": "arbitrum"
    }

    response = client.post("/compound", json=req_data, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "executed"
    assert data["gas_guard_passed"] is True
    assert data["protocol"] == "aave-v3"
    assert data["estimated_gas_usd"] > 0
    assert data["accumulated_yield_usd"] > 0

    # Verify position was tracked
    pos_key = "0xabc:0x123"
    assert pos_key in _positions
    assert math.isclose(_positions[pos_key]["total_compounded_usd"], data["accumulated_yield_usd"], rel_tol=1e-5)

    # Verify history was updated
    assert len(_compound_history) == 1
    assert _compound_history[0]["wallet"] == "0xabc"

def test_compound_skip():
    req_data = {
        "protocol": "aave-v3",
        "pool_id": "0x123",
        "wallet": "0xabc",
        "position_usd": 10.0, # Tiny position
        "apy": 5.0, # Low APY
        "gas_price_gwei": 50.0, # High gas
        "chain": "arbitrum"
    }

    response = client.post("/compound", json=req_data, headers=AUTH_HEADER)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "skipped_gas_guard"
    assert data["gas_guard_passed"] is False

    # History shouldn't be updated on skip
    assert len(_compound_history) == 0

def test_history_and_positions():
    # Setup some state
    _compound_history.append({"wallet": "0x111", "protocol": "A"})
    _compound_history.append({"wallet": "0x222", "protocol": "B"})

    _positions["0x111:poolA"] = {"wallet": "0x111", "protocol": "A"}
    _positions["0x222:poolB"] = {"wallet": "0x222", "protocol": "B"}

    # Test history all
    res = client.get("/history", headers=AUTH_HEADER)
    assert res.status_code == 200
    assert res.json()["total"] == 2

    # Test history filter
    res = client.get("/history?wallet=0x111", headers=AUTH_HEADER)
    assert res.status_code == 200
    assert res.json()["total"] == 1
    assert res.json()["records"][0]["protocol"] == "A"

    # Test positions all
    res = client.get("/positions", headers=AUTH_HEADER)
    assert res.status_code == 200
    assert res.json()["total"] == 2

    # Test positions filter
    res = client.get("/positions?wallet=0x222", headers=AUTH_HEADER)
    assert res.status_code == 200
    assert res.json()["total"] == 1
    assert res.json()["positions"][0]["protocol"] == "B"

def test_optimal_interval():
    # Valid request
    res = client.get("/optimal-interval?position_usd=10000&apy=10&gas_cost_usd=1.0")
    assert res.status_code == 200
    data = res.json()
    assert "optimal_interval_days" in data
    assert "optimal_interval_hours" in data
    assert data["optimal_interval_days"] > 0

    # Invalid request (negative APY)
    res = client.get("/optimal-interval?position_usd=10000&apy=-5&gas_cost_usd=1.0")
    assert res.status_code == 400
    assert res.json()["detail"] == "position_usd and apy must be > 0"

    # Invalid request (zero position)
    res = client.get("/optimal-interval?position_usd=0&apy=10&gas_cost_usd=1.0")
    assert res.status_code == 400
    assert res.json()["detail"] == "position_usd and apy must be > 0"

    # Invalid request (negative position)
    res = client.get("/optimal-interval?position_usd=-1000&apy=10&gas_cost_usd=1.0")
    assert res.status_code == 400
    assert res.json()["detail"] == "position_usd and apy must be > 0"

def test_audit_verify_empty():
    # Without any logs
    if LOG_FILE.exists():
        LOG_FILE.unlink()

    res = client.get("/audit/verify", headers=AUTH_HEADER)
    assert res.status_code == 200
    assert res.json()["verified"] is True
    assert res.json()["entries"] == 0

def test_audit_verify_with_logs():
    # Create some valid log entries
    req_data = {
        "protocol": "aave-v3",
        "pool_id": "0x123",
        "wallet": "0xabc",
        "position_usd": 100000.0,
        "apy": 20.0,
        "chain": "arbitrum"
    }

    client.post("/compound", json=req_data, headers=AUTH_HEADER)
    client.post("/compound", json=req_data, headers=AUTH_HEADER)

    res = client.get("/audit/verify", headers=AUTH_HEADER)
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is True
    assert data["entries"] == 2

    # Tamper with the log
    with open(LOG_FILE, "r") as f:
        lines = f.readlines()

    tampered_entry = json.loads(lines[0])
    tampered_entry["data"]["position_usd"] = 999999.0
    lines[0] = json.dumps(tampered_entry) + "\n"

    with open(LOG_FILE, "w") as f:
        f.writelines(lines)

    res = client.get("/audit/verify", headers=AUTH_HEADER)
    assert res.status_code == 200
    data = res.json()
    assert data["verified"] is False
    assert 1 in data["tampered_at_lines"]


# --- ETH price feed tests ---

class _FakeResponse:
    def __init__(self, payload, status_code=200):
        self._payload = payload
        self.status_code = status_code

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            import requests
            raise requests.HTTPError(f"status {self.status_code}")


def test_fetch_eth_price_usd_live(monkeypatch):
    """A successful CoinGecko response is parsed and cached."""
    import auto_compounder_api as api

    calls = {"n": 0}

    def fake_get(url, timeout=None):
        calls["n"] += 1
        assert "coingecko" in url or url == api.ETH_PRICE_API_URL
        return _FakeResponse({"ethereum": {"usd": 4242.5}})

    monkeypatch.setattr(api.requests, "get", fake_get)

    first = api.fetch_eth_price_usd()
    assert first["price"] == 4242.5
    assert first["source"] == "coingecko"
    assert first["cached"] is False

    # Second call within TTL must come from cache (no new HTTP call).
    second = api.fetch_eth_price_usd()
    assert second["price"] == 4242.5
    assert second["source"] == "cache"
    assert second["cached"] is True
    assert calls["n"] == 1

    # force_refresh bypasses the cache.
    third = api.fetch_eth_price_usd(force_refresh=True)
    assert third["source"] == "coingecko"
    assert calls["n"] == 2


def test_fetch_eth_price_usd_fallback_on_error(monkeypatch):
    """When CoinGecko errors and there is no cache, fall back to the constant."""
    import requests
    import auto_compounder_api as api

    def boom(url, timeout=None):
        raise requests.ConnectionError("offline")

    monkeypatch.setattr(api.requests, "get", boom)
    monkeypatch.setattr(api, "ETH_PRICE_FALLBACK_USD", 3500.0)

    result = api.fetch_eth_price_usd()
    assert result["price"] == 3500.0
    assert result["source"] == "fallback"


def test_fetch_eth_price_usd_stale_cache_on_error(monkeypatch):
    """A stale cache is preferred over the static fallback when the API fails."""
    import requests
    import auto_compounder_api as api

    # Seed a stale cache entry.
    api._eth_price_cache.update({
        "price": 4000.0,
        "fetched_at": time.time() - (api.ETH_PRICE_CACHE_TTL_SECONDS + 60),
        "source": "coingecko",
    })

    def boom(url, timeout=None):
        raise requests.Timeout("slow")

    monkeypatch.setattr(api.requests, "get", boom)

    result = api.fetch_eth_price_usd()
    assert result["price"] == 4000.0
    assert result["source"] == "cache-stale"


def test_fetch_eth_price_usd_bad_payload(monkeypatch):
    """Malformed payloads trigger the fallback path."""
    import auto_compounder_api as api

    monkeypatch.setattr(api.requests, "get", lambda url, timeout=None: _FakeResponse({"nope": 1}))
    monkeypatch.setattr(api, "ETH_PRICE_FALLBACK_USD", 1234.0)

    result = api.fetch_eth_price_usd()
    assert result["price"] == 1234.0
    assert result["source"] == "fallback"


def test_estimate_gas_cost_uses_live_price(monkeypatch):
    """estimate_gas_cost() with no explicit price consults fetch_eth_price_usd."""
    import auto_compounder_api as api

    monkeypatch.setattr(
        api,
        "fetch_eth_price_usd",
        lambda force_refresh=False: {"price": 2000.0, "source": "coingecko", "fetched_at": "now", "cached": False},
    )

    # 1 gwei * 200_000 units * 1e-9 * 2000 = 0.4
    assert math.isclose(api.estimate_gas_cost(1.0), 0.4, rel_tol=1e-5)


def test_estimate_gas_cost_explicit_price_bypasses_feed(monkeypatch):
    """Explicit eth_price_usd overrides the live feed (backward-compat)."""
    import auto_compounder_api as api

    def should_not_call(*a, **kw):
        raise AssertionError("feed must not be called when price is passed explicitly")

    monkeypatch.setattr(api, "fetch_eth_price_usd", should_not_call)
    assert math.isclose(estimate_gas_cost(1.0, 200_000, 3500.0), 0.7, rel_tol=1e-5)


def test_eth_price_endpoint(monkeypatch):
    import auto_compounder_api as api

    monkeypatch.setattr(
        api.requests,
        "get",
        lambda url, timeout=None: _FakeResponse({"ethereum": {"usd": 3000.0}}),
    )

    res = client.get("/eth-price")
    assert res.status_code == 200
    data = res.json()
    assert data["price"] == 3000.0
    assert data["source"] == "coingecko"

# --- Security Tests ---

def test_unauthorized_access():
    # No header
    res = client.post("/compound", json={})
    assert res.status_code == 403

    res = client.get("/history")
    assert res.status_code == 403

    # Invalid key
    res = client.get("/positions", headers={"X-API-Key": "wrong-key"})
    assert res.status_code == 403

def test_server_not_configured(monkeypatch):
    monkeypatch.delenv("COMPOUND_API_KEY", raising=False)
    res = client.get("/audit/verify", headers=AUTH_HEADER)
    assert res.status_code == 500
    assert "API authentication not configured" in res.json()["detail"]
