#!/usr/bin/env python3
"""WR / PR Control Plane MCP server for revvel-standards.

This server provides a concrete home for the blueprint architecture inside the
existing revvel-standards conventions:

- GitHub issue intake remains the trigger surface.
- Jules / OpenRouter remain current workflow actors.
- Composio / Firecrawl / Tavily / Obot are modeled as the next control-plane layer.
- FastMCP is the server framework when installed.

The module includes a tiny compatibility shim so the file can still be imported
in lightweight environments that have not installed FastMCP yet. When FastMCP
is present, `mcp.run()` exposes the tools over stdio like any other MCP server.

Known v0.1.0 trade-offs (deliberate, tracked for v0.2.0):

- Integration detection uses a permissive substring match against
  ``PROVIDER_TOOLKITS`` (e.g. the literal string ``"github"`` will match in
  almost any WR body since GitHub URLs are common). The match is intentionally
  lossy on the side of false positives because ``requested_integrations`` is an
  informational signal only -- it does not flip ``required`` flags in the
  credential matrix. A stop-word / URL-host-aware tokenizer is a v0.2.0 task.
- ``_github_get`` issues unpaginated requests against the GitHub REST API. The
  default page size is 30 comments. ``[WR]`` issues with more than 30 comments
  will only have their first page inspected by the signal collector. This is
  acceptable for triage/intake but will be replaced with Composio's GitHub
  toolkit (which handles pagination + per-user OAuth) when that wires in.
- ``ControlPlaneConfig.from_env`` is intentionally not memoised: tools are
  individually importable for the regression test suite, and per-call env
  reads keep the surface trivially auditable. Process-wide caching will land
  when Composio is wired in, so we share one code path between env reads and
  OAuth refresh.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from typing import Callable
from urllib import error, request

try:
    from fastmcp import FastMCP
except ImportError:  # pragma: no cover - compatibility path for local smoke tests

    @dataclass(frozen=True)
    class _ShimTool:
        name: str

    @dataclass(frozen=True)
    class _ShimResource:
        uri: str

    class FastMCP:  # type: ignore[override]
        """Minimal compatibility shim for import-time use without FastMCP.

        Provides list_tools() and list_resources() as async methods so that
        the test suite can introspect registered tools/resources without
        requiring a real FastMCP install in CI.
        """

        def __init__(self, name: str, instructions: str):
            self.name = name
            self.instructions = instructions
            self._tools: dict[str, Callable[..., object]] = {}
            self._resources: dict[str, Callable[..., object]] = {}

        def tool(self, fn: Callable[..., object] | None = None):
            def decorator(func: Callable[..., object]) -> Callable[..., object]:
                self._tools[func.__name__] = func
                return func

            return decorator(fn) if fn else decorator

        def resource(self, uri: str):
            def decorator(func: Callable[..., object]) -> Callable[..., object]:
                self._resources[uri] = func
                return func

            return decorator

        # FastMCP's introspection API, mirrored so the regression suite can
        # enumerate the registered surface without installing FastMCP. Both are
        # coroutines returning objects exposing `.name` / `.uri`, matching what
        # the real client awaits. Define each exactly once: Python keeps only
        # the last definition, so a stray duplicate reading a stale attribute
        # name breaks introspection with no import-time error.
        async def list_tools(self) -> list["_ShimTool"]:
            return [_ShimTool(name=name) for name in self._tools]

        async def list_resources(self) -> list["_ShimResource"]:
            return [_ShimResource(uri=uri) for uri in self._resources]

        def run(self) -> None:
            raise RuntimeError(
                "FastMCP is not installed. Install dependencies in "
                "mcp-servers/wr-control-plane/ to run this MCP server over stdio."
            )


mcp = FastMCP(
    name="WR / PR Control Plane",
    instructions=(
        "Use this server to inspect Work Request issue context, determine whether "
        "the repo is ready for Composio / Firecrawl / Obot integration, and build "
        "structured packets for the WR → research → code → PR flow."
    ),
)


PROVIDER_TOOLKITS: dict[str, tuple[str, ...]] = {
    "github": ("COMPOSIO_API_KEY",),
    "slack": ("COMPOSIO_API_KEY",),
    "notion": ("COMPOSIO_API_KEY",),
    "linear": ("COMPOSIO_API_KEY",),
    "stripe": ("COMPOSIO_API_KEY",),
    "supabase": ("COMPOSIO_API_KEY",),
    "firebase": ("COMPOSIO_API_KEY",),
}

DEFAULT_ALLOWED_HOSTS = (
    "api.github.com,github.com,openrouter.ai,api.anthropic.com,"
    "api.firecrawl.dev,api.tavily.com"
)

URL_RE = re.compile(r"https?://[^\s)\]>\"']+")
PDF_RE = re.compile(r"\.pdf($|\?)", re.IGNORECASE)
WR_RESEARCH_RE = re.compile(r"Research Findings:", re.IGNORECASE)


@dataclass(frozen=True)
class ControlPlaneConfig:
    github_token: str
    openrouter_api_key: str
    anthropic_api_key: str
    jules_api_key: str
    composio_api_key: str
    firecrawl_api_key: str
    tavily_api_key: str
    crewai_api_key: str
    obot_base_url: str
    obot_idp_config: str
    obot_allowed_hosts: str
    default_repo: str

    @classmethod
    def from_env(cls) -> "ControlPlaneConfig":
        return cls(
            github_token=os.getenv("GITHUB_TOKEN", "").strip(),
            openrouter_api_key=os.getenv("OPENROUTER_API_KEY", "").strip(),
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", "").strip(),
            jules_api_key=os.getenv("JULES_API_KEY", "").strip(),
            composio_api_key=os.getenv("COMPOSIO_API_KEY", "").strip(),
            firecrawl_api_key=os.getenv("FIRECRAWL_API_KEY", "").strip(),
            tavily_api_key=os.getenv("TAVILY_API_KEY", "").strip(),
            crewai_api_key=os.getenv("CREWAI_API_KEY", "").strip(),
            obot_base_url=os.getenv("OBOT_BASE_URL", "").strip(),
            obot_idp_config=os.getenv("OBOT_IDP_CONFIG", "").strip(),
            obot_allowed_hosts=os.getenv("OBOT_ALLOWED_HOSTS", DEFAULT_ALLOWED_HOSTS).strip(),
            default_repo=os.getenv("WR_DEFAULT_REPO", "midnghtsapphire/revvel-standards").strip(),
        )


@dataclass(frozen=True)
class IssueSignalSet:
    urls: list[str]
    pdf_urls: list[str]
    comments_count: int
    has_research_findings: bool
    requested_integrations: list[str]


class GitHubAPIError(RuntimeError):
    pass


def _split_repo(repo: str) -> tuple[str, str]:
    owner, sep, name = repo.partition("/")
    if not owner or not sep or not name:
        raise ValueError(f"Repository must be owner/repo, got: {repo}")
    return owner, name


def _github_get(repo: str, endpoint: str) -> dict | list:
    cfg = ControlPlaneConfig.from_env()
    if not cfg.github_token:
        raise GitHubAPIError("GITHUB_TOKEN is required to fetch GitHub issue context.")

    owner, name = _split_repo(repo)
    url = f"https://api.github.com/repos/{owner}/{name}/{endpoint.lstrip('/')}"
    req = request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {cfg.github_token}",
            "User-Agent": "wr-control-plane-mcp",
            "X-GitHub-Api-Version": "2022-11-28",
        },
    )
    try:
        with request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:  # pragma: no cover - depends on external API
        detail = exc.read().decode("utf-8", errors="replace")
        raise GitHubAPIError(f"GitHub API HTTP {exc.code}: {detail[:400]}") from exc
    except error.URLError as exc:  # pragma: no cover - depends on external API
        raise GitHubAPIError(f"GitHub API network error: {exc.reason}") from exc


def _extract_urls(text: str) -> list[str]:
    seen: set[str] = set()
    urls: list[str] = []
    for match in URL_RE.findall(text or ""):
        clean = match.rstrip(".,")
        if clean not in seen:
            seen.add(clean)
            urls.append(clean)
    return urls


def _detect_requested_integrations(text: str) -> list[str]:
    lowered = (text or "").lower()
    found: list[str] = []
    for provider in PROVIDER_TOOLKITS:
        if provider in lowered:
            found.append(provider)
    return found


def _collect_issue_signals(issue: dict, comments: list[dict]) -> IssueSignalSet:
    comment_bodies = [str(comment.get("body") or "") for comment in comments]
    full_text = "\n\n".join([str(issue.get("title") or ""), str(issue.get("body") or ""), *comment_bodies])
    urls = _extract_urls(full_text)
    pdf_urls = [url for url in urls if PDF_RE.search(url)]
    requested_integrations = _detect_requested_integrations(full_text)
    return IssueSignalSet(
        urls=urls,
        pdf_urls=pdf_urls,
        comments_count=len(comments),
        has_research_findings=any(WR_RESEARCH_RE.search(body) for body in comment_bodies),
        requested_integrations=requested_integrations,
    )


def _credential_matrix(signals: IssueSignalSet) -> list[dict[str, object]]:
    cfg = ControlPlaneConfig.from_env()
    matrix = [
        {
            "secret": "GITHUB_TOKEN",
            "required": True,
            "configured": bool(cfg.github_token),
            "reason": "Required to read issue/comment context and post PR/issue updates.",
        },
        {
            "secret": "OPENROUTER_API_KEY",
            "required": True,
            "configured": bool(cfg.openrouter_api_key),
            "reason": "Current repo orchestrator uses OpenRouter for code-generation decisions.",
        },
        {
            "secret": "JULES_API_KEY",
            "required": True,
            "configured": bool(cfg.jules_api_key),
            "reason": "Current WR pipeline uses Jules for the first deep-research pass.",
        },
        {
            "secret": "COMPOSIO_API_KEY",
            "required": True,
            "configured": bool(cfg.composio_api_key),
            "reason": "Needed for the future GitHub tool-router / OAuth passthrough layer.",
        },
        {
            "secret": "FIRECRAWL_API_KEY",
            "required": bool(signals.urls),
            "configured": bool(cfg.firecrawl_api_key),
            "reason": "Recommended when WRs contain docs, APIs, PDFs, or external URLs to research.",
        },
        {
            "secret": "TAVILY_API_KEY",
            "required": bool(signals.urls),
            "configured": bool(cfg.tavily_api_key),
            "reason": (
                "LLM-optimized live web search; pairs with Firecrawl for fast topical "
                "retrieval whenever a WR carries URLs or external research signals."
            ),
        },
        {
            "secret": "CREWAI_API_KEY",
            "required": False,
            "configured": bool(cfg.crewai_api_key),
            "reason": "Used for CrewAI multi-agent orchestration.",
        },
        {
            "secret": "ANTHROPIC_API_KEY",
            "required": True,
            "configured": bool(cfg.anthropic_api_key),
            "reason": "Used for Claude-based reasoning in the blueprint architecture.",
        },
        {
            "secret": "OBOT_BASE_URL",
            "required": True,
            "configured": bool(cfg.obot_base_url),
            "reason": "Governance plane endpoint for RBAC, DLP, and tool-definition control.",
        },
        {
            "secret": "OBOT_IDP_CONFIG",
            "required": True,
            "configured": bool(cfg.obot_idp_config),
            "reason": "Required for per-user identity passthrough via Okta / Entra / other IdP.",
        },
    ]
    return matrix


def _control_plane_readiness(signals: IssueSignalSet) -> dict[str, object]:
    cfg = ControlPlaneConfig.from_env()
    credential_matrix = _credential_matrix(signals)
    required_missing = [
        item["secret"] for item in credential_matrix if item["required"] and not item["configured"]
    ]
    has_firecrawl = bool(cfg.firecrawl_api_key)
    has_tavily = bool(cfg.tavily_api_key)
    if signals.pdf_urls and has_firecrawl:
        research_mode = "jules-plus-firecrawl-pdf"
    elif signals.urls and has_firecrawl and has_tavily:
        research_mode = "jules-plus-firecrawl-and-tavily"
    elif signals.urls and has_firecrawl:
        research_mode = "firecrawl-agent"
    elif signals.urls and has_tavily:
        research_mode = "tavily-search"
    else:
        research_mode = "jules-only"
    governance_mode = "obot-enforced" if cfg.obot_base_url and cfg.obot_idp_config else "repo-native"
    return {
        "default_repo": cfg.default_repo,
        "research_mode": research_mode,
        "governance_mode": governance_mode,
        "required_missing": required_missing,
        "credential_matrix": credential_matrix,
        "recommended_next_steps": [
            "Provision missing required credentials in Vault / Doppler.",
            "Route GitHub/OAuth actions through Composio once COMPOSIO_API_KEY is available.",
            "Use Firecrawl for deterministic crawl/scrape/PDF extraction on WR-referenced URLs.",
            "Use Tavily for fast LLM-tuned topical search alongside Firecrawl.",
            "Place Obot in front of MCP traffic before enabling fully autonomous destructive actions.",
        ],
    }


def _issue_packet(issue: dict, comments: list[dict], repo: str) -> dict[str, object]:
    signals = _collect_issue_signals(issue, comments)
    comments_excerpt = [
        {
            "author": (comment.get("user") or {}).get("login"),
            "body": str(comment.get("body") or "")[:500],
            "created_at": comment.get("created_at"),
        }
        for comment in comments[-5:]
    ]
    return {
        "repo": repo,
        "issue_number": issue.get("number"),
        "title": issue.get("title"),
        "body": str(issue.get("body") or ""),
        "state": issue.get("state"),
        "labels": [label.get("name") for label in issue.get("labels", [])],
        "author": (issue.get("user") or {}).get("login"),
        "urls": signals.urls,
        "pdf_urls": signals.pdf_urls,
        "requested_integrations": signals.requested_integrations,
        "has_research_findings": signals.has_research_findings,
        "recent_comments": comments_excerpt,
        "control_plane_readiness": _control_plane_readiness(signals),
    }


@mcp.tool
def control_plane_status() -> dict[str, object]:
    """Return credential and governance readiness for the WR / PR control plane."""

    empty_signals = IssueSignalSet([], [], 0, False, [])
    cfg = ControlPlaneConfig.from_env()
    return {
        "server": "wr-pr-control-plane",
        "default_repo": cfg.default_repo,
        "allowed_hosts": [host.strip() for host in cfg.obot_allowed_hosts.split(",") if host.strip()],
        "providers": {
            "github": bool(cfg.github_token),
            "openrouter": bool(cfg.openrouter_api_key),
            "anthropic": bool(cfg.anthropic_api_key),
            "jules": bool(cfg.jules_api_key),
            "composio": bool(cfg.composio_api_key),
            "firecrawl": bool(cfg.firecrawl_api_key),
            "tavily": bool(cfg.tavily_api_key),
            "crewai": bool(cfg.crewai_api_key),
            "obot": bool(cfg.obot_base_url),
        },
        "readiness": _control_plane_readiness(empty_signals),
    }


@mcp.tool
def build_wr_issue_packet(issue_number: int, repo: str | None = None) -> dict[str, object]:
    """Fetch a WR issue and return a structured packet for research/orchestration.

    Args:
        issue_number: GitHub issue number in the target repository.
        repo: Optional owner/repo override. Defaults to WR_DEFAULT_REPO.
    """

    cfg = ControlPlaneConfig.from_env()
    target_repo = repo or cfg.default_repo
    issue = _github_get(target_repo, f"issues/{issue_number}")
    comments = _github_get(target_repo, f"issues/{issue_number}/comments")
    if not isinstance(issue, dict) or not isinstance(comments, list):
        raise GitHubAPIError("Unexpected GitHub payload shape while building issue packet.")
    return _issue_packet(issue, comments, target_repo)


@mcp.tool
def render_control_plane_mcp_entry(profile: str = "repo") -> dict[str, object]:
    """Return a ready-to-paste `.mcp.json` entry for the WR / PR control-plane server."""

    if profile not in {"repo", "template"}:
        raise ValueError("profile must be 'repo' or 'template'.")

    args = [
        "run",
        "python",
        "./mcp-servers/wr-control-plane/wr_control_plane/server.py",
    ]
    if profile == "template":
        args = [
            "run",
            "python",
            "${REVVEL_STANDARDS_PATH}/mcp-servers/wr-control-plane/wr_control_plane/server.py",
        ]

    return {
        "wr-pr-control-plane": {
            "command": "uv",
            "args": args,
            "env": {
                "GITHUB_TOKEN": "${GITHUB_TOKEN}",
                "OPENROUTER_API_KEY": "${OPENROUTER_API_KEY}",
                "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
                "JULES_API_KEY": "${JULES_API_KEY}",
                "COMPOSIO_API_KEY": "${COMPOSIO_API_KEY}",
                "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}",
                "TAVILY_API_KEY": "${TAVILY_API_KEY}",
                "CREWAI_API_KEY": "${CREWAI_API_KEY}",
                "OBOT_BASE_URL": "${OBOT_BASE_URL}",
                "OBOT_IDP_CONFIG": "${OBOT_IDP_CONFIG}",
                "OBOT_ALLOWED_HOSTS": "${OBOT_ALLOWED_HOSTS}",
                "WR_DEFAULT_REPO": "${WR_DEFAULT_REPO}"
            }
        }
    }


@mcp.tool
def detect_wr_credential_requirements(issue_number: int, repo: str | None = None) -> dict[str, object]:
    """Return the required credentials and missing providers for a specific WR issue."""

    packet = build_wr_issue_packet(issue_number=issue_number, repo=repo)
    readiness = packet["control_plane_readiness"]
    return {
        "issue_number": packet["issue_number"],
        "repo": packet["repo"],
        "requested_integrations": packet["requested_integrations"],
        "urls": packet["urls"],
        "required_missing": readiness["required_missing"],
        "credential_matrix": readiness["credential_matrix"],
    }


@mcp.resource("data://wr-control-plane/env-schema")
def env_schema() -> dict[str, object]:
    """Return the environment-variable contract for the WR / PR control plane."""

    return {
        "required": [
            "GITHUB_TOKEN",
            "OPENROUTER_API_KEY",
            "ANTHROPIC_API_KEY",
            "JULES_API_KEY",
            "COMPOSIO_API_KEY",
            "OBOT_BASE_URL",
            "OBOT_IDP_CONFIG",
        ],
        "optional": [
            "FIRECRAWL_API_KEY",
            "TAVILY_API_KEY",
            "CREWAI_API_KEY",
            "OBOT_ALLOWED_HOSTS",
            "WR_DEFAULT_REPO",
        ],
        "defaults": {
            "OBOT_ALLOWED_HOSTS": DEFAULT_ALLOWED_HOSTS,
            "WR_DEFAULT_REPO": "midnghtsapphire/revvel-standards",
        },
    }


@mcp.resource("data://wr-control-plane/architecture")
def architecture_summary() -> dict[str, object]:
    """Return the canonical Revvel interpretation of the 2026 WR / PR blueprint."""

    return {
        "trigger": "GitHub Work Request issue ([WR] title prefix)",
        "current_research_layer": ["Jules"],
        "next_research_layer": [
            "Firecrawl /agent",
            "Firecrawl /parse",
            "Tavily /search (LLM-optimized live snippets)",
            "Tavily /extract (clean readable content)",
        ],
        "current_execution_layer": ["OpenRouter Coder workflow"],
        "next_execution_layer": [
            "Composio GitHub toolkit",
            "Composio Firebase toolkit (per-app: Firestore / Functions / Auth)",
            "FastMCP server tools",
        ],
        "governance_layer": ["Obot gateway", "per-user OAuth passthrough", "DLP / allowed-host policy"],
        "review_layer": ["BITO AI"],
        "v0_1_0_trade_offs": [
            "Integration detection is permissive substring match (informational only).",
            "GitHub API responses are unpaginated (~30 comments per WR).",
            "Per-tool env reads are not memoised across invocations.",
        ],
    }


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
