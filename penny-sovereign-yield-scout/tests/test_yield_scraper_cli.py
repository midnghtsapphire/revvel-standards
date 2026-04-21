import pytest
import math
import sys
import os

# Add tools to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../tools')))

from yield_scraper_cli import compute_opportunity_score, filter_and_rank

def test_compute_opportunity_score():
    # opportunity_score = (apy_net / 100) * log10(tvl_usd) * (1 - il_risk) * (1 - rug_risk)

    # Happy path
    score = compute_opportunity_score(apy=10.0, tvl_usd=100_000, il_risk="none", tier=1)
    # 0.1 * 5 * 1.0 * 0.98 = 0.49
    assert math.isclose(score, 0.49, rel_tol=1e-4)

    # Zero / Negative scenarios
    assert compute_opportunity_score(0, 1000, "none", 1) == 0.0
    assert compute_opportunity_score(-5, 1000, "none", 1) == 0.0
    assert compute_opportunity_score(10, 0, "none", 1) == 0.0
    assert compute_opportunity_score(10, -100, "none", 1) == 0.0
    assert compute_opportunity_score(0, 0, "none", 1) == 0.0
    assert compute_opportunity_score(-1, -1, "none", 1) == 0.0
    assert compute_opportunity_score(0, -1, "none", 1) == 0.0
    assert compute_opportunity_score(-1, 0, "none", 1) == 0.0

    # Varying risk levels
    score_high_risk = compute_opportunity_score(apy=10.0, tvl_usd=100_000, il_risk="high", tier=3)
    # il_risk="high" -> 0.8, il_factor = 0.2
    # tier=3 -> 0.25, rug_factor = 0.75
    # 0.1 * 5 * 0.2 * 0.75 = 0.075
    assert math.isclose(score_high_risk, 0.075, rel_tol=1e-4)

def test_filter_and_rank():
    mock_pools = [
        {"id": 1, "apy": 5.0, "tvl_usd": 100_000, "opportunity_score": 0.5},
        {"id": 2, "apy": 10.0, "tvl_usd": 600_000, "opportunity_score": 1.5},
        {"id": 3, "apy": 15.0, "tvl_usd": 1_000_000, "opportunity_score": 2.5},
        {"id": 4, "apy": 2.0, "tvl_usd": 2_000_000, "opportunity_score": 0.2},
    ]

    # Test min_apy and min_tvl
    filtered = filter_and_rank(mock_pools, min_apy=5.0, min_tvl=500_000, top=10)
    assert len(filtered) == 2
    assert filtered[0]["id"] == 3  # Highest opportunity score
    assert filtered[0]["rank"] == 1
    assert filtered[1]["id"] == 2
    assert filtered[1]["rank"] == 2

    # Test top N
    filtered_top = filter_and_rank(mock_pools, min_apy=0.0, min_tvl=0.0, top=2)
    assert len(filtered_top) == 2
    assert filtered_top[0]["id"] == 3
    assert filtered_top[1]["id"] == 2

    # Test no matches
    filtered_none = filter_and_rank(mock_pools, min_apy=20.0, min_tvl=0.0, top=10)
    assert len(filtered_none) == 0


import json
from unittest.mock import patch, mock_open, MagicMock
from yield_scraper_cli import (
    load_protocols,
    fetch_all_pools,
    match_pools_to_protocols,
    _generate_mock_pools,
    display_results
)
import httpx

def test_load_protocols():
    mock_data = {"protocols": [{"id": 1, "name": "Test Protocol"}]}
    mock_json = json.dumps(mock_data)

    with patch("builtins.open", mock_open(read_data=mock_json)):
        protocols = load_protocols()
        assert len(protocols) == 1
        assert protocols[0]["name"] == "Test Protocol"

def test_fetch_all_pools_success():
    mock_response = MagicMock()
    mock_response.json.return_value = {"data": [{"pool": "1"}, {"pool": "2"}]}
    mock_response.raise_for_status.return_value = None

    with patch("yield_scraper_cli.httpx.get", return_value=mock_response) as mock_get:
        pools = fetch_all_pools()
        assert len(pools) == 2
        mock_get.assert_called_once()

def test_fetch_all_pools_http_error():
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = httpx.HTTPError("Mock Error")

    with patch("yield_scraper_cli.httpx.get", return_value=mock_response):
        with pytest.raises(httpx.HTTPError):
            fetch_all_pools()

def test_match_pools_to_protocols():
    protocols = [
        {"defillama_slug": "test-protocol", "name": "Test Protocol", "tier": 1, "il_risk": "low"},
        {"defillama_slug": "other-protocol", "name": "Other Protocol", "tier": 2, "il_risk": "high"}
    ]
    all_pools = [
        {"project": "test-protocol", "chain": "Ethereum", "apy": 10.0, "tvlUsd": 1_000_000, "pool": "pool-1", "symbol": "TEST-ETH"},
        {"project": "test-protocol", "chain": "Arbitrum", "apy": 15.0, "tvlUsd": 500_000, "pool": "pool-2", "symbol": "TEST-ARB"},
        {"project": "unknown-protocol", "chain": "Ethereum", "apy": 5.0, "tvlUsd": 100_000, "pool": "pool-3", "symbol": "UNK-ETH"},
    ]

    # Test without chain filter
    matched = match_pools_to_protocols(all_pools, protocols)
    assert len(matched) == 2
    assert matched[0]["project_slug"] == "test-protocol"
    assert matched[0]["chain"] == "Ethereum"
    assert matched[0]["opportunity_score"] > 0

    # Test with chain filter
    matched_chain = match_pools_to_protocols(all_pools, protocols, chain_filter="arbitrum")
    assert len(matched_chain) == 1
    assert matched_chain[0]["chain"] == "Arbitrum"

def test_generate_mock_pools():
    protocols = [
        {"id": "p1", "defillama_slug": "proto-1", "name": "Protocol 1", "typical_apy_range": [5, 10], "chain": ["ethereum", "arbitrum"]},
    ]
    mock_pools = _generate_mock_pools(protocols)
    assert len(mock_pools) == 2
    assert mock_pools[0]["project"] == "proto-1"
    assert mock_pools[0]["chain"] in ["ethereum", "arbitrum"]
    assert 5 <= mock_pools[0]["apy"] <= 10

@patch("yield_scraper_cli.console.print")
def test_display_results(mock_print):
    mock_pools = [{
        "rank": 1,
        "protocol": "Test Protocol",
        "chain": "Ethereum",
        "symbol": "TEST-ETH",
        "apy": 10.0,
        "tvl_usd": 1_000_000,
        "il_risk": "low",
        "opportunity_score": 0.5
    }]
    # Just checking it runs without errors
    display_results(mock_pools)
    mock_print.assert_called()


import argparse
from yield_scraper_cli import main, watch_mode

@patch("yield_scraper_cli.argparse.ArgumentParser.parse_args")
@patch("yield_scraper_cli.load_protocols")
@patch("yield_scraper_cli.fetch_all_pools")
@patch("yield_scraper_cli.display_results")
@patch("builtins.open", new_callable=mock_open)
@patch("yield_scraper_cli.Path.mkdir")
def test_main_happy_path(mock_mkdir, mock_file, mock_display, mock_fetch, mock_load, mock_args):
    # Setup mocks
    mock_args.return_value = argparse.Namespace(
        top=10, min_apy=0.0, min_tvl=500_000.0, chain=None, output=None, watch=False, alert_tvl_drop=20.0
    )
    mock_load.return_value = [{"defillama_slug": "test", "name": "Test", "tier": 1, "il_risk": "low"}]
    mock_fetch.return_value = [{"project": "test", "apy": 10.0, "tvlUsd": 1_000_000, "pool": "pool-1"}]

    # Run main
    with patch("os.getenv", return_value="./logs"):
        main()

    mock_load.assert_called_once()
    mock_fetch.assert_called_once()
    mock_display.assert_called_once()
    mock_file.assert_called_once()

    # Check if the generated JSON output contains the ranked pool
    written_content = "".join(call[0][0] for call in mock_file().write.call_args_list)
    assert "pool-1" in written_content

@patch("yield_scraper_cli.argparse.ArgumentParser.parse_args")
@patch("yield_scraper_cli.load_protocols")
@patch("yield_scraper_cli.fetch_all_pools")
@patch("yield_scraper_cli._generate_mock_pools")
@patch("yield_scraper_cli.display_results")
def test_main_offline_mode(mock_display, mock_generate, mock_fetch, mock_load, mock_args):
    mock_args.return_value = argparse.Namespace(
        top=10, min_apy=0.0, min_tvl=500_000.0, chain=None, output="test_out.json", watch=False, alert_tvl_drop=20.0
    )
    mock_load.return_value = [{"defillama_slug": "test", "name": "Test", "tier": 1, "il_risk": "low"}]

    # Simulate HTTP error
    mock_fetch.side_effect = httpx.HTTPError("Network down")

    mock_generate.return_value = [{"project": "test", "apy": 15.0, "tvlUsd": 1_000_000, "pool": "mock-pool"}]

    with patch("builtins.open", mock_open()) as mock_file:
        main()

    mock_generate.assert_called_once()
    mock_display.assert_called_once()

    # Output file test
    mock_file.assert_called_with("test_out.json", "w", encoding="utf-8")

@patch("yield_scraper_cli.argparse.ArgumentParser.parse_args")
@patch("yield_scraper_cli.load_protocols")
@patch("yield_scraper_cli.watch_mode")
def test_main_watch_mode(mock_watch, mock_load, mock_args):
    mock_args.return_value = argparse.Namespace(
        top=10, min_apy=0.0, min_tvl=500_000.0, chain=None, output=None, watch=True, alert_tvl_drop=20.0
    )
    protocols = [{"defillama_slug": "test"}]
    mock_load.return_value = protocols

    main()

    mock_watch.assert_called_once_with(mock_args.return_value, protocols)

@patch("yield_scraper_cli.fetch_all_pools")
@patch("yield_scraper_cli.display_results")
@patch("yield_scraper_cli.time.sleep")
def test_watch_mode(mock_sleep, mock_display, mock_fetch):
    args = argparse.Namespace(
        top=10, min_apy=0.0, min_tvl=500_000.0, chain=None, alert_tvl_drop=20.0
    )
    protocols = [{"defillama_slug": "test", "name": "Test", "tier": 1, "il_risk": "low"}]

    # First iteration: normal fetch
    # Second iteration: TVL drops below threshold
    # Third iteration: KeyboardInterrupt to exit loop
    mock_fetch.side_effect = [
        [{"project": "test", "apy": 10.0, "tvlUsd": 1_000_000, "pool": "pool-1", "symbol": "TEST"}],
        [{"project": "test", "apy": 10.0, "tvlUsd": 700_000, "pool": "pool-1", "symbol": "TEST"}], # 30% drop
        KeyboardInterrupt()
    ]

    with patch("yield_scraper_cli.console.print") as mock_print:
        watch_mode(args, protocols)

    assert mock_fetch.call_count == 3
    assert mock_display.call_count == 2

    # Check if TVL alert was printed
    alert_printed = any("TVL ALERT" in call[0][0] for call in mock_print.call_args_list)
    assert alert_printed is True

@patch("yield_scraper_cli.fetch_all_pools")
@patch("yield_scraper_cli.time.sleep")
def test_watch_mode_http_error(mock_sleep, mock_fetch):
    args = argparse.Namespace(
        top=10, min_apy=0.0, min_tvl=500_000.0, chain=None, alert_tvl_drop=20.0
    )
    protocols = []

    # First iteration: HTTP Error
    # Second iteration: KeyboardInterrupt
    mock_fetch.side_effect = [
        httpx.HTTPError("Network down"),
        KeyboardInterrupt()
    ]

    watch_mode(args, protocols)

    assert mock_fetch.call_count == 2
    mock_sleep.assert_called_with(30) # Retry after 30s

def test_filter_and_rank_unordered():
    # Test with un-ordered pools, edge conditions, and matching scores
    mock_pools = [
        {"id": "A", "apy": 5.0, "tvl_usd": 500_000, "opportunity_score": 1.0}, # Exact minimums
        {"id": "B", "apy": 10.0, "tvl_usd": 600_000, "opportunity_score": 2.0},
        {"id": "C", "apy": 15.0, "tvl_usd": 1_000_000, "opportunity_score": 3.0}, # Highest score
        {"id": "D", "apy": 2.0, "tvl_usd": 2_000_000, "opportunity_score": 0.2}, # Filtered out (low APY)
        {"id": "E", "apy": 20.0, "tvl_usd": 100_000, "opportunity_score": 4.0}, # Filtered out (low TVL)
        {"id": "F", "apy": 10.0, "tvl_usd": 800_000, "opportunity_score": 2.0}, # Equal score to B
    ]

    filtered = filter_and_rank(mock_pools, min_apy=5.0, min_tvl=500_000, top=10)

    # D and E should be filtered out
    assert len(filtered) == 4

    # Check ranking
    assert filtered[0]["id"] == "C"
    assert filtered[0]["rank"] == 1

    # B and F have equal scores, so their relative order depends on Python's stable sort
    # Since F comes after B in the original list, B will come before F if they have the same score
    # Both should have rank 2 and 3
    assert filtered[1]["id"] in ["B", "F"]
    assert filtered[1]["opportunity_score"] == 2.0
    assert filtered[1]["rank"] == 2

    assert filtered[2]["id"] in ["B", "F"]
    assert filtered[2]["opportunity_score"] == 2.0
    assert filtered[2]["rank"] == 3

    # A has the lowest score among the remaining
    assert filtered[3]["id"] == "A"
    assert filtered[3]["rank"] == 4

def test_filter_and_rank_top_limit():
    mock_pools = [
        {"id": "1", "apy": 10.0, "tvl_usd": 1_000_000, "opportunity_score": 1.0},
        {"id": "2", "apy": 10.0, "tvl_usd": 1_000_000, "opportunity_score": 2.0},
        {"id": "3", "apy": 10.0, "tvl_usd": 1_000_000, "opportunity_score": 3.0},
        {"id": "4", "apy": 10.0, "tvl_usd": 1_000_000, "opportunity_score": 4.0},
        {"id": "5", "apy": 10.0, "tvl_usd": 1_000_000, "opportunity_score": 5.0},
    ]

    filtered = filter_and_rank(mock_pools, min_apy=5.0, min_tvl=500_000, top=3)

    assert len(filtered) == 3
    assert filtered[0]["id"] == "5"
    assert filtered[1]["id"] == "4"
    assert filtered[2]["id"] == "3"
    assert filtered[2]["rank"] == 3
