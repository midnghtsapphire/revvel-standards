"""Main CLI entry point for gatekeeper-cli."""

import click

from .commands.gatekeeper import audit, health, status, sync
from .commands.projects import configs, projects
from .commands.secrets import secrets
from .commands.tokens import tokens


@click.group()
@click.version_option(version="1.0.0", prog_name="gatekeeper-cli")
def cli():
    """
    Gatekeeper CLI - Doppler and GitHub secrets management.

    Manage secrets, projects, configs, and service tokens across
    Doppler and GitHub with a unified command-line interface.
    """
    pass


# Register command groups
cli.add_command(secrets)
cli.add_command(projects)
cli.add_command(configs)
cli.add_command(tokens)

# Register standalone commands
cli.add_command(status)
cli.add_command(sync)
cli.add_command(health)
cli.add_command(audit)


if __name__ == "__main__":
    cli()
