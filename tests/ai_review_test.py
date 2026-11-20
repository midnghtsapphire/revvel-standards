"""Behavior checks for the advisory AI reviewers on CircleCI. No network and no real model calls.

Covers: the analysis side (scripts/ai_review.py: gates, git diff, size caps, fork skips, redaction), the posting job
(its program is inline in .circleci/ai-review.yml and is extracted and tested here), the job graph and secret
boundaries, and a grep that nothing echoes secrets. TriageChief, 2026-11-19.
"""

import importlib
import json
import os
import re
import subprocess
import sys
import tempfile
import textwrap
import types
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
ai_review = importlib.import_module("ai_review")
YML = ROOT / ".circleci/ai-review.yml"
SCRIPTS = ROOT / "scripts/ai-review"

BASE_ENV = {
    "REVVEL_LLM_ALLOW_CLOUD": "1",
    "OPENROUTER_API_KEY": "or-key-for-tests",
    "CIRCLE_PROJECT_USERNAME": "acme",
    "CIRCLE_PROJECT_REPONAME": "widgets",
    "CIRCLE_PULL_REQUEST": "https://github.com/acme/widgets/pull/7",
}
FAKE_TOKEN = "ghp_" + "A" * 36


def load_poster():
    """Extract the inline posting program from the workflow file and load it as a module."""
    lines = YML.read_text(encoding="utf-8").splitlines()
    start = next(i for i, line in enumerate(lines) if line.strip() == "AI_REVIEW_POSTER: |")
    indent = len(lines[start + 1]) - len(lines[start + 1].lstrip())
    body = []
    first = start + 1
    for line in lines[first:]:
        if line.strip() and len(line) - len(line.lstrip()) < indent:
            break
        body.append(line)
    module = types.ModuleType("poster")
    exec(compile(textwrap.dedent("\n".join(body)), "poster", "exec"), module.__dict__)  # noqa: S102
    return module


POSTER = load_poster()


def git(cwd, *args):
    subprocess.run(
        ["git", *args],
        cwd=cwd,
        check=True,
        capture_output=True,
        env=dict(
            os.environ, GIT_AUTHOR_NAME="t", GIT_AUTHOR_EMAIL="t@t", GIT_COMMITTER_NAME="t", GIT_COMMITTER_EMAIL="t@t"
        ),
    )


class RepoFixture:
    """An origin repo with main and daily/2026-11-14, and a clone on a feature branch (like a CircleCI checkout)."""

    def __init__(self, tmp, feature_files=None, message="feat: change"):
        self.tmp = Path(tmp)
        origin, self.work = self.tmp / "origin.git", self.tmp / "work"
        git(self.tmp, "init", "-q", "--bare", str(origin))
        git(self.tmp, "clone", "-q", str(origin), str(self.work))
        git(self.work, "checkout", "-q", "-b", "main")
        (self.work / "a.py").write_text("def f(x):\n    return x\n", encoding="utf-8")
        git(self.work, "add", ".")
        git(self.work, "commit", "-q", "-m", "base")
        git(self.work, "push", "-q", "origin", "main")
        git(self.work, "checkout", "-q", "-b", "daily/2026-11-14")
        (self.work / "d.txt").write_text("daily\n", encoding="utf-8")
        git(self.work, "add", ".")
        git(self.work, "commit", "-q", "-m", "daily")
        git(self.work, "push", "-q", "origin", "daily/2026-11-14")
        git(self.work, "checkout", "-q", "-b", "feat")
        for name, text in (feature_files or {"a.py": "def f(x):\n    y = x + 1\n    return y\n"}).items():
            (self.work / name).parent.mkdir(parents=True, exist_ok=True)
            (self.work / name).write_text(text, encoding="utf-8")
        git(self.work, "add", ".")
        git(self.work, "commit", "-q", "-m", message)


class DecideTests(unittest.TestCase):
    def run_decide(self, env_over=None, fixture_kwargs=None):
        env = {k: v for k, v in dict(BASE_ENV, **(env_over or {})).items() if v is not None}
        with tempfile.TemporaryDirectory() as tmp:
            repo = RepoFixture(tmp, **(fixture_kwargs or {}))
            out = Path(tmp) / "out"
            with mock.patch.object(ai_review, "api_get", return_value=(0, None)):
                run, reason, facts = ai_review.decide(env, str(repo.work), str(out), "pr-agent")
            diff = (out / "pr-agent.diff").read_text(encoding="utf-8") if (out / "pr-agent.diff").exists() else ""
        return run, reason, facts, diff

    def test_happy_path_diffs_against_the_nearest_base(self):
        run, reason, facts, diff = self.run_decide()
        self.assertTrue(run, reason)
        self.assertEqual(facts["base"], "origin/daily/2026-11-14")  # not main: the PR is based on the daily branch
        self.assertEqual(facts["pr_number"], 7)
        self.assertIn("+    y = x + 1", diff)
        self.assertNotIn("daily", diff)  # the daily commit is the base, not part of this PR

    def test_explicit_base_wins(self):
        run, _, facts, diff = self.run_decide({"AI_REVIEW_BASE_BRANCH": "main"})
        self.assertTrue(run)
        self.assertEqual(facts["base"], "origin/main")
        self.assertIn("d.txt", diff)

    def test_missing_secret_or_gate_skips_with_a_clear_message(self):
        run, reason, _, _ = self.run_decide({"OPENROUTER_API_KEY": None})
        self.assertFalse(run)
        self.assertIn("OPENROUTER_API_KEY is missing", reason)
        self.assertIn("ai-review-llm", reason)
        run, reason, _, _ = self.run_decide({"REVVEL_LLM_ALLOW_CLOUD": "yes"})
        self.assertFalse(run)
        self.assertIn("spend gate", reason)

    def test_fork_pr_is_skipped_from_circleci_env(self):
        run, reason, _, _ = self.run_decide({"CIRCLE_PR_USERNAME": "evil", "CIRCLE_PR_REPONAME": "widgets"})
        self.assertFalse(run)
        self.assertIn("fork", reason)
        self.assertTrue(self.run_decide({"CIRCLE_PR_USERNAME": "acme", "CIRCLE_PR_REPONAME": "widgets"})[0])

    def test_fork_pr_is_skipped_from_the_public_api_answer(self):
        info = {"state": "open", "draft": False, "title": "x", "base": "", "head_repo": "evil/widgets", "labels": []}
        with tempfile.TemporaryDirectory() as tmp:
            repo = RepoFixture(tmp)
            with mock.patch.object(ai_review, "pr_info", return_value=info):
                run, reason, _ = ai_review.decide(dict(BASE_ENV), str(repo.work), str(Path(tmp) / "o"), "pr-agent")
        self.assertFalse(run)
        self.assertIn("fork", reason)

    def test_not_a_pr_pipeline(self):
        run, reason, _, _ = self.run_decide({"CIRCLE_PULL_REQUEST": None})
        self.assertFalse(run)
        self.assertIn("not a PR pipeline", reason)

    def test_skip_token_in_head_commit_message(self):
        run, reason, _, _ = self.run_decide(fixture_kwargs={"message": "wip [skip-ai-review]"})
        self.assertFalse(run)
        self.assertIn("commit message", reason)

    def test_policy_from_api_facts(self):
        env = dict(BASE_ENV)
        base = {"state": "open", "draft": False, "title": "feat", "base": "", "head_repo": "acme/widgets", "labels": []}
        self.assertEqual(ai_review.policy_problem(env, "acme/widgets", 7, base), "")
        self.assertIn("not open", ai_review.policy_problem(env, "acme/widgets", 7, dict(base, state="closed")))
        self.assertIn("title", ai_review.policy_problem(env, "acme/widgets", 7, dict(base, title="x [Skip-AI-Review]")))
        self.assertIn("label", ai_review.policy_problem(env, "acme/widgets", 7, dict(base, labels=["skip-ai-review"])))
        self.assertEqual(ai_review.policy_problem(env, "acme/widgets", 7, dict(base, draft=True)), "")
        self.assertIn(
            "draft",
            ai_review.policy_problem(dict(env, AI_REVIEW_SKIP_DRAFTS="1"), "acme/widgets", 7, dict(base, draft=True)),
        )
        self.assertEqual(ai_review.policy_problem(env, "acme/widgets", 7, None), "")

    def test_size_caps_skip_and_flag_it(self):
        many = {"f%d.txt" % i: "x\n" for i in range(5)}
        run, reason, facts, _ = self.run_decide({"AI_REVIEW_MAX_FILES": "3"}, {"feature_files": many})
        self.assertFalse(run)
        self.assertTrue(facts["size_skip"])
        self.assertIn("too large", reason)
        run, _, facts, _ = self.run_decide({"AI_REVIEW_MAX_CHANGED_LINES": "2"})
        self.assertTrue(facts["size_skip"])
        run, _, facts, _ = self.run_decide({"AI_REVIEW_MAX_DIFF_BYTES": "50"})
        self.assertTrue(facts["size_skip"])
        self.assertFalse(run)

    def test_lockfiles_and_minified_files_are_left_out_of_the_diff(self):
        files = {
            "a.py": "def f(x):\n    return x + 2\n",
            "package-lock.json": "{}\n" * 500,
            "dist/app.min.js": "x" * 900,
        }
        run, _, facts, diff = self.run_decide(fixture_kwargs={"feature_files": files})
        self.assertTrue(run)
        self.assertEqual(facts["files"], 1)
        self.assertNotIn("package-lock", diff)
        self.assertNotIn("app.min.js", diff)

    def test_prepare_and_record_write_the_workspace_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "out"
            env = {k: v for k, v in BASE_ENV.items() if k != "OPENROUTER_API_KEY"}
            with mock.patch.object(ai_review, "OUT_DIR", str(Path(tmp) / "env")):
                self.assertEqual(ai_review.main(["prepare", "--reviewer", "openhands", "--out", str(out)], env=env), 0)
            meta = json.loads((out / "openhands.meta.json").read_text(encoding="utf-8"))
            self.assertEqual(meta["result"], "skipped")
            self.assertIn("OPENROUTER_API_KEY", meta["reason"])
            self.assertTrue((out / "openhands.md").exists())
            ai_review.main(
                ["record", "--reviewer", "openhands", "--out", str(out), "--result", "reviewed", "--model", "m/x"],
                env=dict(env, AI_REVIEW_PR_NUMBER="7", AI_REVIEW_HEAD_SHA="a" * 40),
            )
            meta = json.loads((out / "openhands.meta.json").read_text(encoding="utf-8"))
            self.assertEqual((meta["result"], meta["model"], meta["pr_number"]), ("reviewed", "m/x", 7))

    def test_main_never_raises(self):
        with mock.patch.object(ai_review, "cmd_record", side_effect=ValueError("boom")):
            self.assertEqual(
                ai_review.main(["record", "--reviewer", "pr-agent", "--out", "/tmp/x", "--result", "error"], env={}), 0
            )


class RedactTests(unittest.TestCase):
    def test_token_shapes_and_literal_secrets_are_masked(self):
        env = {"OPENROUTER_API_KEY": "plain-secret-value-123"}
        text = "a %s b github_pat_%s c sk-or-v1-%s d plain-secret-value-123 e Bearer %s" % (
            FAKE_TOKEN,
            "B" * 30,
            "c" * 30,
            "d" * 30,
        )
        masked = ai_review.redact(text, env)
        for leaked in (FAKE_TOKEN, "B" * 30, "c" * 30, "plain-secret-value-123", "d" * 30):
            self.assertNotIn(leaked, masked)
        self.assertIn("***", masked)

    def test_log_lines_are_redacted(self):
        with mock.patch("sys.stderr") as err:
            ai_review.log("token is %s" % FAKE_TOKEN)
        written = "".join(call.args[0] for call in err.write.call_args_list)
        self.assertNotIn(FAKE_TOKEN, written)


class FakeClient:
    """Stands in for the poster's GitHub client. Records writes, serves canned reads."""

    def __init__(self, token, pr=None, comments=None, login="bot"):
        self.pr = pr or {
            "state": "open",
            "title": "feat",
            "labels": [],
            "head": {"repo": {"full_name": "acme/widgets"}},
        }
        self.comments, self.login, self.writes = comments or [], login, []

    def call(self, method, path, body=None):
        if method == "GET" and path.endswith("/pulls/7"):
            return 200, self.pr
        if method == "GET" and path == "/user":
            return 200, {"login": self.login}
        if method in ("POST", "PATCH"):
            self.writes.append((method, path, body))
            return (201 if method == "POST" else 200), {}
        return 404, None

    def pages(self, path):
        return self.comments


class PosterTests(unittest.TestCase):
    def run_poster(self, files, env_over=None, **client_kwargs):
        env = {
            "ADMIN_GITHUB_TOKEN": FAKE_TOKEN,
            "CIRCLE_PROJECT_USERNAME": "acme",
            "CIRCLE_PROJECT_REPONAME": "widgets",
            "CIRCLE_PULL_REQUEST": "https://github.com/acme/widgets/pull/7",
        }
        env.update(env_over or {})
        client = FakeClient(FAKE_TOKEN, **client_kwargs)
        with tempfile.TemporaryDirectory() as tmp:
            for name, content in files.items():
                (Path(tmp) / name).write_text(
                    content if isinstance(content, str) else json.dumps(content), encoding="utf-8"
                )
            with mock.patch.object(POSTER, "IN_DIR", tmp), mock.patch.object(
                POSTER, "Client", lambda token: client
            ), mock.patch.dict(os.environ, env, clear=True):
                self.assertEqual(POSTER.main(), 0)
        return client

    META = {"result": "reviewed", "sha": "a" * 40, "model": "openrouter/m/x", "pr_number": 7, "reason": ""}

    def test_one_sticky_comment_per_reviewer_with_identity(self):
        client = self.run_poster(
            {
                "pr-agent.md": "## Guide\nfine",
                "pr-agent.meta.json": self.META,
                "openhands.md": "No material findings.",
                "openhands.meta.json": self.META,
            }
        )
        self.assertEqual([w[0] for w in client.writes], ["POST", "POST"])
        bodies = [w[2]["body"] for w in client.writes]
        self.assertIn("<!-- revvel-ai-review:pr-agent -->", bodies[0])
        self.assertIn("<!-- revvel-ai-review:openhands -->", bodies[1])
        for body in bodies:
            self.assertIn("**TriageChief:**", body)
            self.assertTrue(body.rstrip().endswith("— TriageChief"))
            self.assertIn("not an approval", body)

    def test_updates_its_own_sticky_comment_and_ignores_a_forged_one(self):
        marker = "<!-- revvel-ai-review:pr-agent -->\nold"
        comments = [
            {"id": 1, "body": marker, "user": {"login": "mallory"}},
            {"id": 2, "body": marker, "user": {"login": "bot"}},
        ]
        client = self.run_poster({"pr-agent.md": "new", "pr-agent.meta.json": self.META}, comments=comments)
        self.assertEqual(client.writes[0][:2], ("PATCH", "/repos/acme/widgets/issues/comments/2"))

    def test_llm_output_is_text_only(self):
        hostile = (
            "## Review\n@everyone look ![x](http://evil/p.png?d=1) <script>alert(1)</script> <img src=x>\n"
            "<!-- revvel-ai-review:openhands --> <details><summary>ok</summary><table><tr><td>cell</td></tr></table>"
            "</details> key sk-or-v1-%s and %s\n" % ("z" * 30, FAKE_TOKEN)
        )
        client = self.run_poster({"openhands.md": hostile, "openhands.meta.json": self.META})
        body = client.writes[0][2]["body"]
        self.assertNotIn("<script", body)
        self.assertNotIn("<img", body)
        self.assertNotIn("evil/p.png", body)
        self.assertNotIn("@everyone", body)
        self.assertNotIn("z" * 30, body)
        self.assertNotIn(FAKE_TOKEN, body)
        self.assertEqual(body.count("<!-- revvel-ai-review:openhands -->"), 1)  # the forged marker was neutralized
        self.assertIn("<details>", body)
        self.assertIn("<td>cell</td>", body)

    def test_output_is_size_capped(self):
        client = self.run_poster({"pr-agent.md": "x" * 100000, "pr-agent.meta.json": self.META})
        self.assertLess(len(client.writes[0][2]["body"]), POSTER.MAX_BODY_CHARS + 1500)
        self.assertIn("cut at", client.writes[0][2]["body"])

    def test_hostile_meta_is_sanitized(self):
        meta = {
            "result": "approved!",
            "sha": "<script>",
            "model": "x y\n<b>",
            "pr_number": "7",
            "reason": "ok <b>bold</b> @x",
            "size_skip": "yes",
        }
        clean = POSTER.clean_meta(meta)
        self.assertEqual(clean["result"], "error")
        self.assertEqual((clean["sha"], clean["model"], clean["pr_number"], clean["size_skip"]), ("", "", 0, False))
        self.assertNotIn("<", clean["reason"])
        self.assertNotIn("@", clean["reason"])
        self.assertEqual(POSTER.clean_meta("not a dict")["result"], "error")

    def test_quiet_skip_posts_nothing_but_size_skip_and_error_do(self):
        skipped = dict(self.META, result="skipped", reason="spend gate closed")
        client = self.run_poster({"pr-agent.md": "", "pr-agent.meta.json": skipped})
        self.assertEqual(client.writes, [])
        big = dict(skipped, size_skip=True, reason="diff too large: 90 files")
        client = self.run_poster({"pr-agent.md": "", "pr-agent.meta.json": big})
        self.assertIn("diff too large", client.writes[0][2]["body"])
        client = self.run_poster({"openhands.md": "", "openhands.meta.json": dict(self.META, result="error")})
        self.assertIn("No review was produced", client.writes[0][2]["body"])

    def test_nothing_is_posted_when_it_should_not_be(self):
        files = {"pr-agent.md": "x", "pr-agent.meta.json": self.META}
        # no token (forked PR, or context not attached): clean exit, no client calls
        client = self.run_poster(files, {"ADMIN_GITHUB_TOKEN": ""})
        self.assertEqual(client.writes, [])
        # CircleCI fork variables
        self.assertEqual(self.run_poster(files, {"CIRCLE_PR_USERNAME": "evil"}).writes, [])
        # no PR number
        self.assertEqual(self.run_poster(files, {"CIRCLE_PULL_REQUEST": ""}).writes, [])
        # closed, forked head, skip label, skip title
        for pr in (
            {"state": "closed"},
            {"state": "open", "head": {"repo": {"full_name": "evil/widgets"}}},
            {"state": "open", "labels": [{"name": "skip-ai-review"}]},
            {"state": "open", "title": "x [skip-ai-review]"},
        ):
            self.assertEqual(self.run_poster(files, pr=pr).writes, [], pr)
        # analysis output for a different PR
        self.assertEqual(
            self.run_poster({"pr-agent.md": "x", "pr-agent.meta.json": dict(self.META, pr_number=9)}).writes, []
        )
        # no workspace files at all
        self.assertEqual(self.run_poster({}).writes, [])

    def test_the_poster_is_self_contained_and_never_runs_commands(self):
        source = YML.read_text(encoding="utf-8")
        start = source.index("AI_REVIEW_POSTER: |")
        end = source.index("command: python3 -c", start)
        poster = source[start:end]
        for forbidden in ("subprocess", "os.system", "eval(", "exec(", "import git", "checkout", "pip install"):
            self.assertNotIn(forbidden, poster)


class PosterClientTests(unittest.TestCase):
    def test_client_sends_the_token_only_in_the_header_and_maps_errors(self):
        seen = {}

        class Resp:
            status = 200

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self):
                return b"[]"

        def fake_urlopen(req, timeout=0):
            seen["auth"] = req.get_header("Authorization")
            seen["url"] = req.full_url
            seen["data"] = req.data
            return Resp()

        client = POSTER.Client(FAKE_TOKEN)
        with mock.patch.object(POSTER.urllib.request, "urlopen", fake_urlopen):
            status, data = client.call("POST", "/repos/a/b/issues/1/comments", {"body": "hi"})
        self.assertEqual((status, data), (200, []))
        self.assertEqual(seen["auth"], "Bearer " + FAKE_TOKEN)
        self.assertNotIn(FAKE_TOKEN, seen["url"] + seen["data"].decode())
        err = POSTER.urllib.error.HTTPError("u", 403, "no", {}, None)
        with mock.patch.object(POSTER.urllib.request, "urlopen", side_effect=err):
            self.assertEqual(client.call("GET", "/x"), (403, None))
        with mock.patch.object(POSTER.urllib.request, "urlopen", side_effect=OSError("down")):
            self.assertEqual(client.call("GET", "/x"), (0, None))


class JobGraphTests(unittest.TestCase):
    def setUp(self):
        self.text = YML.read_text(encoding="utf-8")
        try:
            import yaml
        except ImportError:
            self.config = None
        else:
            self.config = yaml.safe_load(self.text)

    def test_graph_contexts_and_requires(self):
        if self.config is None:
            self.skipTest("PyYAML not installed")
        self.assertEqual(set(self.config["jobs"]), {"pr-agent-review", "openhands-review", "post-review-comments"})
        entries = {next(iter(item)): item[next(iter(item))] for item in self.config["workflows"]["ai-review"]["jobs"]}
        self.assertEqual(entries["pr-agent-review"]["context"], ["ai-review-llm"])
        self.assertEqual(entries["openhands-review"]["context"], ["ai-review-llm"])
        self.assertEqual(entries["post-review-comments"]["context"], ["ai-review-post"])
        self.assertEqual(sorted(entries["post-review-comments"]["requires"]), ["openhands-review", "pr-agent-review"])
        self.assertNotIn("requires", entries["pr-agent-review"])

    def test_post_job_never_checks_out_code(self):
        if self.config is None:
            self.skipTest("PyYAML not installed")
        steps = self.config["jobs"]["post-review-comments"]["steps"]
        self.assertEqual([next(iter(s)) if isinstance(s, dict) else s for s in steps], ["attach_workspace", "run"])
        self.assertNotIn("checkout", json.dumps(steps))
        for job in ("pr-agent-review", "openhands-review"):
            self.assertIn("analyze", json.dumps(self.config["jobs"][job]))
        analyze = json.dumps(self.config["commands"]["analyze"])
        self.assertIn("checkout", analyze)
        self.assertIn("persist_to_workspace", analyze)

    def test_only_the_post_job_names_the_write_token(self):
        code_lines = [line for line in self.text.splitlines() if not line.lstrip().startswith("#")]
        analysis = "\n".join(
            code_lines[: next(i for i, line in enumerate(code_lines) if "post-review-comments:" in line)]
        )
        self.assertNotIn("ADMIN_GITHUB_TOKEN", analysis)
        for name in ("run-pr-agent.sh", "run-openhands.sh"):
            script = (SCRIPTS / name).read_text(encoding="utf-8")
            live = [
                line
                for line in script.splitlines()
                if "ADMIN_GITHUB_TOKEN" in line and not line.lstrip().startswith("#")
            ]
            self.assertTrue(all(line.startswith("unset ") for line in live), live)
            self.assertIn("unset ADMIN_GITHUB_TOKEN", script)
            # the reviewer runs with a minimal environment: env -i, or the fleet runner's explicit env dict
            self.assertTrue("env -i" in script or "ai_review_fleet.py" in script)
        glue = (ROOT / "scripts/ai_review.py").read_text(encoding="utf-8")
        self.assertNotIn('Authorization", "Bearer " + env', glue)
        agent = (SCRIPTS / "openhands_review.py").read_text(encoding="utf-8")
        self.assertIn("ADMIN_GITHUB_TOKEN", agent)  # scrubbed from the agent's environment
        self.assertIn("os.environ.pop(name, None)", agent)

    def test_triggers_are_documented_for_auto_and_real_time(self):
        header = "\n".join(line for line in self.text.splitlines() if line.startswith("#"))
        for needle in ("PR opened", "run-ci", "ai-review-llm", "ai-review-post"):
            self.assertIn(needle, header + self.text)


class NoEchoOfSecretsTests(unittest.TestCase):
    """Nothing in the config or scripts may turn on shell tracing or dump or echo environment values."""

    FILES = (
        [YML]
        + sorted(p for p in SCRIPTS.glob("*") if p.is_file())
        + [ROOT / "scripts/ai_review.py", ROOT / "scripts/ai_review_fleet.py"]
    )
    PATTERNS = {
        "set -x": re.compile(r"\bset\s+(-[a-zA-Z]*x|[+-]o\s+xtrace)"),
        "printenv": re.compile(r"\bprintenv\b"),
        "env dump": re.compile(r"(^|[;&|]|command:)\s*env\s*($|[|>;&])"),
        "export -p / declare -x": re.compile(r"\b(export\s+-p|declare\s+-x|declare\s+-p)\b"),
        "echo secret var": re.compile(r"\b(echo|printf)\b[^\n]*\$\{?\w*(TOKEN|KEY|SECRET|PASSWORD)\b"),
        "python env dump": re.compile(r"(print|json\.dump|pprint)\([^\n]*os\.environ\s*[,)]"),
        "bash -x": re.compile(r"\bbash\s+-[a-z]*x"),
    }

    def live_lines(self, path):
        for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            if not line.lstrip().startswith("#"):
                yield number, line

    def test_no_tracing_or_env_dumps_or_secret_echo(self):
        hits = []
        for path in self.FILES:
            for number, line in self.live_lines(path):
                for label, pattern in self.PATTERNS.items():
                    if pattern.search(line):
                        hits.append("%s:%d %s: %s" % (path.name, number, label, line.strip()))
        self.assertEqual(hits, [])

    def test_the_checker_itself_catches_bad_lines(self):
        for bad in (
            "set -x",
            "  set -euxo pipefail",
            "printenv",
            "env | sort",
            'echo "$OPENROUTER_API_KEY"',
            "echo ${ADMIN_GITHUB_TOKEN}",
            "bash -x script.sh",
            "declare -x",
            "print(os.environ)",
        ):
            self.assertTrue(any(p.search(bad) for p in self.PATTERNS.values()), bad)
        for fine in (
            'env -i PATH="$PATH" python3',
            "set -uo pipefail",
            "unset ADMIN_GITHUB_TOKEN",
            'echo "Running PR-Agent"',
            "export AI_REVIEW_X=1",
        ):
            self.assertFalse(any(p.search(fine) for p in self.PATTERNS.values()), fine)


class ScriptTests(unittest.TestCase):
    def run_script(self, name, extra_env):
        env = {"PATH": os.environ["PATH"], "HOME": tempfile.gettempdir()}
        env.update(extra_env)
        out = tempfile.mkdtemp()
        env["AI_REVIEW_OUT_DIR"] = out
        result = subprocess.run(
            ["bash", str(SCRIPTS / name)],
            env=env,
            capture_output=True,
            text=True,
            check=False,
            cwd=tempfile.gettempdir(),
        )
        return result, out

    def test_scripts_parse(self):
        for path in SCRIPTS.glob("*.sh"):
            self.assertEqual(subprocess.run(["bash", "-n", str(path)], check=False).returncode, 0, path.name)

    def test_analysis_scripts_skip_cleanly_and_write_workspace_files(self):
        cases = {
            "gate closed": {},
            "forked PR": dict(BASE_ENV, CIRCLE_PR_USERNAME="evil", ADMIN_GITHUB_TOKEN=FAKE_TOKEN),
            "secrets missing": {k: v for k, v in BASE_ENV.items() if k != "OPENROUTER_API_KEY"},
        }
        for name in ("run-pr-agent.sh", "run-openhands.sh"):
            reviewer = name.replace("run-", "").replace(".sh", "")
            for label, env in cases.items():
                result, out = self.run_script(name, env)
                self.assertEqual(result.returncode, 0, "%s %s: %s" % (name, label, result.stderr))
                self.assertIn("skipped", result.stdout, label)
                meta = json.loads(Path(out, reviewer + ".meta.json").read_text(encoding="utf-8"))
                self.assertEqual(meta["result"], "skipped")
                self.assertTrue(Path(out, reviewer + ".md").exists())
                self.assertNotIn(FAKE_TOKEN, result.stdout + result.stderr)

    def test_spend_caps_and_model_are_set(self):
        pr_agent = (SCRIPTS / "run-pr-agent.sh").read_text(encoding="utf-8")
        self.assertIn("openrouter/deepseek/deepseek-v4.1-flash", pr_agent)
        self.assertIn("AI_REVIEW_MAX_TOKENS", pr_agent)
        self.assertIn("--diff-file", pr_agent)
        self.assertNotIn("--pr_url", pr_agent)
        openhands = (SCRIPTS / "run-openhands.sh").read_text(encoding="utf-8")
        self.assertIn("https://openrouter.ai/api/v1", openhands)
        self.assertIn("AI_REVIEW_MAX_ITERATIONS", openhands)
        self.assertIn("AI_REVIEW_MAX_BUDGET_USD", openhands)

    def test_bootstrap_refuses_a_moving_ref(self):
        env = {"PATH": os.environ["PATH"], "REVVEL_STANDARDS_SHA": "main"}
        result = subprocess.run(
            ["bash", str(SCRIPTS / "bootstrap.sh"), "pr-agent"], env=env, capture_output=True, text=True, check=False
        )
        self.assertEqual(result.returncode, 0)
        self.assertIn("40-character", result.stdout)

    def test_adopt_snippet_pins_a_sha_and_keeps_the_poster(self):
        sha = "b" * 40
        result = subprocess.run(
            ["bash", str(SCRIPTS / "print-adopt-snippet.sh"), sha], capture_output=True, text=True, check=False
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('REVVEL_STANDARDS_SHA: "%s"' % sha, result.stdout)
        self.assertIn("bootstrap.sh", result.stdout)
        self.assertIn("AI_REVIEW_POSTER", result.stdout)


class OptionalEndToEndTests(unittest.TestCase):
    """Runs the real reviewers against a local fake OpenRouter. Skipped unless the interpreters are provided:
    AI_REVIEW_E2E_PR_AGENT_PYTHON (has pr-agent) and AI_REVIEW_E2E_OPENHANDS_PYTHON (has openhands-sdk)."""

    def serve(self, reply):
        from http.server import BaseHTTPRequestHandler, HTTPServer
        import threading

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                self.rfile.read(int(self.headers.get("Content-Length", 0)))
                payload = json.dumps(
                    {
                        "id": "x",
                        "object": "chat.completion",
                        "created": 0,
                        "model": "fake",
                        "choices": [
                            {"index": 0, "finish_reason": "stop", "message": {"role": "assistant", "content": reply}}
                        ],
                        "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
                    }
                ).encode()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)

            def log_message(self, *args):
                pass

        server = HTTPServer(("127.0.0.1", 0), Handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.shutdown)
        return "http://127.0.0.1:%d/api/v1" % server.server_address[1]

    def run_reviewer(self, script, extra_env, reply):
        with tempfile.TemporaryDirectory() as tmp:
            repo = RepoFixture(tmp)
            out = Path(tmp) / "out"
            env = {
                "PATH": os.environ["PATH"],
                "HOME": tmp,
                "AI_REVIEW_OUT_DIR": str(out),
                "ADMIN_GITHUB_TOKEN": FAKE_TOKEN,
                "OPENROUTER_API_KEY": "sk-or-v1-" + "f" * 24,
            }
            env.update({k: v for k, v in BASE_ENV.items() if k != "OPENROUTER_API_KEY"})
            env.update(extra_env(self.serve(reply)))
            result = subprocess.run(
                ["bash", str(SCRIPTS / script)],
                env=env,
                cwd=repo.work,
                capture_output=True,
                text=True,
                check=False,
                timeout=300,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertNotIn(FAKE_TOKEN, result.stdout + result.stderr)
            meta = json.loads((out / (script[4:-3] + ".meta.json")).read_text(encoding="utf-8"))
            fleet_file = out / "pr-agent.fleet.json"
            self.fleet = json.loads(fleet_file.read_text(encoding="utf-8")) if fleet_file.exists() else None
            self.assertEqual(sorted(p.name for p in out.iterdir() if p.suffix == ".diff"), [])  # diffs stay out
            return meta, (out / (script[4:-3] + ".md")).read_text(encoding="utf-8")

    @unittest.skipUnless(os.environ.get("AI_REVIEW_E2E_PR_AGENT_PYTHON"), "needs a pr-agent interpreter")
    def test_pr_agent_offline_end_to_end(self):
        reply = (
            "review:\n  estimated_effort_to_review_[1-5]: |\n    1, trivial\n  relevant_tests: |\n    No\n"
            "  key_issues_to_review:\n    - relevant_file: |\n        a.py\n      issue_header: |\n"
            "        [BLOCKING] command-injection: shell interpolation\n      issue_content: |\n"
            "        Evidence: os.system(x). Recommendation: use a list.\n      start_line: 2\n      end_line: 2\n"
            "  security_concerns: |\n    No\n"
        )
        meta, text = self.run_reviewer(
            "run-pr-agent.sh",
            lambda base: {"PR_AGENT_PYTHON": os.environ["AI_REVIEW_E2E_PR_AGENT_PYTHON"], "OPENROUTER__API_BASE": base},
            reply,
        )
        self.assertEqual(meta["result"], "reviewed")
        self.assertIn("Code Review Fleet", text)
        personas = {p["id"]: p for p in self.fleet["personas"]}
        self.assertEqual(
            [p["id"] for p in self.fleet["personas"]],
            ["security", "workflow", "no_delete_goals", "syntax_final_gate"],
        )
        self.assertTrue(all(p["status"] in ("ran", "partial") for p in personas.values()))
        security = personas["security"]["findings"][0]
        self.assertEqual(
            (security["severity"], security["rule"], security["scope"]), ("blocking", "command-injection", "a.py")
        )
        self.assertEqual(personas["workflow"]["findings"][0]["severity"], "advisory")  # no blocking authority

    @unittest.skipUnless(os.environ.get("AI_REVIEW_E2E_OPENHANDS_PYTHON"), "needs an openhands-sdk interpreter")
    def test_openhands_offline_end_to_end(self):
        meta, text = self.run_reviewer(
            "run-openhands.sh",
            lambda base: {
                "AI_REVIEW_TEST_PYTHON": os.environ["AI_REVIEW_E2E_OPENHANDS_PYTHON"],
                "AI_REVIEW_LLM_BASE_URL": base,
            },
            "No material findings.",
        )
        self.assertEqual(meta["result"], "reviewed")
        self.assertIn("No material findings", text)


if __name__ == "__main__":
    unittest.main()
