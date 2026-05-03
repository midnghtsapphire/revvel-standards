#!/usr/bin/env python3
"""
Gatekeeper - Automated secret provisioning and access control

Integrates with ../gatekeeper-cli and provides high-level automation.
"""

import argparse
import logging
import os
import subprocess
from pathlib import Path
from typing import Dict, List, Optional

from rich.console import Console

logger = logging.getLogger(__name__)
console = Console()


class Gatekeeper:
    """Gatekeeper automation system"""

    def __init__(self):
        self.gatekeeper_script: Optional[Path] = self._find_gatekeeper_script()

    def _find_gatekeeper_script(self) -> Optional[Path]:
        """Locate the gatekeeper-sync.sh script in the parent revvel-standards repo.

        Returns the resolved path if found, otherwise None. Callers should check
        for None and surface a clear error rather than attempting to invoke a
        non-existent script.
        """
        # Anchor relative paths to this file so behavior doesn't depend on cwd.
        here = Path(__file__).resolve().parent
        possible_paths = [
            here.parent.parent / "scripts" / "gatekeeper-sync.sh",
            here.parent / "scripts" / "gatekeeper-sync.sh",
            Path("/home/runner/work/revvel-standards/revvel-standards/scripts/gatekeeper-sync.sh"),
        ]

        for path in possible_paths:
            if path.exists():
                return path.resolve()

        logger.warning(
            "gatekeeper-sync.sh not found in expected locations: %s",
            [str(p) for p in possible_paths],
        )
        return None
    
    def provision_secrets(
        self,
        repo: str,
        secrets: List[str],
        project: str = "revvel-standards",
        config: str = "prd",
        dry_run: bool = False,
    ) -> Dict:
        """
        Provision secrets for a repository
        
        Args:
            repo: Repository in owner/name format
            secrets: List of secret names to provision
            project: Doppler project name
            config: Doppler config name
            dry_run: If True, don't actually provision
            
        Returns:
            Dict with provisioning results
        """
        console.print(f"\n[cyan]Provisioning secrets for {repo}[/cyan]")
        
        if self.gatekeeper_script is None:
            msg = (
                "gatekeeper-sync.sh not found; cannot provision secrets. "
                "Ensure this package is run from within the revvel-standards repo."
            )
            console.print(f"[red]Error:[/red] {msg}")
            return {"error": msg}

        cmd = [
            str(self.gatekeeper_script),
            "--repo", repo,
            "--secrets", ",".join(secrets),
            "--project", project,
            "--config", config,
            "--json",
        ]

        env = {"DRY_RUN": "1"} if dry_run else {}

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                env={**os.environ, **env},
                check=True,
            )
            
            # Parse JSON output
            import json
            lines = result.stdout.strip().split("\n")
            summary = json.loads(lines[-1])
            
            console.print(f"[green]✓[/green] Synced {len(summary.get('synced', []))} secrets")
            
            if summary.get("missing_in_doppler"):
                console.print(f"[yellow]![/yellow] Missing in Doppler: {summary['missing_in_doppler']}")
            
            if summary.get("failed"):
                console.print(f"[red]✗[/red] Failed: {summary['failed']}")
            
            return summary
            
        except subprocess.CalledProcessError as e:
            console.print(f"[red]Error:[/red] {e.stderr}")
            return {"error": str(e)}
    
    def health_check(self) -> Dict:
        """Check Gatekeeper system health"""
        console.print("\n[cyan]Gatekeeper Health Check[/cyan]")
        
        checks = {
            "gatekeeper_script_exists": (
                self.gatekeeper_script is not None and self.gatekeeper_script.exists()
            ),
            "doppler_token_set": bool(os.environ.get("DOPPLER_TOKEN")),
            "github_token_set": bool(os.environ.get("GITHUB_TOKEN")),
        }
        
        for check, result in checks.items():
            status = "[green]✓[/green]" if result else "[red]✗[/red]"
            console.print(f"  {status} {check}")
        
        return checks
    
    def auto_provision_on_issue(self, issue_number: int, repo: str) -> None:
        """
        Automatically provision secrets when an issue is labeled
        
        This would be called from a GitHub Actions workflow
        """
        console.print(f"\n[cyan]Auto-provisioning for issue #{issue_number}[/cyan]")
        
        # In production, would:
        # 1. Fetch issue labels via GitHub API
        # 2. Check if 'needs-secrets' label is present
        # 3. Parse issue body for requested secrets
        # 4. Call provision_secrets()
        
        logger.info(f"Would auto-provision for {repo}#{issue_number}")


def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(
        description="Revvel Rosette Gatekeeper Automation"
    )
    parser.add_argument(
        "--provision",
        action="store_true",
        help="Provision secrets for a repository",
    )
    parser.add_argument(
        "--repo",
        help="Repository in owner/name format",
    )
    parser.add_argument(
        "--secrets",
        help="Comma-separated list of secret names",
    )
    parser.add_argument(
        "--health-check",
        action="store_true",
        help="Run health check",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Dry run mode",
    )
    
    args = parser.parse_args()
    
    gatekeeper = Gatekeeper()
    
    if args.health_check:
        gatekeeper.health_check()
    elif args.provision and args.repo and args.secrets:
        secrets_list = [s.strip() for s in args.secrets.split(",")]
        gatekeeper.provision_secrets(
            args.repo,
            secrets_list,
            dry_run=args.dry_run,
        )
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
