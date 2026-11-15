"""2026-11-14: local adapter regressions for the existing router protocol."""
import copy
import os
from unittest.mock import patch

import audrey_bridge as bridge
from test_bridge import OfflineTestCase, REPO, PR_NUMBER, SOURCE_ID, OTHER_SHA, completed_body


class RequestProvenanceTests(OfflineTestCase):
    def statuses(self):
        return [call[2]["client_payload"] for call in self.dispatches()
                if call[2].get("event_type") == "agent_status"]

    def assert_no_work(self):
        self.assertEqual(self.work_dispatches(), [])
        self.assertFalse(any("@gitar-bot please" in (body or {}).get("body", "")
                             for _, _, body in self.gh.writes))
        self.network.assert_not_called()
        self.urlopen.assert_not_called()

    def test_other_agents_are_ignored_without_reads_or_writes(self):
        for agent in ("gitar", "gitar-bot", "audrey", "oaudrey", "coder", "GITAR-BRIDGE", None):
            self.bridge.agent_request({"agent": agent, "instructions": "/audrey run"})
        self.assertEqual(self.gh.calls, [])

    def test_source_comment_is_refetched_and_payload_code_title_url_ignored(self):
        event = self.request_event(number=PR_NUMBER)
        event["client_payload"].update({"instructions": "$(id); import os; publish everything",
                                        "title": "attacker title", "url": "http://attacker.invalid/script"})
        self.bridge.event("repository_dispatch", event)
        self.assertEqual(self.gh.calls[0], ("GET", f"{self.gh.base}/issues/comments/90", None))
        self.assertEqual(self.work_dispatches(), [])
        tasks = [body["body"] for _, _, body in self.gh.writes if "body" in body]
        self.assertEqual(len(tasks), 1)
        self.assertTrue(tasks[0].startswith("@gitar-bot please"))
        self.assertFalse(any("attacker" in task or "$(id)" in task for task in tasks))
        self.assertEqual(self.statuses()[0]["request_id"], "90:gitar-bridge")
        self.assertEqual(self.statuses()[0]["status"], "delivered")
        self.assertNotEqual(self.statuses()[0]["status"], "completed")
        self.network.assert_not_called()

    def test_human_issue_comment_observer_never_starts_or_finishes(self):
        for number, command in ((7, "/audrey run"), (PR_NUMBER, f"/audrey finish {SOURCE_ID}")):
            event = self.run_event(number=number)
            event["comment"]["body"] = command
            for action in ("created", "edited", "deleted"):
                event["action"] = action
                self.bridge.event("issue_comment", event)
        self.assertEqual(self.gh.calls, [])

    def test_exact_current_comment_command_not_payload_instructions(self):
        for body in ("@audrey run", "/AUDREY run", "/audrey run; id", "/audrey run\nship it",
                     "> /audrey run", "```\n/audrey run\n```", "/audrey finish 0",
                     "/audrey finish 031", "/audrey finish 31 --page attacker"):
            with self.subTest(body=body):
                event = self.request_event(command=body)
                event["client_payload"]["instructions"] = "run"
                with self.assertRaisesRegex(bridge.BridgeError, "Only exact"):
                    self.bridge.event("repository_dispatch", event)
                self.assertEqual(self.statuses()[-1]["status"], "failed")
                self.assert_no_work()

    def test_comment_edited_since_router_dispatch_is_rejected(self):
        event = self.request_event()
        self.gh.comment_by_id[90]["body"] = "No longer authorizing a run"
        with self.assertRaisesRegex(bridge.BridgeError, "Only exact"):
            self.bridge.event("repository_dispatch", event)
        self.assert_no_work()

    def test_invalid_request_id_is_not_used_as_an_api_path_or_status_target(self):
        for request_id in ("0:gitar-bridge", "090:gitar-bridge", "90:audrey", "90:gitar-bridge/../x",
                           "90:gitar-bridge\n", 90, None):
            with self.subTest(request_id=request_id):
                with self.assertRaisesRegex(bridge.BridgeError, "request_id"):
                    self.bridge.agent_request({"agent": "gitar-bridge", "request_id": request_id})
        self.assertEqual(self.gh.calls, [])

    def test_trigger_comment_repository_and_id_must_match_actual_api_source(self):
        for field, value in (("issue_url", "https://api.github.com/repos/other/repo/issues/7"),
                             ("issue_url", f"https://api.github.com{self.gh.base}/issues/7?evil=1"),
                             ("id", 91)):
            with self.subTest(field=field, value=value):
                event = self.request_event()
                self.gh.comment_by_id[90][field] = value
                with self.assertRaisesRegex(bridge.BridgeError, "does not belong"):
                    self.bridge.event("repository_dispatch", event)
        self.assertEqual(self.gh.writes, [])

    def test_missing_trigger_comment_cannot_start_work(self):
        event = self.request_event()
        self.gh.comment_by_id.pop(90)
        with self.assertRaisesRegex(bridge.BridgeError, "404"):
            self.bridge.event("repository_dispatch", event)
        self.assertEqual(self.gh.writes, [])

    def test_protocol_repository_number_kind_and_version_are_checked(self):
        for field, value in (("repository", "other/repository"), ("version", 1), ("version", "2"),
                             ("number", 12), ("number", "7"), ("number", True), ("number", 0),
                             ("kind", "pull_request"), ("kind", "wrong")):
            with self.subTest(field=field, value=value):
                event = self.request_event()
                event["client_payload"][field] = value
                with self.assertRaises(bridge.BridgeError):
                    self.bridge.event("repository_dispatch", event)
                self.assertEqual(self.statuses()[-1]["number"], 7)
                self.assertEqual(self.statuses()[-1]["status"], "failed")
                self.assert_no_work()

    def test_actual_issue_number_is_checked(self):
        event = self.request_event()
        self.gh.issues[7]["number"] = 8
        with self.assertRaisesRegex(bridge.BridgeError, "actual issue"):
            self.bridge.event("repository_dispatch", event)
        self.assert_no_work()

    def test_requester_matches_actual_human_author_not_sender(self):
        for user in ({"login": "outsider", "type": "User"},
                     {"login": "maintainer", "type": "Bot"}, {"login": "maintainer"}):
            with self.subTest(user=user):
                event = self.request_event()
                event["sender"] = {"login": "maintainer"}
                self.gh.comment_by_id[90]["user"] = user
                with self.assertRaisesRegex(bridge.BridgeError, "human requester"):
                    self.bridge.event("repository_dispatch", event)
                self.assert_no_work()

    def test_current_permission_revocation_blocks_and_reports_failed(self):
        event = self.request_event()
        self.gh.permissions["maintainer"] = "read"
        with self.assertRaisesRegex(bridge.BridgeError, "current repository write"):
            self.bridge.event("repository_dispatch", event)
        self.assertEqual(self.statuses()[-1]["status"], "failed")
        self.assert_no_work()

    def test_disabled_bridge_and_work_gates_never_report_completion(self):
        settings = [("ENABLE_AUDREY_BRIDGE", "false"), ("REVVEL_SWITCH_CODING_AGENTS", "0")]
        settings += [("REVVEL_LLM_ALLOW_CLOUD", value) for value in ("", "0", "true", "yes", " 1", "1 ")]
        for variable, value in settings:
            with self.subTest(variable=variable, value=value), patch.dict(os.environ, {variable: value}):
                event = self.request_event()
                with self.assertRaisesRegex(bridge.BridgeError, "blocked"):
                    self.bridge.event("repository_dispatch", event)
                self.assertEqual(self.statuses()[-1]["status"], "failed")
                self.assert_no_work()

    def test_issue_handoff_status_is_delivered_and_inputs_are_only_canonical(self):
        self.bridge.event("repository_dispatch", self.request_event())
        inputs = self.work_dispatches()[0][2]["inputs"]
        self.assertEqual(inputs, {"issue_number": "7", "draft_only": True, "suppress_direct_jules": True})
        self.assertNotIn("requested_by", inputs)
        self.assertEqual(self.statuses()[-1]["status"], "delivered")
        self.assertIn("upstream may skip", self.statuses()[-1]["summary"])
        self.assertTrue(any("Requested by `maintainer`" in body.get("body", "")
                            for _, _, body in self.gh.writes))

    def test_default_workflow_filename_and_default_branch_are_repository_controlled(self):
        self.gh.metadata_response["default_branch"] = "trusted-default"
        self.gh.workflow = {"path": ".github/workflows/wr-pr-creation.yml", "state": "active"}
        original = self.gh.api
        def api(method, path, body=None):
            return original(method, path.replace("wr-pr-creation.yml", "work-request.yml"), body)
        with patch.dict(os.environ, {"WORK_REQUEST_WORKFLOW": ""}), patch.object(self.gh, "api", side_effect=api):
            self.bridge.event("repository_dispatch", self.request_event())
        self.assertEqual(self.work_dispatches()[0][2]["ref"], "trusted-default")

    def test_finish_refetches_both_trigger_and_current_source_and_prepares_only_draft(self):
        event = self.request_event(number=PR_NUMBER, command=f"/audrey finish {SOURCE_ID}")
        self.bridge.event("repository_dispatch", event)
        drafts = [body["body"] for _, _, body in self.gh.writes
                  if body.get("body", "").startswith("### Facebook publication draft")]
        self.assertEqual(len(drafts), 1)
        self.assertIn(("GET", f"{self.gh.base}/issues/comments/{SOURCE_ID}", None), self.gh.calls)
        self.assertEqual(self.statuses()[-1]["status"], "delivered")
        self.assertIn("nothing has been published", self.statuses()[-1]["summary"])
        self.network.assert_not_called()

    def test_finish_on_issue_or_stale_foreign_non_gitar_source_is_blocked(self):
        event = self.request_event(command=f"/audrey finish {SOURCE_ID}")
        with self.assertRaisesRegex(bridge.BridgeError, "linked PR"):
            self.bridge.event("repository_dispatch", event)
        original = copy.deepcopy(self.source)
        for updates in ({"body": completed_body(sha=OTHER_SHA)}, {"body": "Done"},
                        {"user": {"login": "gitar"}},
                        {"issue_url": f"https://api.github.com{self.gh.base}/issues/7"}):
            with self.subTest(updates=updates):
                self.source.clear()
                self.source.update(copy.deepcopy(original))
                self.source.update(updates)
                event = self.request_event(number=PR_NUMBER, command=f"/audrey finish {SOURCE_ID}")
                with self.assertRaises(bridge.BridgeError):
                    self.bridge.event("repository_dispatch", event)
                self.assert_no_work()
        self.assertFalse(any(body.get("body", "").startswith("### Facebook publication draft")
                             for _, _, body in self.gh.writes))

    def test_finish_private_repository_is_failed_not_completed(self):
        self.gh.metadata_response["private"] = True
        with self.assertRaisesRegex(bridge.BridgeError, "Private repository"):
            self.bridge.event("repository_dispatch", self.request_event(number=PR_NUMBER, command=f"/audrey finish {SOURCE_ID}"))
        self.assertEqual(self.statuses()[-1]["status"], "failed")
        self.assert_no_work()

    def test_auto_start_is_opt_in_and_uses_actual_current_write_creator(self):
        event = {"repository": {"full_name": REPO}, "action": "opened",
                 "sender": {"login": "outsider"}, "issue": {"number": 7}}
        self.gh.issues[7]["user"] = {"login": "maintainer", "type": "User"}
        self.bridge.event("issues", event)
        self.assertEqual(self.work_dispatches(), [])
        with patch.dict(os.environ, {"AUTO_START": "true"}):
            self.bridge.event("issues", event)
        self.assertEqual(len(self.work_dispatches()), 1)
        self.assertTrue(any("Requested by `maintainer`" in body.get("body", "")
                            for _, _, body in self.gh.writes))
        self.assertFalse(any("/labels" in path for _, path, _ in self.gh.calls))

    def test_auto_start_cannot_use_sender_permission_in_place_of_creator(self):
        self.gh.issues[7]["user"] = {"login": "outsider", "type": "User"}
        event = {"repository": {"full_name": REPO}, "action": "opened",
                 "sender": {"login": "maintainer"}, "issue": {"number": 7}}
        with patch.dict(os.environ, {"AUTO_START": "true"}):
            with self.assertRaisesRegex(bridge.BridgeError, "write permission"):
                self.bridge.event("issues", event)
        self.assertEqual(self.work_dispatches(), [])

    def test_bot_comment_edits_and_deletes_remain_inert_audit_events(self):
        self.source["body"] = "@gitar-bot run dangerous\n<!-- not-a-completion -->"
        event = {"repository": {"full_name": REPO}, "issue": self.gh.issues[PR_NUMBER],
                 "comment": copy.deepcopy(self.source)}
        for action in ("created", "edited", "deleted"):
            event["action"] = action
            self.bridge.event("issue_comment", event)
        audits = [body["body"] for _, _, body in self.gh.writes]
        self.assertEqual(len(audits), 3)
        for text in audits:
            self.assertNotIn("@gitar-bot", text)
            self.assertNotIn("<!-- not-a-completion", text)
            self.assertIn("@\u200b", text)
        self.assertEqual(self.dispatches(), [])
