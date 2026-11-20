"""Targeted regressions for the added review relay and publication ledger."""
import copy
from unittest.mock import patch
import audrey_bridge as bridge
from test_bridge import OfflineTestCase, REPO, PR_NUMBER, SOURCE_ID


class RelayAndLedgerTests(OfflineTestCase):
    def envelope(self):
        return {"event_name": "pull_request_review", "event": {
            "repository": {"full_name": REPO}, "action": "submitted",
            "pull_request": {"number": PR_NUMBER},
            "review": {"id": SOURCE_ID, "body": "FORGED ARTIFACT BODY", "user": {"login": "gitar-bot[bot]"}}
        }}

    def test_relay_refetches_authoritative_review_not_artifact_body(self):
        self.gh.pr["base"] = {"repo": {"full_name": REPO}}
        real_api = self.gh.api
        source = {"id": SOURCE_ID, "body": "Authoritative Gitar review.", "user": {"login": "gitar-bot[bot]"}}
        path = f"{self.gh.base}/pulls/{PR_NUMBER}/reviews/{SOURCE_ID}"
        def api(method, route, body=None):
            return copy.deepcopy(source) if method == "GET" and route == path else real_api(method, route, body)
        with patch.object(self.gh, "api", side_effect=api):
            self.bridge.relay(self.envelope())
        logs = [c[2]["body"] for c in self.gh.writes]
        self.assertTrue(any(bridge.inert("Authoritative Gitar review.") in text for text in logs))
        self.assertFalse(any("FORGED ARTIFACT BODY" in text for text in logs))
        self.network.assert_not_called()

    def test_forged_gitar_author_in_relay_artifact_is_ignored(self):
        self.gh.pr["base"] = {"repo": {"full_name": REPO}}
        real_api = self.gh.api
        path = f"{self.gh.base}/pulls/{PR_NUMBER}/reviews/{SOURCE_ID}"
        def api(method, route, body=None):
            if method == "GET" and route == path:
                return {"id": SOURCE_ID, "body": "Not Gitar", "user": {"login": "outsider"}}
            return real_api(method, route, body)
        with patch.object(self.gh, "api", side_effect=api):
            self.bridge.relay(self.envelope())
        self.assertEqual(self.gh.writes, [])

    def test_publication_key_ignores_only_draft_timestamp(self):
        draft, data = self.create_draft()
        changed = {**data, "created_at": "2099-01-01T00:00:00Z"}
        self.assertEqual(bridge.publication_key(data), bridge.publication_key(changed))
        self.assertNotEqual(bridge.digest(data), bridge.digest(changed))
        self.assertNotEqual(bridge.publication_key(data), bridge.publication_key({**data, "page_id": "67890"}))

    def test_changed_page_id_blocks_old_draft_and_allows_new_destination_draft(self):
        old, data = self.create_draft()
        with patch.dict("os.environ", {"FACEBOOK_PAGE_ID": "67890"}):
            with self.assertRaisesRegex(bridge.BridgeError, "numeric Page ID"):
                self.bridge.read_draft(old["id"])
            self.bridge.queue_summary(self.gh.pr, self.source)
        drafts = [row for row in self.gh.comment_by_id.values() if row["body"].startswith("### Facebook publication draft")]
        self.assertEqual(len(drafts), 2)
        self.network.assert_not_called()
