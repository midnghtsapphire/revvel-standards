import sys
import os
import json
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

    # Call the function with an asset filter
    result = sample_aave_optimizer.fetch_aave_markets(asset_filter="USDC")

    # It should return the mock data filtered by USDC
    expected_mock_result = sample_aave_optimizer._mock_aave_markets("USDC")

    assert len(result) > 0
    assert len(result) == len(expected_mock_result)

    # Verify the first item has the expected attributes
    for market in result:
        assert "USDC" in market.symbol.upper()

@pytest.mark.parametrize("position_usd, ltv, loops, supply_apy, borrow_apy, expected_supply, expected_borrow, expected_net_apy", [
    # 1 loop, 0.8 LTV: supply = 1 + 0.8 = 1.8, borrow = 0.8
    (1000.0, 0.8, 1, 5.0, 7.0, 1800.0, 800.0, 3.4),
    # 0 loops: supply = 1, borrow = 0
    (1000.0, 0.75, 0, 5.0, 7.0, 1000.0, 0.0, 5.0),
    # 0 LTV: supply = 1, borrow = 0
    (1000.0, 0.0, 3, 5.0, 7.0, 1000.0, 0.0, 5.0),
    # 3 loops, 0.5 LTV:
    # supply_mult = 1 + 0.5 + 0.25 + 0.125 = 1.875
    # borrow_mult = 0.5 + 0.25 + 0.125 = 0.875
    # gross_supply = 4.0 * 1.875 = 7.5
    # borrow_cost = 6.0 * 0.875 = 5.25
    # net_apy = 7.5 - 5.25 = 2.25
    (1000.0, 0.5, 3, 4.0, 6.0, 1875.0, 875.0, 2.25),
])
def test_simulate_loop(position_usd, ltv, loops, supply_apy, borrow_apy, expected_supply, expected_borrow, expected_net_apy):
    market = sample_aave_optimizer.AaveMarket(
        chain="Ethereum",
        symbol="USDC",
        supply_apy=supply_apy,
        borrow_apy_stable=borrow_apy,
        borrow_apy_variable=borrow_apy,
        tvl_usd=1_000_000,
        utilisation_rate=0.5,
        pool_id="mock-pool"
    )

    result = sample_aave_optimizer.simulate_loop(market, position_usd, ltv, loops)

    assert result.effective_supply_usd == pytest.approx(expected_supply)
    assert result.effective_borrow_usd == pytest.approx(expected_borrow)
    assert result.net_apy == pytest.approx(expected_net_apy)
    assert result.position_usd == position_usd
    assert result.ltv == ltv
    assert result.loops == loops

def test_display_functions(mocker):
    """
    Test display functions to ensure they don't crash and increase coverage.
    """
    # Mock console.print to avoid output during tests
    mock_print = mocker.patch('sample_aave_optimizer.console.print')

    market = sample_aave_optimizer.AaveMarket(
        chain="Ethereum",
        symbol="USDC",
        supply_apy=5.0,
        borrow_apy_stable=7.0,
        borrow_apy_variable=7.0,
        tvl_usd=1_000_000,
        utilisation_rate=0.5,
        pool_id="mock-pool"
    )

    # Test display_markets
    sample_aave_optimizer.display_markets([market])
    assert mock_print.called

    # Test display_loop_simulation
    result = sample_aave_optimizer.simulate_loop(market, 1000.0)
    sample_aave_optimizer.display_loop_simulation(result)
    assert mock_print.call_count >= 2

    # Test negative net APY case
    bad_market = sample_aave_optimizer.AaveMarket(
        chain="Ethereum",
        symbol="USDC",
        supply_apy=1.0,
        borrow_apy_stable=20.0,
        borrow_apy_variable=20.0,
        tvl_usd=1_000_000,
        utilisation_rate=0.5,
        pool_id="mock-pool"
    )
    bad_result = sample_aave_optimizer.simulate_loop(bad_market, 1000.0)
    sample_aave_optimizer.display_loop_simulation(bad_result)

def test_fetch_aave_markets_success(mocker):
    """
    Test fetch_aave_markets success path with mocked HTTP response.
    """
    mock_data = {
        "data": [
            {
                "project": "aave-v3",
                "symbol": "USDC",
                "chain": "Ethereum",
                "apyBase": 5.0,
                "apyBaseBorrow": 7.0,
                "tvlUsd": 1_000_000,
                "utilRate": 0.5,
                "pool": "pool1"
            },
            {
                "project": "other",
                "symbol": "DAI",
                "chain": "Polygon",
                "apyBase": 3.0,
                "tvlUsd": 500_000
            }
        ]
    }

    mock_resp = mocker.Mock()
    mock_resp.json.return_value = mock_data
    mock_resp.raise_for_status.return_value = None
    mocker.patch('sample_aave_optimizer.httpx.get', return_value=mock_resp)

    markets = sample_aave_optimizer.fetch_aave_markets("USDC")
    assert len(markets) == 1
    assert markets[0].symbol == "USDC"
    assert markets[0].supply_apy == 5.0

def test_main_cli(mocker):
    """
    Test the main function with mocked args.
    """
    mocker.patch('sample_aave_optimizer.fetch_aave_markets', return_value=[])
    mocker.patch('sample_aave_optimizer.display_markets')
    mock_parse = mocker.patch('sample_aave_optimizer.argparse.ArgumentParser.parse_args')
    mock_parse.return_value = mocker.Mock(
        asset="USDC",
        chain="",
        top=12,
        show_loop_sim=False,
        position_usd=10000.0,
        loop_ltv=0.75,
        loops=3,
        output=None
    )

    sample_aave_optimizer.main()

def test_main_cli_full(mocker, tmp_path):
    """
    Test the main function with all flags including show_loop_sim and output.
    """
    market = sample_aave_optimizer.AaveMarket(
        chain="Ethereum",
        symbol="USDC",
        supply_apy=5.0,
        borrow_apy_stable=7.0,
        borrow_apy_variable=7.0,
        tvl_usd=1_000_000,
        utilisation_rate=0.5,
        pool_id="mock-pool"
    )
    mocker.patch('sample_aave_optimizer.fetch_aave_markets', return_value=[market])
    mocker.patch('sample_aave_optimizer.console.print')
    mocker.patch('sample_aave_optimizer.console.rule')

    output_file = tmp_path / "output.json"

    mock_parse = mocker.patch('sample_aave_optimizer.argparse.ArgumentParser.parse_args')
    mock_parse.return_value = mocker.Mock(
        asset="USDC",
        chain="Eth",
        top=12,
        show_loop_sim=True,
        position_usd=10000.0,
        loop_ltv=0.75,
        loops=3,
        output=str(output_file)
    )

    sample_aave_optimizer.main()

    assert output_file.exists()
    with open(output_file, 'r') as f:
        data = json.load(f)
        assert len(data) == 1
        assert data[0]['symbol'] == 'USDC'
