import sys
import os
import pytest
import httpx

# Add samples to path so we can import sample_aave_optimizer
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../samples')))

import sample_aave_optimizer

def test_fetch_aave_markets_http_error(mocker):
    """
    Test that fetch_aave_markets handles httpx.HTTPError by falling back
    to mock data.
    """
    # Mock httpx.get to raise an HTTPError
    mocker.patch(
        'sample_aave_optimizer.httpx.get',
        side_effect=httpx.HTTPError("Mock HTTP Error")
    )

    # Also mock the console to avoid printing to stdout during tests, if desired
    # mocker.patch('sample_aave_optimizer.console.print')

    # Call the function with an asset filter
    result = sample_aave_optimizer.fetch_aave_markets(asset_filter="USDC")

    # It should return the mock data filtered by USDC
    # Let's get what _mock_aave_markets would return directly
    expected_mock_result = sample_aave_optimizer._mock_aave_markets("USDC")

    assert len(result) > 0
    assert len(result) == len(expected_mock_result)

    # Verify the first item has the expected attributes
    # Check that all returned items have "USDC" in their symbol
    for market in result:
        assert "USDC" in market.symbol.upper()
