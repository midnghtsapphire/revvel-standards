#!/usr/bin/env python3
"""
Test script for weak_signal_finder.py with mock data
"""

import importlib.util
import os
import sys

_module_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    'growlingeyes', 'tools', 'weak_signal_finder.py',
)
_spec = importlib.util.spec_from_file_location("weak_signal_finder", _module_path)
_wsf = importlib.util.module_from_spec(_spec)
sys.modules[_spec.name] = _wsf
_spec.loader.exec_module(_wsf)

clean_text = _wsf.clean_text
compute_word_frequency = _wsf.compute_word_frequency
compute_contextual_pairs = _wsf.compute_contextual_pairs
score_signal_strength = _wsf.score_signal_strength
WeakSignal = _wsf.WeakSignal

# Mock articles for testing
mock_articles = [
    {
        "source": "Test Feed 1",
        "title": "Ransomware vulnerability discovered in critical infrastructure",
        "summary": "Security researchers found a new zero-day exploit affecting ransomware protection systems. The vulnerability allows attackers to bypass security measures.",
        "link": "https://example.com/1",
        "published": "2026-04-30",
    },
    {
        "source": "Test Feed 2",
        "title": "Zero-day exploit targets ransomware defenses",
        "summary": "A critical vulnerability in ransomware detection systems has been exploited. Patch immediately to prevent attacks.",
        "link": "https://example.com/2",
        "published": "2026-04-30",
    },
    {
        "source": "Test Feed 3",
        "title": "Security patch released for vulnerability in ransomware tools",
        "summary": "Major security patch addresses zero-day vulnerability. Exploit has been used in several attacks targeting critical systems.",
        "link": "https://example.com/3",
        "published": "2026-04-30",
    },
]

def test_text_processing():
    """Test text cleaning and tokenization"""
    text = "This is a TEST with URLs https://example.com and special chars!@#"
    words = clean_text(text)
    assert "test" in words
    assert "example" not in words  # URLs should be removed
    assert len(words) > 0
    print("✓ Text processing works")

def test_word_frequency():
    """Test word frequency computation"""
    freq = compute_word_frequency(mock_articles)
    assert freq["ransomware"] > 0
    assert freq["vulnerability"] > 0
    assert freq["exploit"] > 0
    print(f"✓ Word frequency works: {dict(freq.most_common(5))}")

def test_contextual_pairs():
    """Test contextual pair detection"""
    freq = compute_word_frequency(mock_articles)
    top_words = set([word for word, _ in freq.most_common(10)])
    pairs = compute_contextual_pairs(mock_articles, top_words)
    assert len(pairs) > 0
    print(f"✓ Contextual pairs detected: {pairs[:3]}")

def test_signal_scoring():
    """Test signal scoring"""
    intensity = {"ransomware": 5, "vulnerability": 4, "exploit": 3, "patch": 2}
    pairs = [("ransomware", "vulnerability"), ("vulnerability", "exploit")]
    score = score_signal_strength(intensity, pairs)
    assert 0 <= score <= 100
    print(f"✓ Signal scoring works: {score:.2f}")

def test_full_pipeline():
    """Test the full pipeline with mock data"""
    freq = compute_word_frequency(mock_articles)
    intensity_words = {word: count for word, count in freq.most_common(10) if count >= 2}
    top_words = set(intensity_words.keys())
    contextual_pairs = compute_contextual_pairs(mock_articles, top_words)
    top_themes = list(intensity_words.keys())[:5]
    signal_score = score_signal_strength(intensity_words, contextual_pairs)
    
    signal = WeakSignal(
        domain="test",
        signal_timestamp="2026-04-30T16:30:00Z",
        intensity_words=intensity_words,
        contextual_pairs=contextual_pairs,
        top_emerging_themes=top_themes,
        signal_score=signal_score,
        article_count=len(mock_articles),
    )
    
    assert signal.domain == "test"
    assert signal.signal_score > 0
    assert len(signal.top_emerging_themes) > 0
    
    print(f"✓ Full pipeline works:")
    print(f"  - Domain: {signal.domain}")
    print(f"  - Score: {signal.signal_score:.2f}")
    print(f"  - Themes: {signal.top_emerging_themes}")
    print(f"  - Pairs: {signal.contextual_pairs[:3]}")

main = _wsf.main


def test_interval_validation():
    """Test that --interval rejects zero and negative values"""
    import unittest.mock

    for bad_value in ["0", "-1", "-100"]:
        with unittest.mock.patch(
            "sys.argv", ["weak_signal_finder", "--daemon", "--interval", bad_value]
        ):
            try:
                main()
                assert False, f"Expected SystemExit for --interval {bad_value}"
            except SystemExit as exc:
                assert exc.code == 2, (
                    f"Expected exit code 2 for --interval {bad_value}, got {exc.code}"
                )

    print("✓ Interval validation rejects zero and negative values")


if __name__ == "__main__":
    print("Testing Weak Signal Finder components...\n")

    test_text_processing()
    test_word_frequency()
    test_contextual_pairs()
    test_signal_scoring()
    test_full_pipeline()
    test_interval_validation()

    print("\n✅ All tests passed!")
