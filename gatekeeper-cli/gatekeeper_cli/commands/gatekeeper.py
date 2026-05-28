"""Gatekeeper operations commands."""

import subprocess

import click
from rich.console import Console
from rich.table import Table

from ..api import DopplerAPI, GitHubAPI
from ..config import config

console = Console()


@click.command()
def status():
    """Check Gatekeeper system status."""
    console.print("[cyan]Checking Gatekeeper status...[/cyan]\n")

    # Check Doppler
    doppler_token = config.get_doppler_token()
    if doppler_token:
        api = DopplerAPI(doppler_token)
        health = api.health_check()
        if health["status"] == "ok":
            console.print("[green]✓[/green] Doppler: Connected")
            console.print(f"  User: {health['user'].get('user', {}).get('name', 'N/A')}")
        else:
            console.print(f"[red]✗[/red] Doppler: {health.get('error', 'Unknown error')}")
    else:
        console.print("[yellow]○[/yellow] Doppler: Not configured")

    # Check GitHub
    github_token = config.get_github_token()
    if github_token:
        api = GitHubAPI(github_token)
        health = api.health_check()
        if health["status"] == "ok":
            console.print("[green]✓[/green] GitHub: Connected")
            console.print(f"  User: {health['user']}")
        else:
            console.print(f"[red]✗[/red] GitHub: {health.get('error', 'Unknown error')}")
    else:
        console.print("[yellow]○[/yellow] GitHub: Not configured")

    console.print()


@click.command()
@click.option("--project", default=None, help="Doppler project name")
@click.option("--config", "config_name", default=None, help="Doppler config name")
@click.option("--repo", default=None, help="GitHub repository (owner/repo)")
@click.option("--secrets", default=None, help="Comma-separated list of secrets to sync")
def sync(project: str, config_name: str, repo: str, secrets: str):
    """Sync secrets from Doppler to GitHub."""
    doppler_token = config.get_doppler_token()
    github_token = config.get_github_token()

    if not doppler_token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    if not github_token:
        console.print("[red]Error: GITHUB_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()
    config_name = config_name or config.get_doppler_config()
    repo = repo or f"{config.get_github_owner()}/{config.get_github_repo()}"

    console.print("[cyan]Syncing secrets from Doppler to GitHub...[/cyan]")
    console.print(f"Project: {project}")
    console.print(f"Config: {config_name}")
    console.print(f"Repo: {repo}\n")

    try:
        # Use the existing gatekeeper-sync.sh script (try to find it relative to repo root)
        from pathlib import Path

        # Try to find script relative to current directory or common locations
        script_candidates = [
            Path("scripts/gatekeeper-sync.sh"),
            Path("../scripts/gatekeeper-sync.sh"),
            Path("/home/runner/work/revvel-standards/revvel-standards/scripts/gatekeeper-sync.sh"),
        ]

        script_path = None
        for candidate in script_candidates:
            if candidate.exists():
                script_path = str(candidate.resolve())
                break

        if not script_path:
            raise FileNotFoundError("gatekeeper-sync.sh script not found")

        cmd = [
            script_path,
            "--project", project,
            "--config", config_name,
            "--repo", repo,
        ]

        if secrets:
            cmd.extend(["--secrets", secrets])

        result = subprocess.run(cmd, capture_output=True, text=True, check=False)

        if result.returncode == 0:
            console.print("[green]✓[/green] Sync completed successfully")
            if result.stdout:
                console.print(result.stdout)
        else:
            console.print("[red]✗[/red] Sync failed")
            if result.stderr:
                console.print(result.stderr)
            raise click.Abort()

    except FileNotFoundError:
        console.print("[yellow]Warning: gatekeeper-sync.sh not found. Using API directly...[/yellow]\n")

        # Fallback to direct API calls
        doppler_api = DopplerAPI(doppler_token)
        github_api = GitHubAPI(github_token)

        owner, repo_name = repo.split("/")

        # Get secrets from Doppler
        secret_list = doppler_api.list_secrets(project, config_name)

        if secrets:
            secret_names = [s.strip() for s in secrets.split(",")]
            secret_list = [s for s in secret_list if s["name"] in secret_names]

        synced = []
        failed = []

        for secret in secret_list:
            try:
                secret_name = secret["name"]
                secret_data = doppler_api.get_secret(secret_name, project, config_name)
                secret_value = secret_data.get("value", {}).get("computed", "")

                github_api.set_repo_secret(owner, repo_name, secret_name, secret_value)
                synced.append(secret_name)
                console.print(f"[green]✓[/green] Synced: {secret_name}")
            except Exception as e:
                failed.append((secret_name, str(e)))
                console.print(f"[red]✗[/red] Failed: {secret_name} - {e}")

        console.print(f"\n[cyan]Summary:[/cyan] {len(synced)} synced, {len(failed)} failed")


@click.command()
def health():
    """Run health checks on Gatekeeper system."""
    console.print("[cyan]Running Gatekeeper health checks...[/cyan]\n")

    checks = []

    # Check Doppler connectivity
    doppler_token = config.get_doppler_token()
    if doppler_token:
        api = DopplerAPI(doppler_token)
        health = api.health_check()
        checks.append(("Doppler API", health["status"] == "ok", health.get("error")))
    else:
        checks.append(("Doppler API", False, "Not configured"))

    # Check GitHub connectivity
    github_token = config.get_github_token()
    if github_token:
        api = GitHubAPI(github_token)
        health = api.health_check()
        checks.append(("GitHub API", health["status"] == "ok", health.get("error")))
    else:
        checks.append(("GitHub API", False, "Not configured"))

    # Display results
    table = Table(title="Health Check Results")
    table.add_column("Component", style="cyan")
    table.add_column("Status", style="green")
    table.add_column("Details", style="dim")

    all_healthy = True
    for name, healthy, details in checks:
        status = "[green]✓ Healthy[/green]" if healthy else "[red]✗ Unhealthy[/red]"
        table.add_row(name, status, details or "")
        if not healthy:
            all_healthy = False

    console.print(table)
    console.print()

    if all_healthy:
        console.print("[green]All systems operational[/green]")
    else:
        console.print("[yellow]Some systems need attention[/yellow]")


@click.command()
@click.option("--secret", required=True, help="Secret name to audit")
@click.option("--project", default=None, help="Doppler project name")
@click.option("--config", "config_name", default=None, help="Doppler config name")
def audit(secret: str, project: str, config_name: str):
    """Audit secret usage and history."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()
    config_name = config_name or config.get_doppler_config()

    console.print(f"[cyan]Auditing secret: {secret}[/cyan]")
    console.print(f"Project: {project}")
    console.print(f"Config: {config_name}\n")

    api = DopplerAPI(token)
    try:
        secret_data = api.get_secret(secret, project, config_name)

        table = Table(title=f"Secret Audit: {secret}")
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="green")

        table.add_row("Name", secret_data.get("name", "N/A"))
        table.add_row("Created", secret_data.get("created_at", "N/A"))
        table.add_row("Updated", secret_data.get("updated_at", "N/A"))

        computed = secret_data.get("computed", {})
        table.add_row("Source", computed.get("source", "N/A"))

        console.print(table)
        console.print()
        console.print("[dim]Note: Detailed audit logs are available in the Doppler dashboard[/dim]")

    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort() from e
