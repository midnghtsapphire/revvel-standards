#!/usr/bin/env python3
"""
Scheduler - Cron job and task scheduling module

Manages scheduled tasks, cron jobs, and queue processing.
"""

import argparse
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Callable, Dict, List

import schedule
import yaml
from rich.console import Console

logger = logging.getLogger(__name__)
console = Console()


class TaskScheduler:
    """Manages scheduled automation tasks"""
    
    def __init__(self, config_path: str = "config/59-config.yaml"):
        self.config_path = Path(config_path)
        self.config = self._load_config()
        self.jobs: List[Dict] = []
        
    def _load_config(self) -> Dict:
        """Load scheduler configuration"""
        try:
            with open(self.config_path) as f:
                # ``yaml.safe_load`` returns ``None`` for empty files / files
                # containing only ``---``; coerce to ``{}`` so the subsequent
                # ``.get("scheduler", {})`` doesn't raise ``AttributeError`` and
                # crash ``TaskScheduler.__init__``.
                config = yaml.safe_load(f) or {}
                return config.get("scheduler", {})
        except FileNotFoundError:
            logger.error(f"Config file not found: {self.config_path}")
            return {}
    
    def register_jobs(self) -> None:
        """Register all scheduled jobs from config"""
        jobs_config = self.config.get("jobs", [])
        
        for job in jobs_config:
            if not job.get("enabled", True):
                continue
                
            name = job["name"]
            schedule_expr = job["schedule"]
            command = job["command"]
            
            # Parse cron expression and register
            self._register_cron_job(name, schedule_expr, command)
            
            logger.info(f"Registered job: {name} ({schedule_expr})")
    
    def _register_cron_job(self, name: str, cron_expr: str, command: str) -> None:
        """Register a single cron job"""
        # Parse cron expression (simplified)
        # Format: minute hour day month weekday
        parts = cron_expr.split()
        
        if len(parts) != 5:
            logger.error(f"Invalid cron expression for {name}: {cron_expr}")
            return
        
        minute, hour, day, month, weekday = parts
        
        # Map to schedule library
        if minute == "0" and hour == "3" and day == "*" and month == "*" and weekday == "*":
            # Daily at 3 AM
            schedule.every().day.at("03:00").do(self._run_command, name, command)
        elif minute == "0" and hour == "*":
            # Every hour
            schedule.every().hour.do(self._run_command, name, command)
        elif minute == "0" and hour == "0" and weekday == "0":
            # Weekly on Sunday
            schedule.every().sunday.at("00:00").do(self._run_command, name, command)
        elif minute == "0" and hour == "0" and day == "1":
            # Monthly on 1st (schedule library doesn't support monthly, use daily check)
            # Would need custom logic to check if it's the 1st of month
            logger.warning(f"Monthly scheduling not fully supported for {name}, skipping")
        else:
            logger.warning(f"Unsupported cron expression for {name}: {cron_expr}")
    
    def _run_command(self, name: str, command: str) -> None:
        """Execute a scheduled command"""
        console.print(f"\n[cyan]Running scheduled job:[/cyan] {name}")
        console.print(f"[dim]Command:[/dim] {command}")
        
        # In production, would use subprocess.run()
        # For now, just log
        logger.info(f"Would execute: {command}")
    
    def run_forever(self) -> None:
        """Run the scheduler loop indefinitely"""
        console.print("[bold green]Scheduler started[/bold green]")
        console.print("Press Ctrl+C to stop\n")
        
        try:
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        except KeyboardInterrupt:
            console.print("\n[yellow]Scheduler stopped[/yellow]")
    
    def list_jobs(self) -> None:
        """List all registered jobs"""
        jobs = schedule.get_jobs()
        
        if not jobs:
            console.print("[yellow]No jobs registered[/yellow]")
            return
        
        console.print("\n[bold]Scheduled Jobs:[/bold]\n")
        for job in jobs:
            console.print(f"  • {job}")


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Revvel Rosette Scheduler"
    )
    parser.add_argument(
        "--start",
        action="store_true",
        help="Start the scheduler daemon",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all scheduled jobs",
    )
    parser.add_argument(
        "--test",
        help="Test run a specific job by name",
    )
    
    args = parser.parse_args()
    
    scheduler = TaskScheduler()
    scheduler.register_jobs()
    
    if args.start:
        scheduler.run_forever()
    elif args.list:
        scheduler.list_jobs()
    elif args.test:
        console.print(f"[yellow]Test run would execute job: {args.test}[/yellow]")
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
