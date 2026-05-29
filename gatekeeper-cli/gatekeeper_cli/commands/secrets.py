"""Secret management commands."""

import secrets as secrets_module
import string

import click
from rich.console import Console
from rich.table import Table

from ..api import DopplerAPI
from ..config import config

console = Console()


@click.group()
def secrets():
    """Manage Doppler secrets."""
    pass


@secrets.command(name="list")
@click.option("--project", default=None, help="Doppler project name")
@click.option("--config", "config_name", default=None, help="Doppler config name")
def list_secrets(project: str, config_name: str):
    """List all secrets in a config."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()
    config_name = config_name or config.get_doppler_config()

    api = DopplerAPI(token)
    try:
        secrets_list = api.list_secrets(project, config_name)

        if not secrets_list:
            console.print(f"[yellow]No secrets found in {project}/{config_name}[/yellow]")
            return

        table = Table(title=f"Secrets in {project}/{config_name}")
        table.add_column("Name", style="cyan")
        table.add_column("Type", style="green")

        for secret in secrets_list:
            table.add_row(secret.get("name", ""), secret.get("computed", {}).get("source", ""))

        console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort()


@secrets.command()
@click.argument("secret_name")
@click.option("--project", default=None, help="Doppler project name")
@click.option("--config", "config_name", default=None, help="Doppler config name")
def get(secret_name: str, project: str, config_name: str):
    """Get a specific secret value."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()
    config_name = config_name or config.get_doppler_config()

    api = DopplerAPI(token)
    try:
        secret = api.get_secret(secret_name, project, config_name)
        console.print(f"[green]Secret:[/green] {secret_name}")
        console.print("[yellow]Value: ***REDACTED***[/yellow]")
        console.print(
            f"[dim]Note: Use Doppler CLI 'doppler secrets get {secret_name}' to see the actual value[/dim]"
        )
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort()


@secrets.command()
@click.argument("secret_name")
@click.option("--value", required=True, help="Secret value")
@click.option("--project", default=None, help="Doppler project name")
@click.option("--config", "config_name", default=None, help="Doppler config name")
def set(secret_name: str, value: str, project: str, config_name: str):
    """Set or update a secret."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()
    config_name = config_name or config.get_doppler_config()

    api = DopplerAPI(token)
    try:
        api.set_secret(secret_name, value, project, config_name)
        console.print(f"[green]✓[/green] Secret '{secret_name}' set successfully")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort()


@secrets.command()
@click.argument("secret_name")
@click.option("--project", default=None, help="Doppler project name")
@click.option("--config", "config_name", default=None, help="Doppler config name")
@click.confirmation_option(prompt="Are you sure you want to delete this secret?")
def delete(secret_name: str, project: str, config_name: str):
    """Delete a secret."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()
    config_name = config_name or config.get_doppler_config()

    api = DopplerAPI(token)
    try:
        api.delete_secret(secret_name, project, config_name)
        console.print(f"[green]✓[/green] Secret '{secret_name}' deleted successfully")
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort()


@secrets.command()
@click.argument("secret_name")
@click.option("--project", default=None, help="Doppler project name")
@click.option("--config", "config_name", default=None, help="Doppler config name")
@click.option("--length", default=32, help="Length of generated secret")
def rotate(secret_name: str, project: str, config_name: str, length: int):
    """Rotate a secret (generates new value and updates)."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()
    config_name = config_name or config.get_doppler_config()

    # Generate new secret value
    alphabet = string.ascii_letters + string.digits + string.punctuation
    new_value = "".join(secrets_module.choice(alphabet) for _ in range(length))

    api = DopplerAPI(token)
    try:
        api.set_secret(secret_name, new_value, project, config_name)
        console.print(f"[green]✓[/green] Secret '{secret_name}' rotated successfully")
        console.print(
            f"[dim]New value generated (length: {length}). Use 'gk secrets get {secret_name}' to verify.[/dim]"
        )
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort()
