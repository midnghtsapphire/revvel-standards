#!/usr/bin/env python3
"""Email Error Intake.

Reads UNREAD "error" emails from an inbox over IMAP and opens one GitHub issue
per error, so the existing route -> research -> fix -> heal pipeline can handle
them. Read-only on the inbox: it marks processed error mails as read; it never
sends, moves, or deletes anything.

Safety:
  - Exits cleanly (no failure) if the inbox secrets are not set.
  - DRY_RUN=true logs what it WOULD file and changes nothing (recommended first run).
  - Only acts on mails whose subject matches an error keyword (and, if an allow
    list is set, whose sender matches). Non-matching mail is left untouched.
  - Caps issues per run (MAX_ISSUES) and labels them `needs-triage` so a human /
    oAudrey reviews before any auto-coding.

Environment:
  ERROR_INBOX_ADDRESS       inbox to read, e.g. you@gmail.com   (required)
  ERROR_INBOX_APP_PASSWORD  Gmail App Password (NOT your login) (required)
  IMAP_HOST                 default: imap.gmail.com
  REPO                      owner/repo for gh issue create
  GH_TOKEN                  token for gh (provided by Actions)
  ERROR_SUBJECT_KEYWORDS    comma list; default below
  ERROR_SENDERS             optional comma list of allowed sender substrings
  MAX_ISSUES                cap per run; default 5
  DRY_RUN                   'true' to log without creating issues / marking read
"""

import email
import imaplib
import json
import os
import re
import ssl
import subprocess
import tempfile
from email.header import decode_header

DEFAULT_KEYWORDS = "error,failed,failure,alert,exception,timeout,down,5xx,crash"

# Matches a subject that is *only* a URL (with or without scheme).
# A subject like "https://app.circleci.com/..." or "app.circleci.com/..." has no
# human-readable description and would create a useless GitHub issue title.
_URL_ONLY_RE = re.compile(
    r"^(https?://)?[\w.-]+\.[a-z]{2,}[/\S]*$",
    re.IGNORECASE,
)


def _parse_circleci_url(url: str) -> dict:
    """Extract structured metadata from a CircleCI build-output URL.

    Returns a dict with keys: project, build_num, step_num (strings, or empty).
    Example URL:
      https://app.circleci.com/api/v1.1/project/github/owner/repo/1234/output/5/0?file=true
    """
    m = re.search(
        r"/project/[^/]+/(?P<owner>[^/]+)/(?P<repo>[^/]+)/(?P<build>\d+)/output/(?P<step>\d+)",
        url,
    )
    if not m:
        return {}
    return {
        "project": f"{m.group('owner')}/{m.group('repo')}",
        "build_num": m.group("build"),
        "step_num": m.group("step"),
    }


def sanitize_subject(subject: str, body_text: str) -> tuple[str, str | None]:
    """Return a (title_suffix, extra_note) pair for the GitHub issue title/body.

    When *subject* is a raw URL we replace it with a human-readable description
    so that the resulting issue title is meaningful.  *extra_note* is an
    additional line inserted into the issue body when the URL was rewritten.
    """
    if not subject or not _URL_ONLY_RE.match(subject.strip()):
        # Subject has real descriptive text — use as-is.
        return subject, None

    url = subject.strip()
    if "circleci.com" in url.lower():
        meta = _parse_circleci_url(url)
        if meta:
            desc = (
                f"[CI FAILURE] CircleCI build #{meta['build_num']} failed "
                f"(project {meta['project']}, step {meta['step_num']})"
            )
        else:
            desc = "[CI FAILURE] CircleCI build failed (URL-only notification)"
        note = (
            f"**Original CircleCI URL:** `{url}`\n\n"
            "The subject of the notification email was a raw CircleCI API URL. "
            "Check the CircleCI webhook / email-intake configuration so that it "
            "includes a human-readable description in the subject line."
        )
    else:
        # Generic URL-only subject — still rewrite so the issue has a real title.
        desc = f"[CI/CD FAILURE] Automated notification (URL-only subject)"
        note = (
            f"**Original URL in subject:** `{url}`\n\n"
            "The subject of the notification email was a raw URL. "
            "Check the automation that sends failure emails so that it supplies "
            "a descriptive subject line."
        )

    return desc, note


def env(key, default=""):
    return os.environ.get(key, default)


def decode_mime(value):
    if not value:
        return ""
    out = ""
    for text, enc in decode_header(value):
        if isinstance(text, bytes):
            out += text.decode(enc or "utf-8", "replace")
        else:
            out += text
    return out.strip()


def is_error_mail(subject, sender, keywords, senders):
    """An error mail = subject hits a keyword AND (no sender allow list OR sender matches)."""
    s = (subject or "").lower()
    keyword_hit = any(k and k in s for k in keywords)
    sender_ok = (not senders) or any(x and x in (sender or "").lower() for x in senders)
    return keyword_hit and sender_ok


def extract_text(msg):
    if msg.is_multipart():
        for part in msg.walk():
            disp = str(part.get("Content-Disposition", ""))
            if part.get_content_type() == "text/plain" and "attachment" not in disp:
                payload = part.get_payload(decode=True)
                if payload:
                    return payload.decode(part.get_content_charset() or "utf-8", "replace")
        return ""
    payload = msg.get_payload(decode=True)
    if payload:
        return payload.decode(msg.get_content_charset() or "utf-8", "replace")
    return str(msg.get_payload())


def already_filed(repo, marker):
    """Best-effort dedupe: has an issue already been filed for this Message-ID?"""
    try:
        result = subprocess.run(
            ["gh", "issue", "list", "--repo", repo, "--search", marker,
             "--state", "all", "--json", "number"],
            capture_output=True, text=True, check=False,
        )
        return len(json.loads(result.stdout or "[]")) > 0
    except Exception:
        return False


def create_issue(repo, title, body):
    with tempfile.NamedTemporaryFile("w", suffix=".md", delete=False) as tf:
        tf.write(body)
        path = tf.name
    result = subprocess.run(
        ["gh", "issue", "create", "--repo", repo, "--title", title,
         "--body-file", path,
         "--label", "work-request", "--label", "agent-fallback",
         "--label", "openrouter", "--label", "needs-triage"],
        capture_output=True, text=True, check=False,
    )
    print(result.stdout.strip() or result.stderr.strip())


def main():
    addr = env("ERROR_INBOX_ADDRESS")
    pw = env("ERROR_INBOX_APP_PASSWORD")
    if not addr or not pw:
        print("::warning::ERROR_INBOX_ADDRESS / ERROR_INBOX_APP_PASSWORD not set — "
              "skipping email intake (no failure).")
        return 0

    repo = env("REPO")
    host = env("IMAP_HOST", "imap.gmail.com")
    keywords = [k.strip().lower() for k in env("ERROR_SUBJECT_KEYWORDS", DEFAULT_KEYWORDS).split(",") if k.strip()]
    senders = [x.strip() for x in env("ERROR_SENDERS", "").split(",") if x.strip()]
    try:
        max_issues = max(1, int(env("MAX_ISSUES", "5") or "5"))
    except ValueError:
        max_issues = 5
    dry_run = env("DRY_RUN", "").lower() == "true"

    box = imaplib.IMAP4_SSL(host, ssl_context=ssl.create_default_context())
    box.login(addr, pw)
    box.select("INBOX")
    typ, data = box.search(None, "UNSEEN")
    ids = data[0].split() if (typ == "OK" and data and data[0]) else []
    print(f"{len(ids)} unread message(s); DRY_RUN={dry_run}.")

    created = 0
    for num in ids:
        if created >= max_issues:
            print(f"Reached MAX_ISSUES={max_issues}; stopping.")
            break
        typ, msgdata = box.fetch(num, "(RFC822)")
        if typ != "OK" or not msgdata or not msgdata[0]:
            continue
        msg = email.message_from_bytes(msgdata[0][1])
        subject = decode_mime(msg.get("Subject"))
        sender = decode_mime(msg.get("From"))
        if not is_error_mail(subject, sender, keywords, senders):
            continue  # leave non-error mail untouched (still unread)

        msgid = (msg.get("Message-ID") or "").strip()
        marker = f"email-error-intake:{msgid}"

        # Rewrite URL-only subjects so the issue title is human-readable.
        sanitized_subject, url_note = sanitize_subject(subject or "(no subject)", extract_text(msg))
        title = (f"[email-error] {sanitized_subject}")[:120]

        body = (
            "Auto-filed from an error email by `email_error_intake.py`.\n\n"
            f"- **From:** {sender}\n"
            f"- **Date:** {decode_mime(msg.get('Date'))}\n"
            f"- **Message-ID:** `{msgid}`\n\n"
        )
        if url_note:
            body += f"### ⚠️ URL-only subject rewritten\n\n{url_note}\n\n"
        body += (
            "### Excerpt\n\n```\n"
            f"{extract_text(msg)[:1500]}\n"
            "```\n\n"
            f"<!-- {marker} -->\n"
        )

        if dry_run:
            print(f"[dry-run] would open issue: {title}")
            continue
        if msgid and already_filed(repo, marker):
            print(f"Already filed for {msgid}; marking read.")
        else:
            create_issue(repo, title, body)
            created += 1
        box.store(num, "+FLAGS", "\\Seen")

    box.logout()
    print(f"Done. Opened {created} issue(s) this run.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
