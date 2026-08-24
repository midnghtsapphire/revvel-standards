"""Tests for the repaint request builder.

These run without a GPU, checkpoints, or ACE-Step installed. `build_request` is
pure on purpose: every consistency guarantee the product makes lives there, so
it has to be cheap to test.
"""

from __future__ import annotations

import pytest

from repaint_core import (
    Conditioning,
    ConditioningMismatch,
    Edit,
    build_request,
)

LYRICS = "[verse]\nGot gravel in the shoe and a hole in the plan\n"
EDITED = "[verse]\nGot gravel in the boot and a hole in the plan\n"


def conditioning(**over) -> Conditioning:
    base = {"prompt": "roots rock, dry, baritone vocal", "audio_duration": 60.0,
            "seed": 42}
    return Conditioning(**{**base, **over})


def build(edit: Edit, cond: Conditioning | None = None) -> dict:
    return build_request(
        src_audio_path="base.wav",
        conditioning=cond or conditioning(),
        edit=edit,
        source_lyrics=LYRICS,
        save_path="out.wav",
    )


class TestTaskRouting:
    def test_absent_lyrics_is_artifact_removal(self):
        assert Edit(10.0, 11.0).task == "repaint"

    def test_present_lyrics_is_word_edit(self):
        assert Edit(10.0, 11.0, lyrics=EDITED).task == "edit"

    def test_repaint_carries_no_edit_targets(self):
        req = build(Edit(10.0, 11.0))
        assert req["task"] == "repaint"
        assert "edit_target_lyrics" not in req

    def test_edit_carries_target_lyrics_and_prompt(self):
        req = build(Edit(10.0, 11.0, lyrics=EDITED))
        assert req["task"] == "edit"
        assert req["edit_target_lyrics"] == EDITED
        assert req["edit_target_prompt"] == conditioning().prompt
        # Source sheet still travels as `lyrics`; the target is what changes.
        assert req["lyrics"] == LYRICS


class TestSpanWidening:
    """ACE-Step takes integer-second bounds. Rounding inward would leave part of
    the defect in the track, so spans must widen outward."""

    def test_start_floors_and_end_ceils(self):
        req = build(Edit(10.4, 11.2))
        assert req["repaint_start"] == 10
        assert req["repaint_end"] == 12

    def test_subsecond_span_never_collapses_to_zero_width(self):
        req = build(Edit(10.2, 10.4))
        assert req["repaint_end"] > req["repaint_start"]

    def test_exact_second_bounds_are_preserved(self):
        req = build(Edit(10.0, 12.0))
        assert (req["repaint_start"], req["repaint_end"]) == (10, 12)


class TestSeedPinning:
    """The product thesis: a repaired span must stay the same singer."""

    def test_manual_and_retake_seeds_both_pinned_to_render_seed(self):
        req = build(Edit(10.0, 11.0), conditioning(seed=1234))
        assert req["manual_seeds"] == [1234]
        assert req["retake_seeds"] == [1234], (
            "an unpinned retake seed lets ACE-Step draw a fresh one, which is "
            "exactly how the repaired word drifts off the source voice"
        )

    def test_seed_is_not_leaked_as_a_pipeline_kwarg(self):
        # ACEStepPipeline has no `seed` parameter; passing one would TypeError.
        assert "seed" not in build(Edit(10.0, 11.0))

    def test_conditioning_fields_are_forwarded(self):
        req = build(Edit(10.0, 11.0), conditioning(guidance_scale=9.5,
                                                   scheduler_type="heun"))
        assert req["guidance_scale"] == 9.5
        assert req["scheduler_type"] == "heun"


class TestValidation:
    def test_end_before_start_rejected(self):
        with pytest.raises(ValueError, match="greater than"):
            build(Edit(11.0, 10.0))

    def test_negative_start_rejected(self):
        with pytest.raises(ValueError, match=">= 0"):
            build(Edit(-1.0, 5.0))

    def test_span_past_end_of_song_rejected(self):
        with pytest.raises(ValueError, match="exceeds source duration"):
            build(Edit(55.0, 90.0))

    def test_inverted_diffusion_band_rejected(self):
        with pytest.raises(ValueError, match="n_min"):
            build(Edit(10.0, 11.0, lyrics=EDITED, n_min=0.9, n_max=0.2))


class TestConditioningDrift:
    def test_identical_conditioning_passes(self):
        conditioning().assert_matches(conditioning())

    def test_changed_prompt_is_a_hard_error(self):
        with pytest.raises(ConditioningMismatch, match="prompt"):
            conditioning().assert_matches(conditioning(prompt="techno"))

    def test_error_names_every_drifted_field(self):
        with pytest.raises(ConditioningMismatch) as exc:
            conditioning().assert_matches(
                conditioning(prompt="techno", guidance_scale=1.0)
            )
        assert "prompt" in str(exc.value)
        assert "guidance_scale" in str(exc.value)

    def test_seed_change_alone_is_not_conditioning_drift(self):
        # Seed is pinned separately per-edit; it is not part of the timbre
        # contract, so it must not trip the drift guard.
        conditioning(seed=1).assert_matches(conditioning(seed=2))

    def test_roundtrip_through_dict_preserves_equality(self):
        c = conditioning(guidance_scale=7.25)
        assert Conditioning.from_dict(c.to_dict()) == c

    def test_from_dict_ignores_unknown_keys(self):
        c = Conditioning.from_dict({**conditioning().to_dict(), "bogus": 1})
        assert c == conditioning()
