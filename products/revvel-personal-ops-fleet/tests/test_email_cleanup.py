from __future__ import annotations

from datetime import datetime, timezone

from revvel_ops.models import Permission
from revvel_ops.skills import email_cleanup

NOW = datetime(2026, 8, 3, 12, 0, tzinfo=timezone.utc)
IDENT = "angelreporters@gmail.com"


def test_fixture_loads(fixture_path):
    messages = email_cleanup.load_fixture(fixture_path)
    assert len(messages) == 10


def test_categories_cover_expected_classes(fixture_path):
    counts = email_cleanup.category_counts(email_cleanup.load_fixture(fixture_path))
    assert counts.get("security") == 1
    assert counts.get("receipt") == 1
    assert counts.get("newsletter", 0) >= 2
    assert counts.get("personal") == 1


def test_every_message_gets_a_label_proposal(fixture_path):
    messages = email_cleanup.load_fixture(fixture_path)
    props = email_cleanup.build_proposals(messages, identity=IDENT, now=NOW)
    labels = [p for p in props if p.capability == "gmail.labels.apply"]
    assert len(labels) == len(messages)
    assert all(p.reversibility.value == "reversible" and p.rollback_ref for p in labels)


def test_all_four_action_types_present(fixture_path):
    props = email_cleanup.build_proposals(email_cleanup.load_fixture(fixture_path), identity=IDENT, now=NOW)
    caps = {p.capability for p in props}
    assert {
        "gmail.labels.apply",
        "gmail.threads.archive",
        "gmail.subscriptions.unsubscribe",
        "gmail.threads.trash",
    } <= caps


def test_security_and_personal_are_never_archived_or_trashed(fixture_path):
    props = email_cleanup.build_proposals(email_cleanup.load_fixture(fixture_path), identity=IDENT, now=NOW)
    mutating = [p for p in props if p.capability in {"gmail.threads.archive", "gmail.threads.trash"}]
    assert all("security" not in p.tags and "personal" not in p.tags and "receipt" not in p.tags for p in mutating)


def test_delete_proposals_are_trash_only(fixture_path):
    props = email_cleanup.build_proposals(email_cleanup.load_fixture(fixture_path), identity=IDENT, now=NOW)
    for p in props:
        if p.permission is Permission.delete:
            assert p.parameters["destination"] == "TRASH"
            assert p.parameters["permanent_delete"] is False
            assert p.rollback_ref


def test_unsubscribe_is_externally_visible_and_never_auto(fixture_path):
    props = email_cleanup.build_proposals(email_cleanup.load_fixture(fixture_path), identity=IDENT, now=NOW)
    unsubs = [p for p in props if p.permission is Permission.unsubscribe]
    assert unsubs
    for p in unsubs:
        assert p.externally_visible is True
        assert p.parameters["dispatch"] == "never_automatic"


def test_every_proposal_carries_evidence(fixture_path):
    props = email_cleanup.build_proposals(email_cleanup.load_fixture(fixture_path), identity=IDENT, now=NOW)
    assert all(p.evidence for p in props)
    assert all(all(len(e.digest) == 64 for e in p.evidence) for p in props)


def test_categorization_is_deterministic(fixture_path):
    messages = email_cleanup.load_fixture(fixture_path)
    first = [email_cleanup.categorize(m)[0] for m in messages]
    second = [email_cleanup.categorize(m)[0] for m in messages]
    assert first == second
