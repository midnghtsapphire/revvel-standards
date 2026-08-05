import sys
import os
import pytest
from datetime import datetime, timezone

# Add samples to path so we can import sample_pendle_locker_cli
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../samples')))

import sample_pendle_locker_cli

@pytest.fixture
def mock_datetime_now(mocker):
    """Fixture to mock datetime.now in the sample_pendle_locker_cli module."""
    fixed_now = datetime(2024, 1, 1, tzinfo=timezone.utc)
    mock_dt = mocker.patch('sample_pendle_locker_cli.datetime')
    mock_dt.now.return_value = fixed_now
    # Proxy fromisoformat to the real datetime.fromisoformat
    mock_dt.fromisoformat.side_effect = lambda s: datetime.fromisoformat(s)
    return fixed_now

def test_days_to_maturity_future(mock_datetime_now):
    # 10 days in the future
    maturity_iso = "2024-01-11T00:00:00Z"
    days = sample_pendle_locker_cli.days_to_maturity(maturity_iso)
    assert days == 10

def test_days_to_maturity_past(mock_datetime_now):
    # 10 days in the past
    maturity_iso = "2023-12-22T00:00:00Z"
    days = sample_pendle_locker_cli.days_to_maturity(maturity_iso)
    assert days == 0

def test_days_to_maturity_now(mock_datetime_now):
    # Exactly now
    maturity_iso = "2024-01-01T00:00:00Z"
    days = sample_pendle_locker_cli.days_to_maturity(maturity_iso)
    assert days == 0

def test_days_to_maturity_invalid_format(mocker):
    # Should handle ValueError
    # No need to mock datetime.now here as it should fail before calling it,
    # but let's be safe if we want to ensure it returns 0.
    days = sample_pendle_locker_cli.days_to_maturity("invalid-date")
    assert days == 0

def test_days_to_maturity_none_input():
    # Should handle AttributeError (from .replace("Z", ...))
    days = sample_pendle_locker_cli.days_to_maturity(None)
    assert days == 0
