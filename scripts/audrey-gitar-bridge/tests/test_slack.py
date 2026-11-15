"""2026-11-13: offline Slack HTTPS, redirect refusal, and no-replay regressions."""
import io
import json
import os
import sys
from unittest.mock import Mock, patch

from test_bridge import OfflineTestCase, PR_NUMBER
import audrey_bridge as bridge


WEBHOOK = "https://hooks.slack.com/services/TEST/ONLY/fake-webhook-secret"
MESSAGE = "fake-notification-body-must-not-leak"
REDIRECT = "http://redirect.invalid/services/fake-redirect-secret"
WARNING = "Slack notification unconfirmed. Inspect the channel; no automatic retry.\n"


class SlackTransportTests(OfflineTestCase):
    def setUp(self):
        super().setUp()
        # Both production network entry points are blocked before each test.
        # Individual cases install only an in-memory opener, never a live socket.
        self.build = self.enterContext(patch.object(
            bridge, "build_opener", side_effect=AssertionError("Network access forbidden")
        ))
        self.stderr = self.enterContext(patch("sys.stderr", new_callable=io.StringIO))
        self.opener = Mock()
        self.forwarded = Mock(side_effect=AssertionError("Redirect forwarding forbidden"))
        self.handlers = []

    def configure_notification(self, mode="ok", body=b"ok"):
        os.environ["SLACK_WEBHOOK_URL"] = WEBHOOK

        def build(handler):
            self.assertIsInstance(handler, bridge.RejectRedirect)
            self.handlers.append(handler)
            handler.parent = Mock(open=self.forwarded)
            if mode == "redirect":
                # Exercise the real stdlib redirect response path and the real
                # RejectRedirect override, but mock the initial opener/transport.
                def redirect(req, timeout):
                    self.assertEqual(timeout, 30)
                    return handler.http_error_302(
                        req, io.BytesIO(b"fake-redirect-response-body"), 302,
                        # 2026-11-13: inactive fixture; plain dicts are case-sensitive.
                        # "Found", {"Location": REDIRECT},
                        "Found", {"location": REDIRECT},
                    )
                self.opener.open.side_effect = redirect
            else:
                self.opener.open.return_value = io.BytesIO(body)
            return self.opener

        self.build.side_effect = build

    def assert_fixed_failure(self):
        self.assertEqual(self.stderr.getvalue(), WARNING)
        for sensitive in (WEBHOOK, REDIRECT, "fake-webhook-secret",
                          "fake-redirect-secret", MESSAGE, "fake-redirect-response-body"):
            self.assertNotIn(sensitive, self.stderr.getvalue())
            self.assertNotIn(sensitive, sys.stdout.getvalue())
        self.forwarded.assert_not_called()
        self.urlopen.assert_not_called()

    def test_http_webhook_is_rejected_before_request_creation(self):
        os.environ["SLACK_WEBHOOK_URL"] = WEBHOOK.replace("https:", "http:")
        with patch.object(bridge, "Request") as request:
            with self.assertRaises(bridge.BridgeError) as caught:
                self.bridge.notify_slack(MESSAGE)
        self.assertEqual(str(caught.exception), "Use an authorized Slack incoming webhook URL.")
        request.assert_not_called()
        self.build.assert_not_called()
        self.urlopen.assert_not_called()
        self.assertEqual(self.stderr.getvalue(), "")

    def test_exact_allowed_origins_and_services_path_remain_required(self):
        urls = (
            "ftp://hooks.slack.com/services/TEST/ONLY/fake-webhook-secret",
            "https://hooks.slack.com.evil.invalid/services/TEST/ONLY/fake-webhook-secret",
            "https://user:fake-password@hooks.slack.com/services/TEST/ONLY/fake-webhook-secret",
            "https://hooks.slack.com:443/services/TEST/ONLY/fake-webhook-secret",
            "https://hooks.slack.com/services",
            "https://hooks.slack-gov.com/other/TEST/ONLY/fake-webhook-secret",
            "//hooks.slack.com/services/TEST/ONLY/fake-webhook-secret",
        )
        with patch.object(bridge, "Request") as request:
            for url in urls:
                with self.subTest(url_kind=urls.index(url)):
                    os.environ["SLACK_WEBHOOK_URL"] = url
                    with self.assertRaises(bridge.BridgeError) as caught:
                        self.bridge.notify_slack(MESSAGE)
                    self.assertEqual(str(caught.exception), "Use an authorized Slack incoming webhook URL.")
        request.assert_not_called()
        self.build.assert_not_called()
        self.urlopen.assert_not_called()

    def test_both_https_origins_use_reject_redirect_post_and_exact_ok(self):
        for host in ("hooks.slack.com", "hooks.slack-gov.com"):
            with self.subTest(host=host):
                self.configure_notification()
                os.environ["SLACK_WEBHOOK_URL"] = WEBHOOK.replace("hooks.slack.com", host)
                self.opener.open.reset_mock()
                self.bridge.notify_slack(MESSAGE)
                self.opener.open.assert_called_once()
                req = self.opener.open.call_args.args[0]
                self.assertEqual(req.full_url, os.environ["SLACK_WEBHOOK_URL"])
                self.assertEqual(req.get_method(), "POST")
                self.assertEqual(req.get_header("Content-type"), "application/json")
                self.assertEqual(json.loads(req.data), {"text": MESSAGE})
                self.assertEqual(self.opener.open.call_args.kwargs, {"timeout": 30})
        self.assertEqual(len(self.handlers), 2)
        self.assertEqual(self.stderr.getvalue(), "")
        self.urlopen.assert_not_called()

    def test_dry_run_never_creates_request_or_opener(self):
        os.environ["SLACK_WEBHOOK_URL"] = WEBHOOK
        self.gh.apply = False
        with patch.object(bridge, "Request") as request:
            self.bridge.notify_slack(MESSAGE)
        request.assert_not_called()
        self.build.assert_not_called()
        self.urlopen.assert_not_called()
        self.assertEqual(sys.stdout.getvalue(), "DRY RUN: Slack notification suppressed.\n")
        self.assertEqual(self.stderr.getvalue(), "")

    def test_unconfigured_slack_never_creates_request_or_opener(self):
        with patch.object(bridge, "Request") as request:
            self.bridge.notify_slack(MESSAGE)
        request.assert_not_called()
        self.build.assert_not_called()
        self.urlopen.assert_not_called()
        self.assertEqual(self.stderr.getvalue(), "")

    def test_wrong_response_is_fixed_warning_without_url_body_or_retry(self):
        for body in (b"", b"OK", b"ok\n", b" ok ", (WEBHOOK + MESSAGE).encode()):
            with self.subTest(response_kind=len(body)):
                self.configure_notification(body=body)
                self.opener.open.reset_mock()
                self.stderr.seek(0)
                self.stderr.truncate(0)
                self.assertIsNone(self.bridge.notify_slack(MESSAGE))
                self.opener.open.assert_called_once()
                self.assert_fixed_failure()

    def test_transport_uncertainty_is_fixed_warning_without_url_or_retry(self):
        errors = (
            bridge.HTTPError(WEBHOOK, 500, MESSAGE, {}, io.BytesIO(MESSAGE.encode())),
            bridge.URLError(WEBHOOK + MESSAGE),
            TimeoutError(WEBHOOK + MESSAGE),
        )
        for error in errors:
            with self.subTest(error_type=type(error).__name__):
                self.configure_notification()
                self.opener.open.side_effect = error
                self.opener.open.reset_mock()
                self.stderr.seek(0)
                self.stderr.truncate(0)
                self.assertIsNone(self.bridge.notify_slack(MESSAGE))
                self.opener.open.assert_called_once()
                self.assert_fixed_failure()

    def test_redirect_response_uses_real_reject_handler_and_never_forwards(self):
        self.configure_notification(mode="redirect")
        self.assertIsNone(self.bridge.notify_slack(MESSAGE))
        self.opener.open.assert_called_once()
        self.assertEqual(len(self.handlers), 1)
        self.assert_fixed_failure()

    def test_reject_handler_refuses_all_redirect_codes_before_new_request(self):
        handler = bridge.RejectRedirect()
        handler.parent = Mock(open=self.forwarded)
        req = bridge.Request(WEBHOOK, data=json.dumps({"text": MESSAGE}).encode(), method="POST")
        for code in (301, 302, 303, 307, 308):
            for destination in (REDIRECT, WEBHOOK + "/changed", "https://hooks.slack-gov.com/services/fake-secret"):
                with self.subTest(code=code, destination_kind=len(destination)):
                    with self.assertRaises(bridge.BridgeError) as caught:
                        # 2026-11-13: inactive uppercase plain-dict fixture retained.
                        # handler.http_error_302(req, io.BytesIO(b"fake-response"), code,
                        #                        "Redirect", {"Location": destination})
                        handler.http_error_302(req, io.BytesIO(b"fake-response"), code,
                                               "Redirect", {"location": destination})
                    self.assertEqual(str(caught.exception),
                                     "API redirects are refused before credentials are forwarded.")
        self.forwarded.assert_not_called()
        self.urlopen.assert_not_called()
        self.build.assert_not_called()

    def check_dispatch_notification_failure(self, mode):
        self.configure_notification(mode=mode, body=(WEBHOOK + MESSAGE).encode())
        event = self.request_event()
        self.bridge.event("repository_dispatch", event)
        statuses = [call[2]["client_payload"] for call in self.dispatches()
                    if call[2].get("event_type") == "agent_status"]
        self.assertEqual([status["status"] for status in statuses], ["delivered"])
        self.assertEqual(len(self.work_dispatches()), 1)
        self.opener.open.assert_called_once()
        self.assert_fixed_failure()
        # A later invocation must not repeat the accepted work or Slack attempt.
        self.gh._comments.clear()
        bridge.Bridge(self.gh).event("repository_dispatch", event)
        self.assertEqual(len(self.work_dispatches()), 1)
        self.opener.open.assert_called_once()
        self.assert_fixed_failure()
        self.network.assert_not_called()

    def test_wrong_slack_response_does_not_abort_or_replay_accepted_dispatch(self):
        self.check_dispatch_notification_failure("wrong-response")

    def test_slack_redirect_does_not_abort_or_replay_accepted_dispatch(self):
        self.check_dispatch_notification_failure("redirect")

    def check_publication_notification_failure(self, mode):
        draft, data = self.create_draft()
        self.configure_notification(mode=mode, body=(WEBHOOK + MESSAGE).encode())
        with patch.object(bridge.NoRedirect, "request", side_effect=[
            {"id": "12345", "name": "Offline Page"}, {"id": "12345_offline_post"},
        ]) as page:
            self.assertIsNone(self.bridge.publish(draft["id"], bridge.digest(data)))
            self.assertEqual(page.call_count, 2)
            self.assertEqual([call.args[1] for call in page.call_args_list], ["GET", "POST"])
            receipts = [row["body"] for row in self.gh.comment_rows[PR_NUMBER]
                        if "Facebook Page publication confirmed." in row["body"]]
            self.assertEqual(len(receipts), 1)
            self.opener.open.assert_called_once()
            self.assert_fixed_failure()
            self.gh._comments.clear()
            with self.assertRaisesRegex(bridge.BridgeError, "already pending or sent"):
                bridge.Bridge(self.gh).publish(draft["id"], bridge.digest(data))
            self.assertEqual(page.call_count, 2)
            self.opener.open.assert_called_once()
            self.assert_fixed_failure()
        self.network.assert_not_called()

    def test_wrong_slack_response_does_not_abort_or_replay_confirmed_publication(self):
        self.check_publication_notification_failure("wrong-response")

    def test_slack_redirect_does_not_abort_or_replay_confirmed_publication(self):
        self.check_publication_notification_failure("redirect")
