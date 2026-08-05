#!/usr/bin/env python3
"""
Orchestrator (CEO Agent) - Main coordination module for Revvel Rosette Automation

This module coordinates all automation tasks, dispatches work to specialized agents,
and monitors overall system health.
"""

import argparse
import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import yaml
from rich.console import Console
from rich.logging import RichHandler

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    handlers=[RichHandler(rich_tracebacks=True)]
)
logger = logging.getLogger(__name__)
console = Console()


class Orchestrator:
    """Main orchestrator agent that coordinates all automation tasks"""

    def __init__(self, config_path: str = "config/59-config.yaml"):
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.projects = []

    def _load_config(self) -> Dict[str, Any]:
        """Load main configuration and merge supporting services config.

        Only merges the supporting (services) config when the primary config
        actually loaded — otherwise ``status_report().config_loaded`` would
        report ``True`` purely on the back of the supporting file, hiding a
        missing primary config from monitoring.
        """
        if not self.config_path.is_file():
            logger.error(f"Config file not found: {self.config_path}")
            return {}
        config = self._load_yaml(self.config_path)
        if not config:
            return config
        supporting = self._load_yaml(
            self.config_path.parent / "20-supportingconfig.yaml"
        )
        if supporting:
            config["services"] = supporting
        return config

    def _load_yaml(self, filepath: Path) -> Dict[str, Any]:
        try:
            with open(filepath) as f:
                return yaml.safe_load(f) or {}
        except FileNotFoundError:
            logger.error(f"Config file not found: {filepath}")
            return {}
    
    def load_projects(self, projects_file: str = "config/300Projects.yaml") -> None:
        """Load project registry"""
        try:
            with open(projects_file) as f:
                # ``yaml.safe_load`` returns ``None`` for empty files / files
                # containing only ``---``; coerce to ``{}`` so the subsequent
                # ``.get("projects", [])`` doesn't raise ``AttributeError``.
                data = yaml.safe_load(f) or {}
                self.projects = data.get("projects", [])
                logger.info(f"Loaded {len(self.projects)} projects")
        except FileNotFoundError:
            logger.error(f"Projects file not found: {projects_file}")
            
    def run_daily_automation(self) -> List[str]:
        """Execute daily automation tasks.

        Returns the list of task names that failed. Continues past individual
        failures (fault tolerance) but reports them so the caller can decide
        whether to treat the overall run as a success or partial failure.
        """
        console.print("\n[bold cyan]Running Daily Automation[/bold cyan]")

        tasks = [
            ("Sync GitHub Issues → Trello", self._sync_github_trello),
            ("Run Gatekeeper Health Check", self._gatekeeper_health_check),
            ("Check Credential Expiry", self._check_credentials),
            ("Generate Metrics Report", self._generate_metrics),
            ("Self-Healing Scan", self._self_healing_scan),
        ]

        failures: List[str] = []
        for task_name, task_func in tasks:
            try:
                console.print(f"\n[yellow]→[/yellow] {task_name}...")
                task_func()
                console.print(f"[green]✓[/green] {task_name} completed")
            except Exception as e:
                console.print(f"[red]✗[/red] {task_name} failed: {e}")
                logger.exception(f"Error in {task_name}")
                failures.append(task_name)

        if failures:
            console.print(
                f"\n[red]Daily automation finished with {len(failures)} failure(s):"
                f"[/red] {', '.join(failures)}"
            )
        else:
            console.print("\n[green]Daily automation finished: all tasks succeeded[/green]")
        return failures
    
    def _sync_github_trello(self) -> None:
        """Sync GitHub issues to Trello"""
        # Placeholder - would integrate with src/trello.py
        logger.info("GitHub → Trello sync")
        
    def _gatekeeper_health_check(self) -> None:
        """Check Gatekeeper system health"""
        # Placeholder - would integrate with src/gatekeeper.py
        logger.info("Gatekeeper health check")
        
    def _check_credentials(self) -> None:
        """Check for expiring credentials"""
        # Placeholder - would integrate with src/security.py
        logger.info("Credential expiry check")
        
    def _generate_metrics(self) -> None:
        """Generate daily metrics report"""
        # Placeholder - would integrate with src/metrics.py
        logger.info("Generating metrics")
        
    def _self_healing_scan(self) -> None:
        """Run self-healing scan"""
        # Placeholder - would integrate with src/selfheal.py
        logger.info("Self-healing scan")
    
    def dispatch_task(self, task_type: str, task_data: Dict[str, Any]) -> None:
        """Dispatch a task to the appropriate specialized agent"""
        console.print(f"\n[bold]Dispatching {task_type} task[/bold]")
        
        agents = {
            "security": "src.security",
            "vault": "src.vault",
            "gatekeeper": "src.gatekeeper",
            "trello": "src.trello",
            "research": "src.research",
            "blueprint": "src.blueprint",
            "marketing": "src.marketing",
        }
        
        agent = agents.get(task_type)
        if agent:
            logger.info(f"Would dispatch to {agent} with data: {task_data}")
        else:
            logger.warning(f"Unknown task type: {task_type}")
    
    def status_report(self) -> Dict[str, Any]:
        """Generate overall system status report"""
        return {
            "projects_loaded": len(self.projects),
            "active_projects": len([p for p in self.projects if p.get("status") == "active"]),
            "config_loaded": bool(self.config),
            "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        }


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Revvel Rosette Orchestrator (CEO Agent)"
    )
    parser.add_argument(
        "--load-projects",
        help="Load projects from YAML file",
        metavar="FILE",
    )
    parser.add_argument(
        "--run-all",
        action="store_true",
        help="Run all daily automation tasks",
    )
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show system status",
    )
    parser.add_argument(
        "--dispatch",
        help="Dispatch a task (format: type:json_data)",
    )
    
    args = parser.parse_args()

    orchestrator = Orchestrator()
    exit_code = 0

    if args.load_projects:
        orchestrator.load_projects(args.load_projects)

    if args.run_all:
        failures = orchestrator.run_daily_automation()
        if failures:
            # Surface partial failures so cron/monitoring can react instead of
            # always recording the run as successful.
            exit_code = 1

    if args.status:
        status = orchestrator.status_report()
        console.print_json(data=status)

    if args.dispatch:
        try:
            task_type, task_json = args.dispatch.split(":", 1)
            task_data = json.loads(task_json)
            orchestrator.dispatch_task(task_type, task_data)
        except (ValueError, json.JSONDecodeError) as e:
            console.print(f"[red]Error:[/red] Invalid dispatch format: {e}")
            sys.exit(1)

    if not any([args.load_projects, args.run_all, args.status, args.dispatch]):
        parser.print_help()

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
