"""Tests for the delivery gate.

`check` and `true_peak_dbtp` are pure, so the logic that decides whether a
master ships is testable without audio files, Matchering, or a render.
"""

from __future__ import annotations

import numpy as np
import pytest

from repaint_core import mastering as M


def measurement(**over) -> M.Measurement:
    base = dict(
        integrated_lufs=-14.0,
        true_peak_dbtp=-2.5,
        sample_peak_dbfs=-3.0,
        sample_rate=44100,
        channels=2,
    )
    return M.Measurement(**{**base, **over})


class TestProfiles:
    def test_amazon_is_the_outlier_on_both_axes(self):
        amazon = M.PROFILES["amazon"]
        assert amazon.target_lufs == -13.0
        assert amazon.max_true_peak_dbtp == -2.0

    def test_delivery_default_takes_the_strictest_ceiling(self):
        # A -1.0 dBTP master fails Amazon. One deliverable means -2.0.
        assert M.DELIVERY.max_true_peak_dbtp <= min(
            p.max_true_peak_dbtp for p in M.PROFILES.values()
        )

    def test_delivery_default_targets_the_main_cluster(self):
        assert M.DELIVERY.target_lufs == -14.0


class TestCheck:
    def test_on_target_passes(self):
        assert M.check(measurement()).passed

    def test_too_loud_fails_and_says_so(self):
        v = M.check(measurement(integrated_lufs=-9.0))
        assert not v.passed
        assert "louder" in v.failures[0]

    def test_too_quiet_fails_and_says_so(self):
        v = M.check(measurement(integrated_lufs=-20.0))
        assert not v.passed
        assert "quieter" in v.failures[0]

    def test_within_tolerance_passes(self):
        assert M.check(measurement(integrated_lufs=-14.8)).passed

    def test_just_outside_tolerance_fails(self):
        assert not M.check(measurement(integrated_lufs=-15.2)).passed

    def test_true_peak_over_ceiling_fails(self):
        v = M.check(measurement(true_peak_dbtp=-0.5))
        assert not v.passed
        assert any("true peak" in f for f in v.failures)

    def test_both_problems_reported_not_just_the_first(self):
        v = M.check(measurement(integrated_lufs=-8.0, true_peak_dbtp=0.5))
        assert len(v.failures) == 2

    def test_a_minus_one_dbtp_master_passes_spotify_but_fails_amazon(self):
        # The exact trap the single-deliverable rule exists to avoid: a master
        # cut to the common -1.0 dBTP ceiling is over Amazon's -2.0.
        m = measurement(integrated_lufs=-13.5, true_peak_dbtp=-1.0)
        assert M.check(m, M.PROFILES["spotify"]).passed
        assert not M.check(m, M.PROFILES["amazon"]).passed

    def test_summary_reports_the_numbers(self):
        s = M.check(measurement(integrated_lufs=-9.0)).summary()
        assert "FAIL" in s and "LUFS" in s and "dBTP" in s

    def test_passing_summary_says_pass(self):
        assert M.check(measurement()).summary().startswith("PASS")


class TestTruePeak:
    def test_oversampled_peak_meets_or_exceeds_sample_peak(self):
        sr = 44100
        t = np.arange(sr) / sr
        # Frequency chosen so maxima fall between samples.
        y = 0.9 * np.sin(2 * np.pi * 11025.7 * t)
        sample_peak_db = 20 * np.log10(np.max(np.abs(y)))
        assert M.true_peak_dbtp(y, sr) >= sample_peak_db - 1e-9

    def test_full_scale_square_is_about_zero_dbtp(self):
        y = np.ones(1000)
        assert M.true_peak_dbtp(y, 44100) == pytest.approx(0.0, abs=0.5)

    def test_silence_is_negative_infinity(self):
        assert M.true_peak_dbtp(np.zeros(1000), 44100) == -np.inf

    def test_empty_signal_rejected(self):
        with pytest.raises(ValueError, match="empty"):
            M.true_peak_dbtp(np.array([]), 44100)

    def test_stereo_is_handled(self):
        y = np.column_stack([np.ones(500) * 0.5, np.ones(500) * 0.25])
        assert M.true_peak_dbtp(y, 44100) == pytest.approx(20 * np.log10(0.5), abs=0.5)


class TestIntersampleMargin:
    def test_margin_is_true_minus_sample_peak(self):
        m = measurement(true_peak_dbtp=-0.5, sample_peak_dbfs=-1.5)
        assert m.intersample_margin_db == pytest.approx(1.0)
