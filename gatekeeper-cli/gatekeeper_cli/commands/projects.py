"""Project and config management commands."""

import click
from rich.console import Console
from rich.table import Table

from ..api import DopplerAPI
from ..config import config

console = Console()


@click.group()
def projects():
    """Manage Doppler projects."""
    pass


@projects.command(name="list")
def list_projects():
    """List all Doppler projects."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    api = DopplerAPI(token)
    try:
        projects_list = api.list_projects()

        if not projects_list:
            console.print("[yellow]No projects found[/yellow]")
            return

        table = Table(title="Doppler Projects")
        table.add_column("Name", style="cyan")
        table.add_column("ID", style="green")
        table.add_column("Created", style="dim")

        for project in projects_list:
            table.add_row(
                project.get("name", ""),
                project.get("id", ""),
                project.get("created_at", ""),
            )

        console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort()


@click.group()
def configs():
    """Manage Doppler configs."""
    pass


@configs.command(name="list")
@click.option("--project", default=None, help="Doppler project name")
def list_configs(project: str):
    """List configs in a project."""
    token = config.get_doppler_token()
    if not token:
        console.print("[red]Error: DOPPLER_TOKEN not configured[/red]")
        raise click.Abort()

    project = project or config.get_doppler_project()

    api = DopplerAPI(token)
    try:
        configs_list = api.list_configs(project)

        if not configs_list:
            console.print(f"[yellow]No configs found in project '{project}'[/yellow]")
            return

        table = Table(title=f"Configs in {project}")
        table.add_column("Name", style="cyan")
        table.add_column("Environment", style="green")
        table.add_column("Created", style="dim")

        for conf in configs_list:
            table.add_row(
                conf.get("name", ""),
                conf.get("environment", ""),
                conf.get("created_at", ""),
            )

        console.print(table)
    except Exception as e:
        console.print(f"[red]Error: {e}[/red]")
        raise click.Abort()
