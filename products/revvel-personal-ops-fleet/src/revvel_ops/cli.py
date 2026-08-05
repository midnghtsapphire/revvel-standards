"""Revvel Personal Ops Fleet CLI.

Every command is read-only with respect to external services. The only writes
are to the local ``var/`` directory (audit JSONL, plans, inventory).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

from . import inventory as inventory_service
from . import planner
from .audit import AuditLog, verify_chain, verify_dir
from .config import REPO_ROOT, Settings
from .connectors import registry
from .models import AutonomyMode, Disposition, Phase

app = typer.Typer(
    add_completion=False,
    help="Revvel Personal Ops Fleet — plan/dry-run agent operations with policy gating.",
)
console = Console()

DEFAULT_FIXTURE = REPO_ROOT / "fixtures" / "gmail_threads.sample.json"


def _settings() -> Settings:
    return Settings.load()


def _audit(settings: Settings, run_id: str) -> AuditLog:
    dirs = settings.storage.resolved()
    return AuditLog(dirs["audit_dir"], run_id, redact_content=settings.storage.redact_content)


def _mode(value: str | None, settings: Settings) -> AutonomyMode:
    return AutonomyMode(value) if value else settings.policy.autonomy_mode


# --------------------------------------------------------------------------- #


@app.command()
def doctor() -> None:
    """Show effective configuration and safety posture."""
    settings = _settings()
    table = Table(title="Revvel Ops Fleet — doctor", show_lines=False)
    table.add_column("Setting")
    table.add_column("Value")
    table.add_row("autonomy_mode", settings.policy.autonomy_mode.value)
    table.add_row("dry_run_default", str(settings.policy.dry_run_default))
    table.add_row("allow_min_confidence", str(settings.policy.thresholds.allow_min_confidence))
    table.add_row("propose_min_confidence", str(settings.policy.thresholds.propose_min_confidence))
    table.add_row("strict_identity_binding", str(settings.identities.strict_identity_binding))
    table.add_row("allowlisted_identities", ", ".join(settings.identities.allowlisted_identities()) or "(none)")
    table.add_row("default_identity", settings.identities.default_identity or "(none)")
    table.add_row("connectors_registered", str(len(registry.REGISTRY)))
    table.add_row("audit_dir", str(settings.storage.resolved()["audit_dir"]))
    table.add_row("apply_enabled", "false (MVP always refuses apply)")
    console.print(table)


@app.command("identities")
def identities_cmd() -> None:
    """List configured identities and their separated permissions."""
    settings = _settings()
    table = Table(title="OAuth / service account selection policy")
    table.add_column("identity")
    table.add_column("provider")
    table.add_column("allowlisted")
    table.add_column("permissions")
    for entry in settings.identities.identities:
        table.add_row(
            entry.identity,
            entry.provider,
            "yes" if entry.allowlisted else "NO",
            ", ".join(p.value for p in entry.permissions) or "(none)",
        )
    console.print(table)
    console.print(
        "[yellow]Non-allowlisted signed-in identities are denied at rule R020 before any action is scored.[/yellow]"
    )


@app.command("connectors")
def connectors_cmd(as_json: bool = typer.Option(False, "--json")) -> None:
    """Show the connector capability matrix (scopes, gates, rollback)."""
    rows = inventory_service.capability_matrix()
    if as_json:
        console.print_json(json.dumps(rows))
        return
    table = Table(title="Connector capability matrix")
    for col in ("connector", "capability", "perm", "risk", "revers.", "ext", "gate", "avail"):
        table.add_column(col)
    for row in rows:
        table.add_row(
            row["connector"],
            row["capability"],
            row["permission"],
            row["risk_tier"],
            row["reversibility"][:12],
            "yes" if row["externally_visible"] else "no",
            row["approval_gate"],
            row["availability"],
        )
    console.print(table)


@app.command("inventory")
def inventory_cmd(
    demo: bool = typer.Option(True, "--demo/--no-demo", help="Create the labeled sample inventory."),
    out: Path | None = typer.Option(None, "--out", help="Directory for the inventory JSON."),
) -> None:
    """Create a demo inventory of connector state (clearly labeled sample data)."""
    settings = _settings()
    inv = inventory_service.build_demo_inventory(settings)
    out_dir = out or settings.storage.resolved()["inventory_dir"]
    path = inventory_service.write_inventory(inv, Path(out_dir))

    run_id = planner.new_run_id()
    audit = _audit(settings, run_id)
    audit.append(
        "inventory.generated",
        {"inventory_id": inv.inventory_id, "sample_data": True, "connectors": len(inv.connectors)},
        phase=Phase.plan,
    )

    table = Table(title="Connector inventory (SAMPLE — revalidate at runtime)")
    for col in ("connector", "status", "permissions", "identity hint"):
        table.add_column(col)
    for row in inv.connectors:
        table.add_row(
            row.connector,
            row.status,
            ", ".join(p.value for p in row.permissions_granted) or "(none)",
            row.identity_hint or "-",
        )
    console.print(table)
    console.print(f"[green]Wrote[/green] {path}")
    console.print(f"[green]Audit[/green] {audit.path} (head={audit.head_hash[:16]}…)")
    if not demo:
        console.print("[yellow]Live inventory requires runtime revalidation and is not implemented.[/yellow]")


@app.command("plan")
def plan_cmd(
    skill: str = typer.Option("email_cleanup", "--skill"),
    fixture: Path = typer.Option(DEFAULT_FIXTURE, "--fixture", exists=True, readable=True),
    identity: str | None = typer.Option(None, "--identity"),
    mode: str | None = typer.Option(None, "--mode", help="review_everything|safe_automation|policy_automation"),
    out: Path | None = typer.Option(None, "--out"),
) -> None:
    """Build a plan from fixture data. No external calls."""
    settings = _settings()
    if skill != "email_cleanup":
        raise typer.BadParameter(f"unknown skill '{skill}'; only 'email_cleanup' ships in the MVP")
    ident = identity or settings.identities.default_identity
    if not ident:
        raise typer.BadParameter("no identity given and no default_identity configured")

    run_id = planner.new_run_id()
    audit = _audit(settings, run_id)
    plan = planner.load_and_plan(fixture, settings, audit, identity=ident, autonomy_mode=_mode(mode, settings))

    plan_dir = Path(out) if out else settings.storage.resolved()["plan_dir"]
    plan_dir.mkdir(parents=True, exist_ok=True)
    plan_path = plan_dir / f"{plan.plan_id}.json"
    plan_path.write_text(plan.model_dump_json(indent=2), encoding="utf-8")

    _render_plan(plan)
    console.print(f"[green]Plan[/green] {plan_path}")
    console.print(f"[green]Audit[/green] {audit.path} ({audit.count} events, head={audit.head_hash[:16]}…)")


@app.command("dry-run")
def dry_run_cmd(
    fixture: Path = typer.Option(DEFAULT_FIXTURE, "--fixture", exists=True, readable=True),
    identity: str | None = typer.Option(None, "--identity"),
    mode: str | None = typer.Option(None, "--mode"),
) -> None:
    """Plan then simulate. Guaranteed zero external service calls."""
    settings = _settings()
    ident = identity or settings.identities.default_identity
    if not ident:
        raise typer.BadParameter("no identity given and no default_identity configured")

    run_id = planner.new_run_id()
    audit = _audit(settings, run_id)
    plan = planner.load_and_plan(fixture, settings, audit, identity=ident, autonomy_mode=_mode(mode, settings))
    report = planner.dry_run(plan, audit)

    _render_plan(plan)
    console.print(
        f"[bold]dry-run[/bold] simulated={report['simulated']} "
        f"skipped_denied={report['skipped_denied']} network_calls={report['network_calls']}"
    )
    console.print(f"[green]Audit[/green] {audit.path} ({audit.count} events)")
    verification = verify_chain(audit.path)
    console.print(f"[green]Chain[/green] ok={verification['ok']} events={verification['events']}")


@app.command("apply")
def apply_cmd(
    plan_file: Path = typer.Option(..., "--plan", exists=True, readable=True),
    confirm: bool = typer.Option(False, "--confirm"),
) -> None:
    """Refused by design in the MVP. Records the refusal in the audit chain."""
    settings = _settings()
    if not confirm or not os.getenv("REVVEL_ALLOW_APPLY"):
        console.print(
            "[red]apply blocked:[/red] requires --confirm AND REVVEL_ALLOW_APPLY=1, and even then the "
            "MVP has no live adapters."
        )
        raise typer.Exit(code=2)
    from .models import Plan

    plan = Plan.model_validate_json(Path(plan_file).read_text(encoding="utf-8"))
    audit = _audit(settings, plan.run_id)
    try:
        planner.apply(plan, audit)
    except planner.ApplyRefused as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(code=3)


@app.command("verify-audit")
def verify_audit_cmd(path: Path | None = typer.Option(None, "--path")) -> None:
    """Verify the SHA-256 hash chain of one file or the whole audit directory."""
    settings = _settings()
    reports = [verify_chain(path)] if path else verify_dir(settings.storage.resolved()["audit_dir"])
    if not reports:
        console.print("[yellow]no audit files found[/yellow]")
        raise typer.Exit(code=0)
    failures = 0
    for rep in reports:
        status = "[green]OK[/green]" if rep["ok"] else "[red]BROKEN[/red]"
        console.print(f"{status} {rep['path']} events={rep['events']}")
        for err in rep["errors"]:
            failures += 1
            console.print(f"   [red]{err}[/red]")
    raise typer.Exit(code=1 if failures else 0)


@app.command("demo")
def demo_cmd() -> None:
    """End-to-end offline demo: inventory + plan + dry-run + chain verification."""
    inventory_cmd(demo=True, out=None)
    console.rule("dry run")
    dry_run_cmd(fixture=DEFAULT_FIXTURE, identity=None, mode=None)


def _render_plan(plan) -> None:  # noqa: ANN001
    table = Table(title=f"Plan {plan.plan_id} — mode={plan.autonomy_mode.value}")
    for col in ("capability", "perm", "target", "conf", "disposition", "rollback"):
        table.add_column(col)
    for item in plan.items:
        color = {
            Disposition.allow: "green",
            Disposition.propose: "cyan",
            Disposition.require_approval: "yellow",
            Disposition.deny: "red",
        }[item.decision.disposition]
        table.add_row(
            item.proposal.capability,
            item.proposal.permission.value,
            item.proposal.target_ref,
            str(item.decision.confidence),
            f"[{color}]{item.decision.disposition.value}[/{color}]",
            item.proposal.rollback_ref or "-",
        )
    console.print(table)
    console.print(f"[bold]dispositions[/bold] {plan.counts()}")


def main() -> None:
    app()


if __name__ == "__main__":
    main()
