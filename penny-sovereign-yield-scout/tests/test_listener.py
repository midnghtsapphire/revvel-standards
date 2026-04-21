import pytest
from unittest.mock import patch
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../tools')))

from listener import (
    SocialSignal,
    score_signal,
    classify_action,
    scan_ticker,
    scan_tickers,
    YIELD_KEYWORDS,
    PENNY_KEYWORDS
)


def test_score_signal_max_score():
    signal = SocialSignal(
        ticker="MAX",
        platform="twitter+reddit",
        mention_count_24h=5000,
        yield_keywords_found=YIELD_KEYWORDS,
        penny_keywords_found=PENNY_KEYWORDS,
        risk_flags=[],
        raw_text_sample="Maximum score text."
    )
    score = score_signal(signal)

    # 1.0 * 0.35 + 1.0 * 0.25 + 1.0 * 0.25 - 0.0 = 0.85
    assert score == 0.85


def test_score_signal_risk_penalty():
    # Base score without risk:
    # yield: 0/max = 0
    # penny: 0/max = 0
    # mentions: 0/5000 = 0
    # Should be 0.0, bounded to 0.0 even with negative penalty.
    signal = SocialSignal(
        ticker="DUD",
        platform="twitter",
        mention_count_24h=0,
        yield_keywords_found=[],
        penny_keywords_found=[],
        risk_flags=["rug", "scam", "hack", "exploit", "drain"],
        raw_text_sample="Scam project."
    )
    score = score_signal(signal)
    assert score == 0.0

    # Let's test a score that would be positive but is reduced by risk.
    # yield: 1.0 -> +0.35
    # penny: 0.0 -> +0.0
    # mentions: 5000 -> +0.25
    # Total before risk: 0.60
    # Risk flags (5) * 0.15 = 0.75, capped at 0.50.
    # Result: 0.60 - 0.50 = 0.10
    signal_partial = SocialSignal(
        ticker="MID",
        platform="twitter",
        mention_count_24h=5000,
        yield_keywords_found=YIELD_KEYWORDS,
        penny_keywords_found=[],
        risk_flags=["rug", "scam", "hack", "exploit", "drain"],
        raw_text_sample="Risky yield project."
    )
    score_partial = score_signal(signal_partial)
    assert score_partial == 0.10


@pytest.mark.parametrize("score,expected_action", [
    (0.85, "SWEEP_PRIORITY"),
    (0.80, "SWEEP_PRIORITY"),
    (0.70, "SWEEP"),
    (0.65, "SWEEP"),
    (0.50, "WATCH"),
    (0.45, "WATCH"),
    (0.30, "HOLD"),
    (0.00, "HOLD")
])
def test_classify_action(score, expected_action):
    assert classify_action(score) == expected_action


@patch("listener._mock_twitter_scan")
@patch("listener._mock_reddit_scan")
def test_scan_ticker_mocked(mock_reddit, mock_twitter):
    mock_twitter.return_value = {
        "mention_count_24h": 1000,
        "yield_keywords_found": ["APY", "yield"],
        "penny_keywords_found": ["penny"],
        "risk_flags": [],
        "raw_text_sample": "Twitter mock"
    }
    mock_reddit.return_value = {
        "mention_count_24h": 500,
        "yield_keywords_found": ["yield", "APR"],
        "penny_keywords_found": ["low cap"],
        "risk_flags": ["rug"],
        "raw_text_sample": "Reddit mock"
    }

    signal = scan_ticker("MOCK")

    assert signal.ticker == "MOCK"
    assert signal.platform == "twitter+reddit"
    assert signal.mention_count_24h == 1500
    assert set(signal.yield_keywords_found) == {"APY", "yield", "APR"}
    assert set(signal.penny_keywords_found) == {"penny", "low cap"}
    assert set(signal.risk_flags) == {"rug"}
    assert signal.raw_text_sample == "Twitter mock"

    # Score calculation check:
    # yield: 3 / len(YIELD) * 0.35 = 3/15 * 0.35 = 0.07
    # penny: 2 / len(PENNY) * 0.25 = 2/10 * 0.25 = 0.05
    # mentions: 1500 / 5000 * 0.25 = 0.3 * 0.25 = 0.075
    # risk: 1 * 0.15 = 0.15
    # Total = 0.07 + 0.05 + 0.075 - 0.15 = 0.045 -> 0.045
    assert isinstance(signal.sentiment_score, float)
    assert signal.sentiment_score == 0.045
    assert signal.recommended_action == "HOLD"


@patch("listener.scan_ticker")
def test_scan_tickers_threshold(mock_scan_ticker):
    # Setup mock returns
    def side_effect(ticker):
        sig = SocialSignal(
            ticker=ticker,
            platform="mock",
            mention_count_24h=100,
            yield_keywords_found=[],
            penny_keywords_found=[],
            risk_flags=[],
            raw_text_sample=""
        )
        if ticker == "TICK1":
            sig.sentiment_score = 0.80
        elif ticker == "TICK2":
            sig.sentiment_score = 0.60
        elif ticker == "TICK3":
            sig.sentiment_score = 0.40
        elif ticker == "TICK4":
            sig.sentiment_score = 0.50
        return sig

    mock_scan_ticker.side_effect = side_effect

    results = scan_tickers(["TICK1", "TICK2", "TICK3", "TICK4"], threshold=0.50)

    # Assert only >=0.50 are returned
    assert len(results) == 3

    # Assert they are sorted descending
    assert results[0].ticker == "TICK1"
    assert results[0].sentiment_score == 0.80
    assert results[1].ticker == "TICK2"
    assert results[1].sentiment_score == 0.60
    assert results[2].ticker == "TICK4"
    assert results[2].sentiment_score == 0.50
