"""Service token management commands."""

import click
from rich.console import Console
from rich.table import Table

from ..api import DopplerAPI
from ..config import config

console = Console()


@click.group()
def tokens():
    """Manage Doppler service tokens."""
    pass


@tokens.command()
@click.option("--name", required=True, help="Token name")
@click.option("--project", default=None, help="Doppler project name")
@click.option("--config", "config_name", default=None, help="Doppler config name")
@click.option("--access", default="read", type=click.Choice(["read", "read/write"]), help="Access level")
def create(name: str, project: str, config_name: str, access: str):
    """Create a service token."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()
    config_name = config_name or config.get_doppler_config()

    api = DopplerAPI(token)
    try:
        result = api.create_service_token(name, project, config_name, access)
        console.print(f"[green]✓[/green] Service token '{name}' created successfully")
        console.print(f"[yellow]Token:[/yellow] {result.get('token', {}).get('key', 'N/A')}")
        console.print("[dim]Store this token securely. It will not be shown again.[/dim]")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort()


@tokens.command(name="list")
@click.option("--project", default=None, help="Doppler project name")
@click.option("--config", "config_name", default=None, help="Doppler config name")
def list_tokens(project: str, config_name: str):
    """List service tokens."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()
    config_name = config_name or config.get_doppler_config()

    api = DopplerAPI(token)
    try:
        tokens_list = api.list_service_tokens(project, config_name)

        if not tokens_list:
            console.print(f"[yellow]No service tokens found in {project}/{config_name}[/yellow]")
            return

        table = Table(title=f"Service Tokens in {project}/{config_name}")
        table.add_column("Name", style="cyan")
        table.add_column("Access", style="green")
        table.add_column("Created", style="dim")

        for tok in tokens_list:
            table.add_row(
                tok.get("name", ""),
                tok.get("access", ""),
                tok.get("created_at", ""),
            )

        console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort()


@tokens.command()
@click.argument("token_id")
@click.option("--project", default=None, help="Doppler project name")
@click.option("--config", "config_name", default=None, help="Doppler config name")
@click.confirmation_option(prompt="Are you sure you want to revoke this token?")
def revoke(token_id: str, project: str, config_name: str):
    """Revoke a service token."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()
    config_name = config_name or config.get_doppler_config()

    api = DopplerAPI(token)
    try:
        api.revoke_service_token(token_id, project, config_name)
        console.print("[green]✓[/green] Service token revoked successfully")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort()
