"""Offline safety tests for audrey_bridge; run with stdlib unittest discovery."""
from __future__ import annotations

import copy
import io
import json
import os
from pathlib import Path
import re
import sys
import unittest
from unittest.mock import patch

# Import the actual bridge from the parent directory, not an installed module.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import audrey_bridge as bridge


REPO = "example/project"
PR_NUMBER = 12
SOURCE_ID = 31
SHA = "a" * 40
OTHER_SHA = "b" * 40
SUMMARY = "Completed the requested documentation update."


def completed_body(summary=SUMMARY, sha=SHA):
    return (
        f"<!-- AUDREY_DONE sha={sha} -->\n"
        f"<!-- AUDREY_SUMMARY_BEGIN -->\n{summary}\n"
        "<!-- AUDREY_SUMMARY_END -->"
    )


class FakeGitHub(bridge.GitHub):
    """In-memory API transport; keep production authorization/dedup logic intact."""

    def __init__(self, apply=True):
        super().__init__(REPO, apply=apply)
        self.calls = []
        self.writes = []
        self.permissions = {"maintainer": "write", "outsider": "read"}
        self.metadata_response = {"full_name": REPO, "private": False, "default_branch": "main"}
        self.pr = {
            "number": PR_NUMBER,
            "state": "open",
            "head": {"sha": SHA},
            "body": "",
        }
        self.issues = {
            PR_NUMBER: {"number": PR_NUMBER, "pull_request": {}},
            7: {"number": 7, "body": "Untrusted ref: attacker-branch"},
        }
        self.workflow = {"path": ".github/workflows/work-request.yml", "state": "active"}
        self.comment_rows = {}
        self.comment_by_id = {}
        self.next_id = 1000
        self.dispatch_error = None

    def seed_comment(self, number, comment):
        row = copy.deepcopy(comment)
        row.setdefault("issue_url", f"https://api.github.com{self.base}/issues/{number}")
        row.setdefault("html_url", f"https://github.com/{self.repo}/issues/{number}#issuecomment-{row['id']}")
        self.comment_by_id[row["id"]] = row
        self.comment_rows.setdefault(number, []).append(row)
        self._comments.pop(number, None)
        return row

    def api(self, method, path, body=None):
        self.calls.append((method, path, copy.deepcopy(body)))
        if method != "GET" and not self.apply:
            return super().api(method, path, body)
        route = path.split("?", 1)[0]
        if method == "GET":
            if route == self.base:
                return copy.deepcopy(self.metadata_response)
            match = re.fullmatch(re.escape(self.base) + r"/collaborators/([^/]+)/permission", route)
            if match:
                return {"permission": self.permissions.get(match.group(1), "none")}
            if route == f"{self.base}/pulls/{PR_NUMBER}":
                return copy.deepcopy(self.pr)
            match = re.fullmatch(re.escape(self.base) + r"/issues/([0-9]+)", route)
            if match:
                return copy.deepcopy(self.issues[int(match.group(1))])
            match = re.fullmatch(re.escape(self.base) + r"/issues/comments/([0-9]+)", route)
            if match:
                if int(match.group(1)) not in self.comment_by_id:
                    raise bridge.BridgeError("API request failed: HTTP 404")
                return copy.deepcopy(self.comment_by_id[int(match.group(1))])
            match = re.fullmatch(re.escape(self.base) + r"/issues/([0-9]+)/comments", route)
            if match:
                return copy.deepcopy(self.comment_rows.get(int(match.group(1)), []))
            if route == f"{self.base}/actions/workflows/work-request.yml":
                return copy.deepcopy(self.workflow)
        if method == "POST":
            match = re.fullmatch(re.escape(self.base) + r"/issues/([0-9]+)/comments", route)
            if match:
                row = self.seed_comment(int(match.group(1)), {
                    "id": self.next_id, "body": body["body"], "user": {"login": "bridge[bot]"},
                })
                self.next_id += 1
                self.writes.append((method, path, copy.deepcopy(body)))
                return copy.deepcopy(row)
            if route in {
                f"{self.base}/actions/workflows/work-request.yml/dispatches",
                f"{self.base}/dispatches",
            }:
                self.writes.append((method, path, copy.deepcopy(body)))
                if self.dispatch_error:
                    raise self.dispatch_error
                return None
        raise AssertionError(f"Unexpected fake API request: {method} {path}")


class OfflineTestCase(unittest.TestCase):
    def setUp(self):
        self.env = self.enterContext(patch.dict(os.environ, {
            "GITHUB_TOKEN": "fake-github-token-not-a-credential",
            "BRIDGE_SIGNING_KEY": "test-only-signing-key-" + "x" * 32,
            "WORK_REQUEST_WORKFLOW": "work-request.yml",
            "FACEBOOK_PAGE_ID": "12345",
            "APPROVED_FACEBOOK_PAGE_ID": "12345",
            "FACEBOOK_GRAPH_VERSION": "v99.0",
            "FACEBOOK_PAGE_ACCESS_TOKEN": "fake-page-token-not-a-credential",
            "FACEBOOK_PUBLISH_ENABLED": "true",
            "ENABLE_AUDREY_BRIDGE": "true",
            "REVVEL_LLM_ALLOW_CLOUD": "1",
            "REVVEL_SWITCH_CODING_AGENTS": "1",
        }, clear=True))
        self.network = self.enterContext(patch.object(
            bridge.NoRedirect, "request", side_effect=AssertionError("External API access forbidden")
        ))
        self.urlopen = self.enterContext(patch.object(
            bridge, "urlopen", side_effect=AssertionError("Network access forbidden")
        ))
        self.enterContext(patch("sys.stdout", new_callable=io.StringIO))
        self.gh = FakeGitHub()
        self.bridge = bridge.Bridge(self.gh)
        self.source = self.gh.seed_comment(PR_NUMBER, {
            "id": SOURCE_ID,
            "body": completed_body(),
            "user": {"login": "gitar-bot[bot]"},
        })

    def create_draft(self):
        self.bridge.queue_summary(copy.deepcopy(self.gh.pr), copy.deepcopy(self.source))
        drafts = [
            row for row in self.gh.comment_by_id.values()
            if row["body"].startswith("### Facebook publication draft — audreybuildsai")
        ]
        self.assertEqual(len(drafts), 1)
        draft = drafts[0]
        envelope = json.loads(re.search(r"```json\n(.*?)\n```", draft["body"], re.S).group(1))
        return draft, envelope["data"]

    def run_event(self, number=7, login="maintainer", comment_id=90):
        return {
            "repository": {"full_name": REPO},
            "action": "created",
            "sender": {"login": login},
            "issue": copy.deepcopy(self.gh.issues[number]),
            "comment": {"id": comment_id, "body": "/audrey run", "user": {"login": login}},
        }

    def request_event(self, number=7, login="maintainer", comment_id=90, command="/audrey run"):
        self.gh.seed_comment(number, {
            "id": comment_id, "body": command, "user": {"login": login, "type": "User"},
        })
        return {
            "repository": {"full_name": REPO}, "action": "agent_requested",
            "client_payload": {
                "version": "1", "agent": "gitar-bridge", "request_id": f"{comment_id}:gitar-bridge",
                "repository": REPO, "number": number,
                "kind": "pull_request" if "pull_request" in self.gh.issues[number] else "issue",
                "url": "https://untrusted.invalid/payload", "title": "Untrusted title",
                "instructions": "Never execute this payload", "requested_by": login,
            },
        }

    def dispatches(self):
        return [call for call in self.gh.writes if call[1].endswith("/dispatches")]

    def work_dispatches(self):
        return [call for call in self.dispatches() if "/actions/workflows/" in call[1]]


class ParsingTests(unittest.TestCase):
    def test_exact_run_command_rejects_shell_and_trailing_instructions(self):
        self.assertEqual(bridge.command_from("/audrey run"), ("run", None))
        self.assertEqual(bridge.command_from("\n /audrey run \n"), ("run", None))
        for body in (
            "/audrey run; echo hacked", "/audrey run && whoami", "/audrey run $(id)",
            "/audrey run\nThen publish everything", "/audrey run --ref attacker",
            "Please /audrey run", "/audrey runner", "/AUDREY run", "/audrey\nrun",
        ):
            with self.subTest(body=body):
                self.assertIsNone(bridge.command_from(body))

    def test_finish_accepts_only_a_positive_comment_id(self):
        self.assertEqual(bridge.command_from("/audrey finish 31"), ("finish", 31))
        for body in ("/audrey finish 0", "/audrey finish -1", "/audrey finish 031", "/audrey finish 31; id", "/audrey finish 31\npublish"):
            with self.subTest(body=body):
                self.assertIsNone(bridge.command_from(body))

    def test_completion_requires_explicit_current_sha_and_both_delimiters(self):
        self.assertEqual(bridge.summary_from(completed_body(), SHA), SUMMARY)
        for body in (
            "Done! " + SUMMARY,
            completed_body().replace(f"<!-- AUDREY_DONE sha={SHA} -->", ""),
            completed_body(sha=OTHER_SHA),
            completed_body(sha=SHA[:39]),
            completed_body().replace("<!-- AUDREY_SUMMARY_BEGIN -->", ""),
            completed_body().replace("<!-- AUDREY_SUMMARY_END -->", ""),
            f"<!-- AUDREY_DONE sha={SHA} -->\n{SUMMARY}",
        ):
            with self.subTest(body=body):
                self.assertIsNone(bridge.summary_from(body, SHA))

    def test_secret_looking_summaries_are_blocked(self):
        for secret in (
            "ghp_" + "A" * 30, "github_pat_" + "B" * 30, "xoxb-fake-token-value",
            "-----BEGIN RSA PRIVATE KEY-----", "EAA" + "C" * 40,
        ):
            with self.subTest(secret_type=secret[:8]):
                with self.assertRaisesRegex(bridge.BridgeError, "credential"):
                    bridge.summary_from(completed_body("Completed. " + secret), SHA)

    def test_work_request_links_are_same_repo_and_not_every_number(self):
        body = (
            "Work request: #7\nFixes #8\nCloses #8\nResolved #9\n"
            "Unrelated #99; fixes other/repository#20; closes https://github.com/other/repository/issues/21\n"
            "work request: #0\n"
        )
        self.assertEqual(bridge.linked_issues(body), [7, 8, 9])


class BridgeSafetyTests(OfflineTestCase):
    def test_bot_identity_uses_exact_configured_logins_not_ordinary_names(self):
        for login in ("gitar-bot[bot]", "gitar-bot", "GITAR-BOT[BOT]"):
            with self.subTest(login=login):
                self.assertTrue(self.bridge.is_gitar({"login": login}))
        for user in (
            {"login": "gitar"}, {"login": "some-gitar-bot"}, {"login": "gitar-bot-helper"},
            {"login": "ordinary-user", "name": "Gitar Bot"}, {"name": "gitar-bot[bot]"},
        ):
            with self.subTest(user=user):
                self.assertFalse(self.bridge.is_gitar(user))

    def test_unauthorized_collaborator_cannot_dispatch_or_write(self):
        with self.assertRaisesRegex(bridge.BridgeError, "write permission"):
            self.bridge.start(7, "outsider", "unauthorized-test")
        self.assertEqual(self.gh.writes, [])
        self.assertEqual(self.gh.calls, [
            ("GET", f"{self.gh.base}/collaborators/outsider/permission", None)
        ])
        self.network.assert_not_called()

    def test_issue_routes_only_to_approved_filename_trusted_ref_and_inputs(self):
        self.bridge.event("repository_dispatch", self.request_event())
        self.assertEqual(self.work_dispatches(), [(
            "POST", f"{self.gh.base}/actions/workflows/work-request.yml/dispatches",
            {"ref": "main", "inputs": {"issue_number": "7", "draft_only": True, "suppress_direct_jules": True}},
        )])
        paths = [path for method, path, body in self.gh.calls if method == "GET"]
        self.assertIn(f"{self.gh.base}/actions/workflows/work-request.yml", paths)
        pending_index = next(i for i, call in enumerate(self.gh.writes) if "dispatch pending" in (call[2] or {}).get("body", ""))
        dispatch_index = next(i for i, call in enumerate(self.gh.writes) if call[1].endswith("/dispatches"))
        self.assertLess(pending_index, dispatch_index)
        self.network.assert_not_called()

    def test_issue_rejects_unapproved_workflow_filenames(self):
        for filename in ("../evil.yml", ".github/workflows/evil.yml", "work-request.yml;id", "work-request.yml?ref=evil"):
            with self.subTest(filename=filename), patch.dict(os.environ, {"WORK_REQUEST_WORKFLOW": filename}):
                with self.assertRaisesRegex(bridge.BridgeError, "approved workflow filename"):
                    self.bridge.start(7, "maintainer", "filename-test")
        self.assertEqual(self.gh.writes, [])

    def test_issue_rejects_mismatched_or_inactive_workflow_metadata(self):
        for workflow in (
            {"path": ".github/workflows/other.yml", "state": "active"},
            {"path": ".github/workflows/work-request.yml", "state": "disabled_manually"},
        ):
            with self.subTest(workflow=workflow):
                self.gh.workflow = workflow
                with self.assertRaisesRegex(bridge.BridgeError, "absent or inactive"):
                    self.bridge.start(7, "maintainer", "metadata-test")
        self.assertEqual(self.gh.writes, [])

    def test_repeated_run_event_dispatches_only_once(self):
        event = self.request_event()
        self.bridge.event("repository_dispatch", event)
        write_count = len(self.gh.writes)
        # A fresh instance/cache simulates a later workflow invocation.
        self.gh._comments.clear()
        bridge.Bridge(self.gh).event("repository_dispatch", event)
        self.assertEqual(len(self.work_dispatches()), 1)
        # One repeated agent_status update is allowed, never a repeated start.
        self.assertEqual(len(self.gh.writes), write_count + 1)

    def test_pending_issue_dispatch_is_not_replayed_after_uncertain_failure(self):
        self.gh.dispatch_error = bridge.BridgeError("API result uncertain")
        event = self.request_event()
        with self.assertRaisesRegex(bridge.BridgeError, "uncertain"):
            self.bridge.event("repository_dispatch", event)
        self.gh.dispatch_error = None
        self.gh._comments.clear()
        with self.assertRaisesRegex(bridge.BridgeError, "already pending"):
            bridge.Bridge(self.gh).event("repository_dispatch", event)
        self.assertEqual(len(self.work_dispatches()), 1)

    def test_signed_draft_reads_and_revalidates_real_source_metadata(self):
        draft, expected = self.create_draft()
        with patch.object(self.bridge, "validate_source", wraps=self.bridge.validate_source) as validate:
            data, comment = self.bridge.read_draft(draft["id"])
        validate.assert_called_once_with(expected)
        self.assertEqual(data, expected)
        self.assertEqual(comment["issue_url"], f"https://api.github.com{self.gh.base}/issues/{PR_NUMBER}")
        self.assertEqual(data["message"], SUMMARY)
        self.assertEqual(data["page_id"], "12345")
        self.assertIn(("GET", f"{self.gh.base}/pulls/{PR_NUMBER}", None), self.gh.calls)
        self.assertIn(("GET", f"{self.gh.base}/issues/comments/{SOURCE_ID}", None), self.gh.calls)

    def test_draft_hmac_tampering_blocks_publication_before_source_validation(self):
        draft, data = self.create_draft()
        draft["body"] = draft["body"].replace(SUMMARY, "Tampered publication text")
        with patch.object(self.bridge, "validate_source", wraps=self.bridge.validate_source) as validate:
            with self.assertRaisesRegex(bridge.BridgeError, "signature does not match"):
                self.bridge.publish(draft["id"], bridge.digest(data))
        validate.assert_not_called()
        self.network.assert_not_called()

    def test_private_repository_blocks_draft_creation_and_existing_draft_publication(self):
        self.gh.metadata_response["private"] = True
        self.bridge.queue_summary(self.gh.pr, self.source)
        self.assertEqual(self.gh.writes, [])
        self.gh.metadata_response["private"] = False
        self.bridge.metadata = None
        draft, data = self.create_draft()
        self.gh.metadata_response["private"] = True
        self.bridge.metadata = None
        with self.assertRaisesRegex(bridge.BridgeError, "Private repository"):
            self.bridge.publish(draft["id"], bridge.digest(data))
        self.network.assert_not_called()

    def test_stale_head_blocks_publication(self):
        draft, data = self.create_draft()
        self.gh.pr["head"]["sha"] = OTHER_SHA
        with self.assertRaisesRegex(bridge.BridgeError, "Draft is stale"):
            self.bridge.publish(draft["id"], bridge.digest(data))
        self.network.assert_not_called()

    def test_changed_source_body_blocks_publication(self):
        draft, data = self.create_draft()
        self.source["body"] = completed_body("Edited after draft preparation.")
        with self.assertRaisesRegex(bridge.BridgeError, "summary changed"):
            self.bridge.publish(draft["id"], bridge.digest(data))
        self.network.assert_not_called()

    def test_source_must_still_be_exact_bot_comment_on_source_pr(self):
        draft, data = self.create_draft()
        original = copy.deepcopy(self.source)
        for field, value in (
            ("user", {"login": "ordinary-user", "name": "Gitar Bot"}),
            ("issue_url", f"https://api.github.com{self.gh.base}/issues/999"),
        ):
            with self.subTest(field=field):
                self.source.clear()
                self.source.update(copy.deepcopy(original))
                self.source[field] = value
                with self.assertRaisesRegex(bridge.BridgeError, "not a Gitar comment on the source PR"):
                    self.bridge.publish(draft["id"], bridge.digest(data))
        self.network.assert_not_called()

    def test_repeated_bot_event_deduplicates_audit_draft_and_publication_queue(self):
        event = {
            "repository": {"full_name": REPO}, "action": "created",
            "sender": {"login": "gitar-bot[bot]"},
            "issue": copy.deepcopy(self.gh.issues[PR_NUMBER]),
            "comment": copy.deepcopy(self.source),
        }
        with patch.dict(os.environ, {"QUEUE_FACEBOOK_PUBLICATION": "true"}):
            self.bridge.event("issue_comment", event)
            writes = copy.deepcopy(self.gh.writes)
            self.gh._comments.clear()
            bridge.Bridge(self.gh).event("issue_comment", event)
        self.assertEqual(self.gh.writes, writes)
        self.assertEqual(len(self.dispatches()), 1)
        self.assertEqual(self.dispatches()[0][2]["event_type"], "audrey-publication-ready")
        comments = [row["body"] for row in self.gh.comment_rows[PR_NUMBER]]
        self.assertEqual(sum(body.startswith("### Gitar activity record") for body in comments), 1)
        self.assertEqual(sum(body.startswith("### Facebook publication draft") for body in comments), 1)

    def test_pending_publication_blocks_all_page_requests(self):
        draft, data = self.create_draft()
        key = bridge.publication_key(data)
        self.gh.comment_once(PR_NUMBER, key + ":pending", "Publication outcome uncertain; inspect manually.")
        self.gh._comments.clear()
        with self.assertRaisesRegex(bridge.BridgeError, "already pending or sent"):
            bridge.Bridge(self.gh).publish(draft["id"], bridge.digest(data))
        self.network.assert_not_called()

    def test_uncertain_page_write_leaves_pending_marker_and_cannot_be_retried(self):
        draft, data = self.create_draft()
        graph = "https://graph.facebook.com/v99.0/12345"
        headers = {"Authorization": "Bearer fake-page-token-not-a-credential", "Content-Type": "application/x-www-form-urlencoded"}
        with patch.object(bridge.NoRedirect, "request", side_effect=[
            {"id": "12345", "name": "Test Page"}, bridge.BridgeError("API result uncertain"),
        ]) as fake_page:
            with self.assertRaisesRegex(bridge.BridgeError, "uncertain"):
                self.bridge.publish(draft["id"], bridge.digest(data))
            self.assertEqual(fake_page.call_args_list, [
                unittest.mock.call(graph + "?fields=id,name", "GET", headers),
                unittest.mock.call(graph + "/feed", "POST", headers, {"message": SUMMARY}),
            ])
            self.gh._comments.clear()
            with self.assertRaisesRegex(bridge.BridgeError, "already pending or sent"):
                bridge.Bridge(self.gh).publish(draft["id"], bridge.digest(data))
            self.assertEqual(fake_page.call_count, 2)
        self.urlopen.assert_not_called()

    def test_dry_run_prevents_page_requests_and_publication_marker_writes(self):
        draft, data = self.create_draft()
        self.gh.apply = False
        writes_before = copy.deepcopy(self.gh.writes)
        self.bridge.publish(draft["id"], bridge.digest(data))
        self.assertEqual(self.gh.writes, writes_before)
        self.network.assert_not_called()
        self.urlopen.assert_not_called()
        self.assertIn("DRY RUN: Facebook publication suppressed", sys.stdout.getvalue())


if __name__ == "__main__":
    unittest.main()
