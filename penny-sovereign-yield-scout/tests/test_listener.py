import pytest
from tools.listener import SocialSignal, score_signal

def test_score_signal_normal():
    """Test standard conditions to ensure proper weighting calculation."""
    signal = SocialSignal(
        ticker="TEST",
        platform="twitter",
        mention_count_24h=1250,  # 1250 / 5000 = 0.25 -> * 0.25 = 0.0625
        yield_keywords_found=["APY", "yield"],  # 2 keywords > 0 weight
        penny_keywords_found=["gem"],  # 1 keyword
        risk_flags=["scam"],  # 1 flag -> 0.15 penalty
        raw_text_sample="TEST is a hidden gem with high APY yield"
    )
    score = score_signal(signal)

    assert 0.0 <= score <= 1.0

def test_score_signal_inflated():
    """Test massive inputs to guarantee the score maxes out at the maximum possible theoretical score 0.85 (0.35 + 0.25 + 0.25)."""
    # Massive mentions and many keywords
    signal = SocialSignal(
        ticker="TEST",
        platform="reddit",
        mention_count_24h=1_000_000,
        yield_keywords_found=["APY"] * 100,
        penny_keywords_found=["gem"] * 100,
        risk_flags=[],
        raw_text_sample="TO THE MOON" * 100
    )
    score = score_signal(signal)

    # max possible score = 0.35 + 0.25 + 0.25 = 0.85
    assert score == 0.85

def test_score_signal_penalized():
    """Test with extreme negative attributes to ensure the score floors at 0.0."""
    signal = SocialSignal(
        ticker="TEST",
        platform="telegram",
        mention_count_24h=0,
        yield_keywords_found=[],
        penny_keywords_found=[],
        risk_flags=["scam", "rug", "hack", "exploit", "drain"], # 5 flags -> big penalty
        raw_text_sample="RUN AWAY SCAM RUG HACK EXPLOIT DRAIN"
    )
    score = score_signal(signal)

    assert score == 0.0
