#!/usr/bin/env python3
"""GitHub saved-reply commands -> Gitar/workflow -> WR/PR audit -> Page draft.
Python 3.10+, stdlib only. Writes require --apply. See the repo MVI_CONTRACT.md.
"""
from __future__ import annotations

import argparse
import hashlib
import hmac
import html
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urlparse
from urllib.request import Request, urlopen, build_opener, HTTPRedirectHandler


class BridgeError(RuntimeError):
    pass


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise BridgeError(f"Set {name} securely before using this operation.")
    return value


def enabled(name: str) -> bool:
    return os.environ.get(name, "false").lower() == "true"


def canonical(data) -> str:
    return json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def digest(data) -> str:
    return hashlib.sha256(canonical(data).encode()).hexdigest()


def publication_key(data: dict) -> str:
    # Two concurrent draft creations for the same summary must share a ledger
    # key even if their timestamps differ. Approval hashes still bind all data.
    return "publication:" + digest({k: v for k, v in data.items() if k != "created_at"})


def utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def inert(text: str) -> str:
    # Audit mirrors must not re-issue Gitar commands or notify mentioned users.
    text = re.sub(r"(?i)gitar", lambda m: m.group(0)[0] + "\u200b" + m.group(0)[1:], text)
    return text.replace("@", "@\u200b").replace("<!--", "&lt;!--")


def summary_from(body: str, sha: str) -> str | None:
    done = re.search(r"<!--\s*AUDREY_DONE\s+sha=([a-fA-F0-9]{40})\s*-->", body)
    text = re.search(r"<!--\s*AUDREY_SUMMARY_BEGIN\s*-->(.*?)<!--\s*AUDREY_SUMMARY_END\s*-->", body, re.S)
    if not done or done.group(1).lower() != sha.lower() or not text:
        return None
    summary = html.unescape(re.sub(r"<[^>]+>", "", text.group(1))).strip()
    if not summary or len(summary) > 6000:
        raise BridgeError("Completion summary is empty or exceeds 6,000 characters.")
    # Conservative screening; not a substitute for human publication review.
    if re.search(r"(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]+|-----BEGIN .*PRIVATE KEY-----|EAA[A-Za-z0-9]{30,})", summary):
        raise BridgeError("Possible credential in summary; publication blocked.")
    return summary


def linked_issues(body: str) -> list[int]:
    # Deliberately same-repository only. Never treat every #number as a link.
    return sorted({int(n) for n in re.findall(r"(?im)\b(?:fix(?:es|ed)?|close[sd]?|resolve[sd]?|work request:)\s+#([1-9][0-9]*)\b", body or "")})


def command_from(body: str) -> tuple[str, int | None] | None:
    # No eval, shell fragments, comment-supplied workflow filenames, or refs.
    if body.strip() == "/audrey run":
        return ("run", None)
    m = re.fullmatch(r"/audrey finish ([1-9][0-9]*)", body.strip())
    return ("finish", int(m.group(1))) if m else None


class RejectRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise BridgeError("API redirects are refused before credentials are forwarded.")


class NoRedirect:
    """URL opener helper: use only fixed API origins, never payload URLs."""
    @staticmethod
    def request(url: str, method: str, headers: dict, body=None):
        if urlparse(url).scheme != "https":
            raise BridgeError("HTTPS required.")
        data = None if body is None else (urlencode(body).encode() if headers.get("Content-Type") == "application/x-www-form-urlencoded" else json.dumps(body).encode())
        req = Request(url, data=data, headers=headers, method=method)
        try:
            with build_opener(RejectRedirect()).open(req, timeout=30) as response:
                raw = response.read()
                # API destinations in this script are fixed; reject a changed origin.
                if urlparse(response.geturl()).netloc != urlparse(url).netloc:
                    raise BridgeError("Unexpected API redirect.")
                return json.loads(raw) if raw else None
        except HTTPError as exc:
            # Never print response bodies, tokens, request headers or secret URLs.
            raise BridgeError(f"API request failed: HTTP {exc.code}; inspect provider permissions/rate limits.") from None
        except (URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise BridgeError("API result uncertain; inspect the destination before retrying a write.") from None


class GitHub:
    def __init__(self, repo: str, apply: bool = False):
        if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", repo):
            raise BridgeError("Repository must be the confirmed OWNER/REPO.")
        self.repo, self.apply = repo, apply
        self.base = f"/repos/{repo}"
        self.headers = {
            "Authorization": "Bearer " + (os.environ.get("BRIDGE_GITHUB_TOKEN") or required("GITHUB_TOKEN")),
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "X-GitHub-Api-Version": "2026-03-10",
            "User-Agent": "audrey-gitar-page-bridge/1.0",
        }
        self._comments = {}

    def api(self, method: str, path: str, body=None):
        if not path.startswith("/") or path.startswith("//"):
            raise BridgeError("Invalid API path.")
        if method != "GET" and not self.apply:
            print(f"DRY RUN: {method} GitHub {path}")
            return {"id": 0, "html_url": "dry-run"}
        return NoRedirect.request("https://api.github.com" + path, method, self.headers, body)

    def pages(self, path: str, key: str | None = None) -> list:
        result, page = [], 1
        while True:
            data = self.api("GET", path + ("&" if "?" in path else "?") + f"per_page=100&page={page}")
            rows = data[key] if key else data
            if not isinstance(rows, list):
                raise BridgeError("Unexpected GitHub pagination response.")
            result.extend(rows)
            if len(rows) < 100:
                return result
            page += 1

    def comments(self, number: int) -> list:
        if number not in self._comments:
            self._comments[number] = self.pages(f"{self.base}/issues/{number}/comments")
        return self._comments[number]

    def marker_exists(self, number: int, marker: str) -> bool:
        return any(marker in c.get("body", "") for c in self.comments(number))

    def comment(self, number: int, body: str):
        if len(body) > 60000:
            raise BridgeError("Comment exceeds safe size limit.")
        result = self.api("POST", f"{self.base}/issues/{number}/comments", {"body": body})
        self._comments.setdefault(number, []).append({**result, "body": body})
        return result

    def comment_once(self, number: int, key: str, body: str):
        marker = f"<!-- audrey:{key} -->"
        if self.marker_exists(number, marker):
            return None
        return self.comment(number, body + "\n\n" + marker)

    def authorized(self, login: str) -> bool:
        if not re.fullmatch(r"[A-Za-z0-9_-]+(?:\[bot\])?", login):
            return False
        try:
            result = self.api("GET", f"{self.base}/collaborators/{quote(login, safe='')}/permission")
        except BridgeError:
            return False
        return result.get("permission") in {"write", "maintain", "admin"}


class Bridge:
    def __init__(self, gh: GitHub):
        self.gh = gh
        self.bot_logins = {s.strip().lower() for s in os.environ.get("GITAR_LOGINS", "gitar-bot[bot],gitar-bot").split(",") if s.strip()}
        self.metadata = None

    def is_gitar(self, user: dict) -> bool:
        return user.get("login", "").lower() in self.bot_logins

    def repo_metadata(self):
        if self.metadata is None:
            self.metadata = self.gh.api("GET", self.gh.base)
        return self.metadata

    def audit(self, number: int, kind: str, data: dict, pr: dict | None = None):
        record = {"kind": kind, "data": data}
        key = "audit:" + digest(record)
        targets = [number]
        if pr:
            for target in linked_issues(pr.get("body", "")):
                if target == number:
                    continue
                issue = self.gh.api("GET", f"{self.gh.base}/issues/{target}")
                if "pull_request" not in issue:
                    targets.append(target)
        rendered = inert(json.dumps(record, ensure_ascii=False, indent=2))
        chunks = [rendered[i:i + 44000] for i in range(0, len(rendered), 44000)]
        for target in targets:
            for index, chunk in enumerate(chunks):
                self.gh.comment_once(target, f"{key}:{index}", f"### Gitar activity record\n\nRecorded {utc()}. Source PR/issue #{number}. Part {index + 1}/{len(chunks)}.\n\n```json\n{chunk}\n```")

    def start(self, number: int, login: str, trigger: str):
        if not self.gh.authorized(login):
            raise BridgeError("Run blocked: creator/requester lacks current repository write permission.")
        # 2026-11-14: match the existing upstream work gates exactly. Never
        # enable/change them, and never describe a disabled start as completion.
        if os.environ.get("REVVEL_LLM_ALLOW_CLOUD") != "1" or os.environ.get("REVVEL_SWITCH_CODING_AGENTS") == "0":
            raise BridgeError("Run blocked: requires REVVEL_LLM_ALLOW_CLOUD=1 and REVVEL_SWITCH_CODING_AGENTS!=0.")
        issue = self.gh.api("GET", f"{self.gh.base}/issues/{number}")
        key = "start:" + digest({"number": number, "trigger": trigger})
        if self.gh.marker_exists(number, f"<!-- audrey:{key} -->"):
            if "pull_request" not in issue and not self.gh.marker_exists(number, f"<!-- audrey:{key}:sent -->"):
                raise BridgeError("Work-request dispatch already pending; inspect upstream before retrying. No completion confirmed.")
            return "Handoff already recorded; no work was re-dispatched and no completion is confirmed."
        if "pull_request" in issue:
            pr = self.gh.api("GET", f"{self.gh.base}/pulls/{number}")
            if pr.get("state") != "open":
                raise BridgeError("Cannot start Gitar on a closed PR.")
            # Trusted repository-owned template, not shell/code extracted from a comment.
            template = Path(__file__).with_name("gitar-task.txt").read_text()
            self.gh.comment_once(number, key, template.strip())
            status = "Trusted Gitar task delivered to the PR; implementation and completion remain unverified."
        else:
            workflow = os.environ.get("WORK_REQUEST_WORKFLOW", "").strip() or "wr-pr-creation.yml"
            if not re.fullmatch(r"[A-Za-z0-9_.-]+\.ya?ml", workflow):
                raise BridgeError("WORK_REQUEST_WORKFLOW must be an approved workflow filename.")
            metadata = self.repo_metadata()
            branch = metadata["default_branch"]
            configured = self.gh.api("GET", f"{self.gh.base}/actions/workflows/{quote(workflow, safe='')}")
            if configured.get("path") != ".github/workflows/" + workflow or configured.get("state") != "active":
                raise BridgeError("Approved work-request workflow is absent or inactive.")
            # Record pending BEFORE dispatch. Ambiguous failures are not automatically replayed.
            self.gh.comment_once(number, key, f"Work-request workflow `{workflow}` dispatch pending. Requested by `{login}`. Trusted ref: `{branch}`. This is not a completion report.")
            result = self.gh.api("POST", f"{self.gh.base}/actions/workflows/{quote(workflow, safe='')}/dispatches", {
                "ref": branch, "inputs": {"issue_number": str(number), "draft_only": True, "suppress_direct_jules": True}})
            self.gh.comment_once(number, key + ":sent", "Approved workflow dispatch accepted. It must create/link a PR before Gitar can act.\n\n" + inert(canonical(result)))
            status = "WR workflow dispatch accepted for a draft document PR only; upstream may skip and is not an implementation engine or completion."
        self.notify_slack(f"Run requested in {self.gh.repo} #{number}. https://github.com/{self.gh.repo}/issues/{number}")
        return status

    def finish(self, number: int, source_id: int):
        issue = self.gh.api("GET", f"{self.gh.base}/issues/{number}")
        if "pull_request" not in issue:
            raise BridgeError("Use /audrey finish on the linked PR, not the issue.")
        source = self.gh.api("GET", f"{self.gh.base}/issues/comments/{source_id}")
        if source.get("issue_url") != "https://api.github.com" + self.gh.base + f"/issues/{number}" or not self.is_gitar(source.get("user", {})):
            raise BridgeError("Finish source must be a Gitar comment on this PR.")
        full_pr = self.gh.api("GET", f"{self.gh.base}/pulls/{number}")
        if summary_from(source.get("body", ""), full_pr["head"]["sha"]) is None:
            raise BridgeError("Gitar source lacks a current-head completion marker and summary block.")
        if self.repo_metadata().get("private", True):
            raise BridgeError("Private repository publication is blocked.")
        self.queue_summary(full_pr, source)
        return "Current-head Gitar summary accepted for a signed Facebook draft; nothing has been published."

    def agent_status(self, request_id: str, number: int, status: str, summary: str):
        # Existing command window protocol; accepted handoffs are delivered,
        # NOT completed. Fixed local summaries only, never payload instructions.
        self.gh.api("POST", f"{self.gh.base}/dispatches", {
            "event_type": "agent_status", "client_payload": {
                "agent": "gitar-bridge", "request_id": request_id,
                "number": number, "status": status, "summary": summary,
            },
        })

    def agent_request(self, payload: dict):
        if payload.get("agent") != "gitar-bridge":
            return
        request_id = payload.get("request_id")
        match = re.fullmatch(r"([1-9][0-9]*):gitar-bridge", request_id) if isinstance(request_id, str) else None
        if not match:
            raise BridgeError("Invalid bridge request_id; cannot correlate an agent status.")
        number = None
        try:
            # Authenticate using the actual API source, not dispatch title,
            # instructions, URL, author, sender or a comment-supplied ref.
            comment_id = int(match.group(1))
            comment = self.gh.api("GET", f"{self.gh.base}/issues/comments/{comment_id}")
            issue_match = re.fullmatch(re.escape("https://api.github.com" + self.gh.base) + r"/issues/([1-9][0-9]*)", comment.get("issue_url", ""))
            if comment.get("id") != comment_id or not issue_match:
                raise BridgeError("Triggering comment does not belong to this repository/issue.")
            number = int(issue_match.group(1))
            if payload.get("version") != "1" or payload.get("repository") != self.gh.repo:
                raise BridgeError("Agent request version/repository mismatch.")
            if type(payload.get("number")) is not int or payload["number"] != number:
                raise BridgeError("Agent request number does not match the triggering comment.")
            issue = self.gh.api("GET", f"{self.gh.base}/issues/{number}")
            if issue.get("number") != number or payload.get("kind") != ("pull_request" if "pull_request" in issue else "issue"):
                raise BridgeError("Agent request kind/number does not match the actual issue.")
            author = comment.get("user", {})
            login = author.get("login", "")
            if author.get("type") != "User" or login != payload.get("requested_by"):
                raise BridgeError("Triggering comment author does not match the human requester.")
            command = command_from(comment.get("body", ""))
            if not command:
                raise BridgeError("Only exact /audrey run or /audrey finish <positive source comment id> is supported.")
            if not self.gh.authorized(login):
                raise BridgeError("Request blocked: requester lacks current repository write permission.")
            if not enabled("ENABLE_AUDREY_BRIDGE"):
                raise BridgeError("Request blocked: ENABLE_AUDREY_BRIDGE is disabled.")
            summary = (self.start(number, login, request_id) if command[0] == "run"
                       else self.finish(number, command[1]))
        except BridgeError as exc:
            # No guessed issue IDs for malformed/cross-repository provenance.
            # For a valid source, record blocked/uncertain state, not completion.
            if number is not None:
                self.agent_status(request_id, number, "failed", str(exc))
            raise
        self.agent_status(request_id, number, "delivered", summary)

    def collect_pr(self, number: int):
        pr = self.gh.api("GET", f"{self.gh.base}/pulls/{number}")
        for c in self.gh.comments(number):
            if self.is_gitar(c.get("user", {})):
                self.audit(number, "comment-snapshot", self.select_comment(c), pr)
                self.queue_summary(pr, c)
        for kind, path in [("review", f"/pulls/{number}/reviews"), ("inline-comment", f"/pulls/{number}/comments")]:
            for item in self.gh.pages(self.gh.base + path):
                if self.is_gitar(item.get("user", {})):
                    self.audit(number, kind, self.select_comment(item), pr)
        for commit in self.gh.pages(f"{self.gh.base}/pulls/{number}/commits"):
            if self.is_gitar(commit.get("author") or {}) or self.is_gitar(commit.get("committer") or {}):
                self.audit(number, "commit", {"sha": commit["sha"], "html_url": commit.get("html_url"), "commit": commit.get("commit"), "author": commit.get("author", {}).get("login") if commit.get("author") else None}, pr)
        for check in self.gh.pages(f"{self.gh.base}/commits/{pr['head']['sha']}/check-runs", "check_runs"):
            if check.get("app", {}).get("slug") in {"gitar-bot", "gitar"}:
                self.audit(number, "check", {k: check.get(k) for k in ("id", "name", "status", "conclusion", "head_sha", "details_url", "started_at", "completed_at", "output")}, pr)

    @staticmethod
    def select_comment(item):
        return {k: item.get(k) for k in ("id", "body", "html_url", "created_at", "updated_at", "submitted_at", "state", "commit_id", "path", "line")}

    def queue_summary(self, pr: dict, comment: dict):
        summary = summary_from(comment.get("body", ""), pr["head"]["sha"])
        if summary is None:
            return
        if self.repo_metadata().get("private", True):
            print("Facebook draft blocked: repository is private. No private-source auto-publication.")
            return
        key = "draft:" + digest({"pr": pr["number"], "sha": pr["head"]["sha"], "source": comment["id"], "body": comment["body"], "page_id": os.environ.get("FACEBOOK_PAGE_ID")})
        if self.gh.marker_exists(pr["number"], f"<!-- audrey:{key} -->"):
            return
        signing_key = required("BRIDGE_SIGNING_KEY")
        if len(signing_key) < 32:
            raise BridgeError("BRIDGE_SIGNING_KEY must be at least 32 characters.")
        page_id = required("FACEBOOK_PAGE_ID")
        if not re.fullmatch(r"[0-9]+", page_id):
            raise BridgeError("Set the confirmed numeric Facebook Page ID before preparing drafts.")
        data = {"version": 1, "repository": self.gh.repo, "pr_number": pr["number"], "head_sha": pr["head"]["sha"], "page_name": "audreybuildsai", "page_id": page_id, "source_comment_id": comment["id"], "source_body_sha256": hashlib.sha256(comment["body"].encode()).hexdigest(), "message": summary, "created_at": utc()}
        envelope = {"data": data, "hmac_sha256": hmac.new(signing_key.encode(), canonical(data).encode(), hashlib.sha256).hexdigest()}
        body = "### Facebook publication draft — audreybuildsai\n\nNothing has been published. Review the EXACT `message` below before approving the protected publication job.\n\n```json\n" + json.dumps(envelope, ensure_ascii=False, indent=2) + "\n```"
        result = self.gh.comment_once(pr["number"], key, body)
        if result and self.gh.apply and enabled("QUEUE_FACEBOOK_PUBLICATION"):
            self.gh.api("POST", f"{self.gh.base}/dispatches", {"event_type": "audrey-publication-ready", "client_payload": {"draft_comment_id": result["id"]}})
        if result:
            self.notify_slack(f"Facebook draft ready for review in {self.gh.repo} PR #{pr['number']}. {result.get('html_url', '')}")

    def event(self, name: str, event: dict):
        if event.get("repository", {}).get("full_name") != self.gh.repo:
            raise BridgeError("Event repository does not match the configured repository.")
        action = event.get("action")
        login = event.get("sender", {}).get("login", "")
        issue, pr = event.get("issue"), event.get("pull_request")
        number = (issue or pr or {}).get("number")
        if name == "repository_dispatch" and action == "agent_requested":
            self.agent_request(event.get("client_payload", {}))
            return
        if name in {"issues", "pull_request", "pull_request_target"} and action == "opened" and number:
            self.gh.comment_once(number, "intake", "### Audrey saved-reply controls\n\nAn authorized collaborator can post exactly `/audrey run` to start the approved work. Gitar runs on PRs; issue work uses the configured work-request workflow to produce a linked PR.\n\nActivity is recorded here and in linked work requests. Completed Gitar summaries become Facebook drafts; no raw code or private-repository content is auto-published.")
            if enabled("AUTO_START"):
                # 2026-11-14: actual current-write human creator, not sender.
                # Original standalone intake: self.start(number, login, f"opened:{number}")
                current = self.gh.api("GET", f"{self.gh.base}/issues/{number}")
                creator = current.get("user", {})
                if current.get("number") != number or creator.get("type") != "User":
                    raise BridgeError("Auto-start blocked: actual human creator could not be validated.")
                if not enabled("ENABLE_AUDREY_BRIDGE"):
                    raise BridgeError("Auto-start blocked: ENABLE_AUDREY_BRIDGE is disabled.")
                self.start(number, creator.get("login", ""), f"opened:{number}")
        if name == "issue_comment" and issue and event.get("comment"):
            c = event["comment"]
            # Ignore bridge comments to prevent recursive logs/command execution.
            if "<!-- audrey:" in c.get("body", ""):
                return
            if self.is_gitar(c.get("user", {})):
                full_pr = self.gh.api("GET", f"{self.gh.base}/pulls/{number}") if "pull_request" in issue else None
                self.audit(number, "comment-event:" + str(action), self.select_comment(c), full_pr)
                if full_pr and action != "deleted":
                    current = self.gh.api("GET", f"{self.gh.base}/issues/comments/{c['id']}")
                    if self.is_gitar(current.get("user", {})):
                        self.queue_summary(full_pr, current)
            # 2026-11-14: inactive standalone route retained as history only.
            # Human commands now ONLY enter through agent_requested above.
            # elif action == "created" and c.get("user", {}).get("login") == login:
            #     command = command_from(c.get("body", ""))
            #     if command and command[0] == "run":
            #         self.start(number, login, f"comment:{c['id']}")
            #     elif command and command[0] == "finish" and self.gh.authorized(login):
            #         if "pull_request" not in issue:
            #             raise BridgeError("Use /audrey finish on the linked PR, not the issue.")
            #         source = self.gh.api("GET", f"{self.gh.base}/issues/comments/{command[1]}")
            #         if source.get("issue_url") != "https://api.github.com" + self.gh.base + f"/issues/{number}" or not self.is_gitar(source.get("user", {})):
            #             raise BridgeError("Finish source must be a Gitar comment on this PR.")
            #         full_pr = self.gh.api("GET", f"{self.gh.base}/pulls/{number}")
            #         if summary_from(source.get("body", ""), full_pr["head"]["sha"]) is None:
            #             raise BridgeError("Gitar source lacks a current-head completion marker and summary block.")
            #         self.queue_summary(full_pr, source)
        if name in {"pull_request_review", "pull_request_review_comment"} and pr:
            item = event.get("review") or event.get("comment") or {}
            if self.is_gitar(item.get("user", {})):
                current_pr = self.gh.api("GET", f"{self.gh.base}/pulls/{number}")
                self.audit(number, name + ":" + str(action), self.select_comment(item), current_pr)
        if pr and name in {"pull_request", "pull_request_target"} and action in {"synchronize", "closed", "reopened"}:
            self.collect_pr(number)
        if name in {"check_run", "check_suite"}:
            check = event.get(name, {})
            for item in check.get("pull_requests", []):
                self.collect_pr(int(item["number"]))

    def relay(self, envelope: dict):
        # Read-only fork workflows can upload untrusted data. Fetch authoritative
        # source objects instead of trusting artifact authors, bodies, or URLs.
        name, event = envelope.get("event_name"), envelope.get("event", {})
        if name not in {"pull_request_review", "pull_request_review_comment"}:
            raise BridgeError("Unsupported relayed event type.")
        if event.get("repository", {}).get("full_name") != self.gh.repo:
            raise BridgeError("Relayed repository mismatch.")
        try:
            number = int(event["pull_request"]["number"])
            raw = event.get("review") or event.get("comment") or {}
            object_id = int(raw["id"])
            if number <= 0 or object_id <= 0:
                raise ValueError()
        except (KeyError, TypeError, ValueError):
            raise BridgeError("Invalid relayed object identifiers.") from None
        pr = self.gh.api("GET", f"{self.gh.base}/pulls/{number}")
        if pr.get("base", {}).get("repo", {}).get("full_name") != self.gh.repo:
            raise BridgeError("Relayed PR does not belong to the target repository.")
        path = (f"{self.gh.base}/pulls/{number}/reviews/{object_id}" if name == "pull_request_review"
                else f"{self.gh.base}/pulls/comments/{object_id}")
        try:
            source = self.gh.api("GET", path)
        except BridgeError:
            if event.get("action") == "deleted":
                print("Deleted review comment cannot be revalidated; relay did not archive untrusted content.")
                return
            raise
        if name == "pull_request_review_comment" and source.get("pull_request_url") != "https://api.github.com" + self.gh.base + f"/pulls/{number}":
            raise BridgeError("Relayed inline comment belongs to another PR.")
        if not self.is_gitar(source.get("user", {})):
            print("Ignored relayed object: authoritative author is not Gitar.")
            return
        self.audit(number, name + ":verified-snapshot", self.select_comment(source), pr)

    def notify_slack(self, text: str):
        url = os.environ.get("SLACK_WEBHOOK_URL", "")
        if not url:
            return
        # 2026-11-13: inactive validation retained; webhook paths carry credentials
        # and must never enter a plaintext request, even on an allowed Slack host.
        # if urlparse(url).netloc not in {"hooks.slack.com", "hooks.slack-gov.com"} or not urlparse(url).path.startswith("/services/"):
        parsed = urlparse(url)
        if parsed.scheme != "https" or parsed.netloc not in {"hooks.slack.com", "hooks.slack-gov.com"} or not parsed.path.startswith("/services/"):
            raise BridgeError("Use an authorized Slack incoming webhook URL.")
        if not self.gh.apply:
            print("DRY RUN: Slack notification suppressed.")
            return
        try:
            req = Request(url, data=json.dumps({"text": text}).encode(), headers={"Content-Type": "application/json"}, method="POST")
            # 2026-11-13: inactive redirect-following transport retained below.
            # Refuse redirects before a new request can forward webhook credentials
            # or the notification body; inspect Slack manually on uncertainty.
            # with urlopen(req, timeout=30) as result:
            with build_opener(RejectRedirect()).open(req, timeout=30) as result:
                # 2026-11-13: inactive permissive response check retained.
                # if result.read().strip() != b"ok":
                if result.read() != b"ok":
                    raise BridgeError("Slack delivery not confirmed.")
        # 2026-11-13: inactive handler retained; refused redirects and unexpected
        # responses are notification failures, not failed accepted work/publication.
        # except (HTTPError, URLError, TimeoutError):
        except (HTTPError, URLError, TimeoutError, BridgeError):
            # A notification failure must not replay code dispatch or Facebook writes.
            print("Slack notification unconfirmed. Inspect the channel; no automatic retry.", file=sys.stderr)

    def read_draft(self, draft_id: int) -> tuple[dict, dict]:
        comment = self.gh.api("GET", f"{self.gh.base}/issues/comments/{draft_id}")
        match = re.search(r"```json\n(.*?)\n```", comment.get("body", ""), re.S)
        if not match or not comment.get("body", "").startswith("### Facebook publication draft — audreybuildsai"):
            raise BridgeError("Not a bridge publication draft.")
        try:
            envelope = json.loads(match.group(1))
            data = envelope["data"]
            signature = hmac.new(required("BRIDGE_SIGNING_KEY").encode(), canonical(data).encode(), hashlib.sha256).hexdigest()
            if not hmac.compare_digest(signature, envelope["hmac_sha256"]):
                raise BridgeError("Draft signature does not match; publication blocked.")
            if data["repository"] != self.gh.repo or data["page_name"] != "audreybuildsai" or data["version"] != 1:
                raise BridgeError("Draft destination mismatch.")
            if data.get("page_id") != required("FACEBOOK_PAGE_ID"):
                raise BridgeError("Draft's approved numeric Page ID does not match the configuration.")
            if comment.get("issue_url") != "https://api.github.com" + self.gh.base + f"/issues/{int(data['pr_number'])}":
                raise BridgeError("Draft is not on its source PR.")
        except (ValueError, KeyError, TypeError):
            raise BridgeError("Invalid draft data.") from None
        self.validate_source(data)
        return data, comment

    def validate_source(self, data: dict):
        if self.repo_metadata().get("private", True):
            raise BridgeError("Private repository publication is blocked.")
        pr = self.gh.api("GET", f"{self.gh.base}/pulls/{int(data['pr_number'])}")
        if pr["head"]["sha"] != data["head_sha"]:
            raise BridgeError("Draft is stale: PR has new commits. Generate a fresh summary.")
        source = self.gh.api("GET", f"{self.gh.base}/issues/comments/{int(data['source_comment_id'])}")
        if not self.is_gitar(source.get("user", {})) or source.get("issue_url") != "https://api.github.com" + self.gh.base + f"/issues/{int(data['pr_number'])}":
            raise BridgeError("Summary source is not a Gitar comment on the source PR.")
        if hashlib.sha256(source.get("body", "").encode()).hexdigest() != data["source_body_sha256"]:
            raise BridgeError("Gitar summary changed after approval preparation.")
        if summary_from(source.get("body", ""), data["head_sha"]) != data["message"]:
            raise BridgeError("Draft message differs from the source summary.")

    def publish(self, draft_id: int, approval_digest: str):
        data, comment = self.read_draft(draft_id)
        if not hmac.compare_digest(digest(data), approval_digest):
            raise BridgeError("Approval digest does not match the exact publication payload.")
        page_id = required("FACEBOOK_PAGE_ID")
        version = required("FACEBOOK_GRAPH_VERSION")
        if not re.fullmatch(r"[0-9]+", page_id) or not re.fullmatch(r"v[0-9]+\.0", version):
            raise BridgeError("Configure a numeric Page ID and supported explicit Graph API version.")
        key = publication_key(data)
        if self.gh.marker_exists(data["pr_number"], f"<!-- audrey:{key}:pending -->"):
            raise BridgeError("Publication already pending or sent. Inspect the Page/receipt; never blindly retry.")
        if not self.gh.apply:
            print("DRY RUN: Facebook publication suppressed. Exact message:\n" + data["message"])
            return
        if not enabled("FACEBOOK_PUBLISH_ENABLED"):
            raise BridgeError("Facebook publishing is disabled.")
        if os.environ.get("APPROVED_FACEBOOK_PAGE_ID") != page_id:
            raise BridgeError("Approved Page ID must match the selected Page ID.")
        if data.get("page_id") != page_id:
            raise BridgeError("Publication destination changed after the draft was signed.")
        headers = {"Authorization": "Bearer " + required("FACEBOOK_PAGE_ACCESS_TOKEN"), "Content-Type": "application/x-www-form-urlencoded"}
        graph = f"https://graph.facebook.com/{version}"
        actual = NoRedirect.request(graph + "/" + page_id + "?fields=id,name", "GET", headers)
        if actual.get("id") != page_id:
            raise BridgeError("Facebook Page token/ID validation failed.")
        # Page display names can differ from usernames. Confirm the numeric ID in setup.
        print(f"Publishing approved payload {approval_digest} to configured Page ID {page_id}.")
        self.gh.comment_once(data["pr_number"], key + ":pending", f"Facebook publication attempt pending. Draft comment ID: {draft_id}. Payload SHA-256: `{approval_digest}`. Page ID: `{page_id}`. Do not retry automatically if the API outcome is uncertain.")
        result = NoRedirect.request(graph + "/" + page_id + "/feed", "POST", headers, {"message": data["message"]})
        if not result or not result.get("id"):
            raise BridgeError("Facebook returned no post ID. Inspect Page before retrying.")
        receipt = f"Facebook Page publication confirmed. Page ID: `{page_id}`. Post ID: `{result['id']}`. Draft: {comment.get('html_url')}. Payload SHA-256: `{approval_digest}`."
        self.audit(data["pr_number"], "facebook-publication-receipt", {"page_id": page_id, "post_id": result["id"], "draft_id": draft_id, "payload_sha256": approval_digest}, self.gh.api("GET", f"{self.gh.base}/pulls/{data['pr_number']}"))
        self.gh.comment_once(data["pr_number"], key + ":receipt", receipt)
        self.notify_slack(f"Approved Gitar summary published to audreybuildsai. Facebook post ID: {result['id']}.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", default=os.environ.get("GITHUB_REPOSITORY"))
    parser.add_argument("--apply", action="store_true", help="Allow external writes; omitted means dry-run")
    sub = parser.add_subparsers(dest="operation", required=True)
    event = sub.add_parser("event")
    event.add_argument("--event-name", default=os.environ.get("GITHUB_EVENT_NAME"))
    event.add_argument("--event-file", default=os.environ.get("GITHUB_EVENT_PATH"))
    relay = sub.add_parser("relay")
    relay.add_argument("--event-file", required=True)
    sync = sub.add_parser("sync")
    sync.add_argument("--pr", type=int, required=True)
    prepare = sub.add_parser("prepare")
    prepare.add_argument("--draft-id", type=int, required=True)
    prepare.add_argument("--output", default="publication.json")
    publish = sub.add_parser("publish")
    publish.add_argument("--draft-id", type=int, required=True)
    publish.add_argument("--approval-digest", required=True)
    args = parser.parse_args()
    try:
        if not args.repo:
            raise BridgeError("Set --repo OWNER/REPO or GITHUB_REPOSITORY.")
        bridge = Bridge(GitHub(args.repo, args.apply))
        if args.operation == "event":
            if not args.event_name or not args.event_file:
                raise BridgeError("Event name and file are required.")
            bridge.event(args.event_name, json.loads(Path(args.event_file).read_text()))
        elif args.operation == "relay":
            bridge.relay(json.loads(Path(args.event_file).read_text()))
        elif args.operation == "sync":
            bridge.collect_pr(args.pr)
        elif args.operation == "prepare":
            data, comment = bridge.read_draft(args.draft_id)
            payload = {"draft_comment_id": args.draft_id, "approval_digest": digest(data), "draft_url": comment.get("html_url"), "data": data}
            Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n")
            print("Exact publication draft: " + str(comment.get("html_url")))
            print("Approval digest: " + payload["approval_digest"])
        elif args.operation == "publish":
            bridge.publish(args.draft_id, args.approval_digest)
    except (BridgeError, OSError, ValueError) as exc:
        print("Bridge stopped: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
