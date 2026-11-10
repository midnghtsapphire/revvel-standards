"""Tests for artifact injection, human labels, and scoring.

No GPU, no audio files -- injection runs on synthesized tone so the whole
labeling pipeline is verifiable in milliseconds.
"""

from __future__ import annotations

import numpy as np
import pytest

from repaint_core import artifacts as A

SR = 22050


def tone(seconds: float = 4.0, freq: float = 220.0) -> np.ndarray:
    t = np.arange(int(SR * seconds)) / SR
    return (0.3 * np.sin(2 * np.pi * freq * t)).astype(np.float64)


class TestDefectsChangeAudio:
    @pytest.mark.parametrize("fn", A.DEFECTS)
    def test_every_defect_modifies_the_signal(self, fn):
        y = tone()
        before = y.copy()
        fn(y, SR, 1.0)
        assert not np.allclose(y, before), f"{fn.__name__} left audio unchanged"

    @pytest.mark.parametrize("fn", A.DEFECTS)
    def test_every_defect_labels_itself_a_defect(self, fn):
        label = fn(tone(), SR, 1.0)
        assert label.is_defect
        assert label.end_s > label.start_s

    @pytest.mark.parametrize("fn", A.BENIGNS)
    def test_every_benign_labels_itself_benign(self, fn):
        label = fn(tone(), SR, 1.0)
        assert not label.is_defect

    def test_injection_past_end_is_rejected(self):
        with pytest.raises(ValueError, match="past end"):
            A.click(tone(seconds=1.0), SR, 5.0)


class TestSpecificDefects:
    def test_dropout_actually_silences(self):
        y = tone()
        A.dropout(y, SR, 1.0, dur_s=0.1)
        assert np.allclose(y[int(1.02 * SR):int(1.08 * SR)], 0.0)

    def test_feedback_tone_reports_its_band(self):
        label = A.feedback_tone(tone(), SR, 1.0, freq_hz=2600.0)
        assert label.band_hz is not None
        lo, hi = label.band_hz
        assert lo < 2600.0 < hi

    def test_click_is_a_single_sample(self):
        label = A.click(tone(), SR, 1.0)
        assert label.end_s - label.start_s == pytest.approx(1.0 / SR)

    def test_injection_is_deterministic_given_a_seed(self):
        a, b = tone(), tone()
        A.burst(a, SR, 1.0, rng=np.random.default_rng(7))
        A.burst(b, SR, 1.0, rng=np.random.default_rng(7))
        assert np.allclose(a, b)


class TestHumanNotes:
    def test_reads_minutes_and_seconds(self):
        (label,) = A.parse_notes("0:47 squeal")
        assert label.start_s == pytest.approx(47.0)
        assert label.name == "squeal"
        assert label.is_defect

    def test_reads_a_range(self):
        (label,) = A.parse_notes("1:12.5-1:13 stutter")
        assert label.start_s == pytest.approx(72.5)
        assert label.end_s == pytest.approx(73.0)

    def test_reads_bare_seconds(self):
        (label,) = A.parse_notes("95 dropout")
        assert label.start_s == pytest.approx(95.0)

    def test_a_point_becomes_an_audible_window(self):
        # People notice audible events, not single samples.
        (label,) = A.parse_notes("0:10 glitch")
        assert label.end_s > label.start_s

    def test_keep_words_mark_an_event_benign(self):
        (label,) = A.parse_notes("2:03 fuzz -- keep, on purpose")
        assert not label.is_defect, (
            "the same listening pass must be able to build the benign set, "
            "or the intentionality test has no negatives to measure against"
        )

    def test_blank_lines_and_comments_ignored(self):
        labels = A.parse_notes("# my notes\n\n0:05 click\n\n  \n0:09 burst\n")
        assert len(labels) == 2

    def test_unreadable_timestamp_names_the_line(self):
        with pytest.raises(ValueError, match="line 2"):
            A.parse_notes("0:05 fine\nbanana squeal")

    def test_backwards_range_is_rejected(self):
        with pytest.raises(ValueError, match="not after"):
            A.parse_notes("1:00-0:30 backwards")


class TestScoring:
    def labels(self):
        return [
            A.Label("squeal", "defect", 10.0, 11.0),
            A.Label("stutter", "defect", 20.0, 20.5),
            A.Label("fuzz", "benign", 30.0, 32.0),
        ]

    def test_perfect_detector(self):
        s = A.score_detections(self.labels(), [(10.0, 11.0), (20.0, 20.5)])
        assert s.recall == 1.0
        assert s.false_alarm_rate == 0.0
        assert s.spurious == 0

    def test_missed_defect_lowers_recall(self):
        s = A.score_detections(self.labels(), [(10.0, 11.0)])
        assert s.recall == pytest.approx(0.5)

    def test_flagging_intentional_fuzz_is_a_false_alarm(self):
        s = A.score_detections(self.labels(), [(10.0, 11.0), (20.0, 20.5), (30.5, 31.0)])
        assert s.recall == 1.0
        assert s.false_alarm_rate == 1.0, (
            "this is the number that decides whether the tool is usable on raw "
            "music -- perfect recall while sanding off the guitar tone is a fail"
        )

    def test_detection_matching_nothing_is_spurious(self):
        s = A.score_detections(self.labels(), [(50.0, 51.0)])
        assert s.spurious == 1
        assert s.recall == 0.0

    def test_flag_everything_does_not_score_clean(self):
        # The degenerate detector: one span over the whole track.
        s = A.score_detections(self.labels(), [(0.0, 60.0)])
        assert s.recall == 1.0
        assert s.false_alarm_rate == 1.0, "must be caught by the benign set"

    def test_summary_is_readable(self):
        s = A.score_detections(self.labels(), [(10.0, 11.0)])
        assert "recall=" in s.summary() and "false_alarm_rate=" in s.summary()
