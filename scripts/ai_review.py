#!/usr/bin/env python3
"""Analysis-side glue for the advisory AI reviewers on CircleCI. No GitHub write token, ever.

TriageChief, 2026-11-19 (reworked the same day: analysis jobs hold no GitHub token).

The analysis jobs (pr-agent-review, openhands-review) never post to GitHub. They build the diff from the
CircleCI checkout, run the reviewer, and write markdown plus a small JSON file into a workspace folder. A
separate job, post-review-comments (the only job with ADMIN_GITHUB_TOKEN), posts the markdown as text.
Standard library only. Subcommands:

    prepare --reviewer pr-agent|openhands --out DIR [--work DIR]
        Decide whether to review and, if so, write <work>/<reviewer>.diff (capped), <work>/<reviewer>.files (the
        changed-file inventory) and /tmp/ai-review/<reviewer>.env. DIR gets only the skip meta (workspace files).
        Skips (run=0, clear log line, exit 0) when: spend gate closed, a secret is missing (forked PR or the
        context is not attached), fork PR, not a PR pipeline, skip token in the head commit message, PR closed
        (when the public API says so), base branch not found, diff over the size caps.
        Reads PR facts from the public GitHub API without a token. An optional GITHUB_READ_TOKEN only raises
        the rate limit; it is read here and never passed to a reviewer.
    record --reviewer R --result reviewed|skipped|error [--reason T] [--model M] --out DIR
        Write DIR/<reviewer>.meta.json (and an empty DIR/<reviewer>.md if the reviewer wrote none).
    redact
        Stdin to stdout with anything token-like masked. Used to filter reviewer logs.

Always exits 0: these jobs are advisory and never fail a pipeline.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import shlex
import subprocess
import sys
import urllib.error
import urllib.request

API = "https://api.github.com"
SKIP_TOKENS = ("[skip-review]", "[skip-ai-review]")
SKIP_LABEL = "skip-ai-review"
REVIEWERS = ("pr-agent", "openhands")
OUT_DIR = "/tmp/ai-review"
WORK_DIR = "/tmp/ai-review/work"  # diffs and file lists: scratch, never persisted to the workspace
# Variables that must never reach a reviewer process (the write token lives only in post-review-comments).
GITHUB_TOKEN_VARS = ("ADMIN_GITHUB_TOKEN", "AI_REVIEW_GITHUB_TOKEN", "GITHUB_TOKEN", "GH_TOKEN", "GITHUB_READ_TOKEN")
SECRET_VAR_NAMES = ("OPENROUTER_API_KEY", "LLM_API_KEY", "NOTION_TOKEN") + GITHUB_TOKEN_VARS

DEFAULT_MAX_DIFF_BYTES = 80000
DEFAULT_MAX_FILES = 60
DEFAULT_MAX_CHANGED_LINES = 4000
DEFAULT_EXCLUDES = ("package-lock.json", "yarn.lock", "pnpm-lock.yaml", "poetry.lock", "*.min.js", "*.min.css",
                    "*.lock")

TOKEN_PATTERNS = [
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}"),
    re.compile(r"\bsk-[A-Za-z0-9_-]{16,}"),
    re.compile(r"\bCCIPAT_[A-Za-z0-9_-]{16,}"),
    re.compile(r"\bxox[abprs]-[A-Za-z0-9-]{10,}"),
    re.compile(r"\b(?:secret|ntn)_[A-Za-z0-9]{30,}"),
    re.compile(r"(?i)\bbearer\s+[A-Za-z0-9._~+/=-]{16,}"),
    re.compile(r"(?i)\b(authorization|api[_-]?key|token|password)(\s*[=:]\s*)[\"']?[A-Za-z0-9._~+/=-]{16,}"),
]


def log(msg: str) -> None:
    print("ai-review: " + redact(msg), file=sys.stderr)


def redact(text: str, env=None) -> str:
    """Mask token-like strings and the literal values of known secret variables."""
    text = str(text)
    source = os.environ if env is None else env
    for name in SECRET_VAR_NAMES:
        value = source.get(name, "")
        if len(value) >= 8:
            text = text.replace(value, "***")
    for pattern in TOKEN_PATTERNS:
        text = pattern.sub(lambda m: (m.group(1) + m.group(2) + "***") if m.lastindex == 2 else "***", text)
    return text


# --------------------------------------------------------------------------- environment facts
def env_int(env, name, default):
    try:
        value = int(str(env.get(name, "")).strip() or default)
        return value if value > 0 else default
    except ValueError:
        return default


def repo_from_env(env):
    owner = env.get("CIRCLE_PROJECT_USERNAME", "")
    name = env.get("CIRCLE_PROJECT_REPONAME", "")
    return "%s/%s" % (owner, name) if owner and name else ""


def pr_number_from_env(env):
    for name in ("CIRCLE_PULL_REQUEST", "CI_PULL_REQUEST", "CIRCLE_PULL_REQUESTS"):
        match = re.search(r"/pull/(\d+)", env.get(name, "") or "")
        if match:
            return int(match.group(1))
    return 0


def fork_from_env(env):
    """True when CircleCI says the PR comes from a different repo than the project."""
    user, repo = env.get("CIRCLE_PR_USERNAME", ""), env.get("CIRCLE_PR_REPONAME", "")
    if not (user or repo):
        return False
    return (user.lower(), repo.lower()) != (env.get("CIRCLE_PROJECT_USERNAME", "").lower(),
                                            env.get("CIRCLE_PROJECT_REPONAME", "").lower())


def config_problem(env):
    """Reason string when the job environment is not ready, else empty."""
    if env.get("REVVEL_LLM_ALLOW_CLOUD") != "1":
        return "spend gate closed (REVVEL_LLM_ALLOW_CLOUD is not 1)"
    if not env.get("OPENROUTER_API_KEY"):
        return "OPENROUTER_API_KEY is missing (forked PR, or the ai-review-llm context is not attached)"
    if not repo_from_env(env):
        return "CIRCLE_PROJECT_USERNAME/CIRCLE_PROJECT_REPONAME not set"
    return ""


# --------------------------------------------------------------------------- public API (read only)
def api_get(path, token=""):
    """GET a public GitHub API path. Returns (status, parsed json or None). Never raises."""
    req = urllib.request.Request(API + path)
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("X-GitHub-Api-Version", "2022-11-28")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8") or "null")
    except urllib.error.HTTPError as err:
        return err.code, None
    except (urllib.error.URLError, ValueError, OSError):
        return 0, None


def pr_info(env, repo, number):
    """Optional PR facts from the public API: dict or None (rate limited, private repo, offline)."""
    status, pr = api_get("/repos/%s/pulls/%d" % (repo, number), env.get("GITHUB_READ_TOKEN", ""))
    if status != 200 or not isinstance(pr, dict):
        return None
    return {
        "state": pr.get("state", ""), "draft": bool(pr.get("draft")), "title": pr.get("title") or "",
        "base": (pr.get("base") or {}).get("ref", ""),
        "head_repo": ((pr.get("head") or {}).get("repo") or {}).get("full_name", ""),
        "labels": [(label or {}).get("name", "") for label in pr.get("labels") or []],
    }


def policy_problem(env, repo, number, info):
    """Reason when this PR must not be reviewed, from optional API facts."""
    if not info:
        return ""
    if info["state"] and info["state"] != "open":
        return "PR #%d is not open" % number
    if info["head_repo"] and info["head_repo"].lower() != repo.lower():
        return "fork PR (secrets are never given to fork code)"
    if any(token in info["title"].lower() for token in SKIP_TOKENS):
        return "skip token in PR title"
    if SKIP_LABEL in info["labels"]:
        return "label %s on PR" % SKIP_LABEL
    if info["draft"] and env.get("AI_REVIEW_SKIP_DRAFTS") == "1":
        return "draft PR and AI_REVIEW_SKIP_DRAFTS=1"
    return ""


# --------------------------------------------------------------------------- git (CircleCI checkout)
def git(args, cwd=None, timeout=300):
    """Run git, return (returncode, stdout). The checkout key (not a token) authenticates fetches."""
    try:
        proc = subprocess.run(["git"] + list(args), cwd=cwd, capture_output=True, text=True, timeout=timeout,
                              check=False, env=dict(os.environ, GIT_TERMINAL_PROMPT="0"))
        return proc.returncode, proc.stdout
    except (OSError, subprocess.TimeoutExpired):
        return 1, ""


def fetch_candidates(explicit, cwd):
    """Fetch the candidate base branches. Returns the list of usable origin refs."""
    if git(["rev-parse", "--is-shallow-repository"], cwd)[1].strip() == "true":
        git(["fetch", "--unshallow", "--no-tags", "--quiet", "origin"], cwd)
    if explicit:
        git(["fetch", "--no-tags", "--quiet", "origin",
             "+refs/heads/%s:refs/remotes/origin/%s" % (explicit, explicit)], cwd)
        return ["origin/" + explicit]
    git(["fetch", "--no-tags", "--quiet", "origin", "+refs/heads/main:refs/remotes/origin/main",
         "+refs/heads/master:refs/remotes/origin/master", "+refs/heads/daily/*:refs/remotes/origin/daily/*"], cwd)
    code, out = git(["for-each-ref", "--sort=-committerdate", "--format=%(refname:short)",
                     "refs/remotes/origin/daily"], cwd)
    refs = out.split()[:5] if code == 0 else []
    for name in ("origin/main", "origin/master"):
        if git(["rev-parse", "--verify", "--quiet", name], cwd)[0] == 0:
            refs.append(name)
    return refs


def nearest_base(refs, cwd):
    """Pick the candidate with the fewest commits between it and HEAD (the branch this PR is based on)."""
    best, best_count = "", None
    for ref in refs:
        code, base = git(["merge-base", ref, "HEAD"], cwd)
        if code != 0 or not base.strip():
            continue
        code, count = git(["rev-list", "--count", "%s..HEAD" % base.strip()], cwd)
        if code == 0 and count.strip().isdigit() and (best_count is None or int(count) < best_count):
            best, best_count = ref, int(count)
    return best


def build_diff(base, cwd, env):
    """Return (diff_text, files, changed_lines) for base...HEAD with lockfiles and minified files excluded."""
    excludes = [e for e in (env.get("AI_REVIEW_EXCLUDE") or ",".join(DEFAULT_EXCLUDES)).split(",") if e.strip()]
    spec = ["--", "."] + [":(exclude,glob)**/%s" % e.strip() for e in excludes] + \
        [":(exclude,glob)%s" % e.strip() for e in excludes]
    rng = "%s...HEAD" % base
    code, stat = git(["diff", "--numstat", "--no-ext-diff", rng] + spec, cwd)
    if code != 0:
        return "", 0, 0
    files = lines = 0
    for row in stat.splitlines():
        parts = row.split("\t")
        files += 1
        lines += sum(int(p) for p in parts[:2] if p.isdigit())
    code, diff = git(["diff", "--no-color", "--no-ext-diff", "--unified=3", rng] + spec, cwd)
    return (diff if code == 0 else ""), files, lines


# --------------------------------------------------------------------------- prepare
def name_status(base, cwd):
    """The changed-file inventory (status, path) for base...HEAD, lockfiles included."""
    code, out = git(["diff", "--name-status", "--no-ext-diff", "%s...HEAD" % base], cwd)
    return out if code == 0 else ""


def decide(env, cwd, out_dir, reviewer):
    """Return (run, reason, facts). Writes out_dir/<reviewer>.diff and .files when run is True."""
    facts = {"size_skip": False, "pr_number": 0, "head_sha": env.get("CIRCLE_SHA1", ""), "base": ""}
    problem = config_problem(env)
    if problem:
        return False, problem, facts
    if fork_from_env(env):
        return False, "fork PR (CIRCLE_PR_USERNAME/CIRCLE_PR_REPONAME differ from the project)", facts
    repo = repo_from_env(env)
    number = pr_number_from_env(env)
    if not number:
        return False, "no pull request for this pipeline (not a PR pipeline)", facts
    facts["pr_number"] = number
    info = pr_info(env, repo, number)
    problem = policy_problem(env, repo, number, info)
    if problem:
        return False, problem, facts
    code, head = git(["rev-parse", "HEAD"], cwd)
    if code != 0:
        return False, "no git checkout found", facts
    facts["head_sha"] = head.strip()
    code, message = git(["log", "-1", "--format=%B"], cwd)
    if any(token in message.lower() for token in SKIP_TOKENS):
        return False, "skip token in the head commit message", facts

    explicit = env.get("AI_REVIEW_BASE_BRANCH") or (info or {}).get("base", "")
    base = nearest_base(fetch_candidates(explicit, cwd), cwd)
    if not base:
        return False, "could not find the base branch in the checkout (set AI_REVIEW_BASE_BRANCH)", facts
    facts["base"] = base
    diff, files, lines = build_diff(base, cwd, env)
    if not diff.strip():
        return False, "empty diff against %s" % base, facts
    max_files = env_int(env, "AI_REVIEW_MAX_FILES", DEFAULT_MAX_FILES)
    max_lines = env_int(env, "AI_REVIEW_MAX_CHANGED_LINES", DEFAULT_MAX_CHANGED_LINES)
    max_bytes = env_int(env, "AI_REVIEW_MAX_DIFF_BYTES", DEFAULT_MAX_DIFF_BYTES)
    if files > max_files or lines > max_lines or len(diff.encode("utf-8", "replace")) > max_bytes:
        facts["size_skip"] = True
        return False, "diff too large: %d files, %d changed lines (caps %d files, %d lines, %d bytes)" % (
            files, lines, max_files, max_lines, max_bytes), facts
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, reviewer + ".diff"), "w", encoding="utf-8") as handle:
        handle.write(diff)
    with open(os.path.join(out_dir, reviewer + ".files"), "w", encoding="utf-8") as handle:
        handle.write(name_status(base, cwd))
    facts.update(files=files, lines=lines, title=(info or {}).get("title", ""))
    return True, "ok", facts


def write_env_file(reviewer, values):
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, reviewer + ".env")
    with open(path, "w", encoding="utf-8") as handle:
        for key, value in values.items():
            handle.write("export %s=%s\n" % (key, shlex.quote(str(value))))
    return path


def write_meta(out_dir, reviewer, result, reason="", model="", facts=None):
    facts = facts or {}
    os.makedirs(out_dir, exist_ok=True)
    meta = {"reviewer": reviewer, "result": result, "reason": str(reason)[:300], "model": str(model)[:80],
            "sha": facts.get("head_sha", ""), "pr_number": int(facts.get("pr_number") or 0),
            "size_skip": bool(facts.get("size_skip"))}
    with open(os.path.join(out_dir, reviewer + ".meta.json"), "w", encoding="utf-8") as handle:
        json.dump(meta, handle, sort_keys=True)
    md = os.path.join(out_dir, reviewer + ".md")
    if not os.path.exists(md):
        open(md, "w", encoding="utf-8").close()
    return meta


def cmd_prepare(args, env):
    try:
        run, reason, facts = decide(env, os.getcwd(), args.work or WORK_DIR, args.reviewer)
    except Exception as err:  # advisory: a bug here must not fail the pipeline
        run, reason, facts = False, "prepare error (%s)" % type(err).__name__, {}
    values = {
        "AI_REVIEW_RUN": "1" if run else "0", "AI_REVIEW_REASON": reason,
        "AI_REVIEW_PR_NUMBER": facts.get("pr_number", 0), "AI_REVIEW_HEAD_SHA": facts.get("head_sha", ""),
        "AI_REVIEW_BASE": facts.get("base", ""), "AI_REVIEW_PR_TITLE": facts.get("title", ""),
        "AI_REVIEW_DIFF_FILE": os.path.join(args.work or WORK_DIR, args.reviewer + ".diff"),
        "AI_REVIEW_FILES_LIST": os.path.join(args.work or WORK_DIR, args.reviewer + ".files"),
        "AI_REVIEW_FILES": facts.get("files", 0), "AI_REVIEW_LINES": facts.get("lines", 0),
    }
    write_env_file(args.reviewer, values)
    if not run:
        write_meta(args.out, args.reviewer, "skipped", reason, "", facts)
    log("%s: run=%s (%s)" % (args.reviewer, values["AI_REVIEW_RUN"], reason))
    return 0


def cmd_record(args, env):
    facts = {"head_sha": env.get("AI_REVIEW_HEAD_SHA", ""), "pr_number": env.get("AI_REVIEW_PR_NUMBER", 0)}
    write_meta(args.out, args.reviewer, args.result, args.reason, args.model, facts)
    log("%s: recorded %s" % (args.reviewer, args.result))
    return 0


def cmd_redact(_args, _env):
    for line in sys.stdin:
        sys.stdout.write(redact(line))
    return 0


# --------------------------------------------------------------------------- main
def main(argv=None, env=None):
    env = dict(os.environ if env is None else env)
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    for name in ("prepare", "record"):
        p = sub.add_parser(name)
        p.add_argument("--reviewer", choices=REVIEWERS, required=True)
        p.add_argument("--out", required=True)
        if name == "prepare":
            p.add_argument("--work", default="")
        if name == "record":
            p.add_argument("--result", choices=("reviewed", "skipped", "error"), required=True)
            p.add_argument("--reason", default="")
            p.add_argument("--model", default="")
    sub.add_parser("redact")
    args = parser.parse_args(argv)
    handler = {"prepare": cmd_prepare, "record": cmd_record, "redact": cmd_redact}[args.cmd]
    try:
        return handler(args, env)
    except Exception as err:  # advisory: never fail the pipeline
        log("%s failed (%s); continuing" % (args.cmd, type(err).__name__))
        return 0


if __name__ == "__main__":
    sys.exit(main())
