"""Configuration management for gatekeeper-cli."""

import os
from pathlib import Path

import yaml
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Configuration manager for gatekeeper-cli."""

    def __init__(self):
        self.config_dir = Path.home() / ".gatekeeper"
        self.config_file = self.config_dir / "config.yaml"
        self._config = self._load_config()

    def _load_config(self) -> dict:
        """Load configuration from file or environment."""
        config = {}

        # Try to load from config file
        if self.config_file.exists():
            with open(self.config_file) as f:
                config = yaml.safe_load(f) or {}

        # Override with environment variables
        doppler_config = config.get("doppler", {})
        github_config = config.get("github", {})

        return {
            "doppler": {
                "token": os.getenv("DOPPLER_AGENT_TOKEN") or os.getenv("DOPPLER_TOKEN") or os.getenv("DOPPLER_LOCAL_TOKEN") or os.getenv("DOPPLER_API_KEY") or os.getenv("DOPPLER_AGENT_ODIC") or os.getenv("DOPPLER_CIRCLECI_OIDC") or doppler_config.get("token"),
                "project": os.getenv("DOPPLER_PROJECT")
                or doppler_config.get("project", "revvel-standards"),
                "config": os.getenv("DOPPLER_CONFIG") or doppler_config.get("config", "prd"),
            },
            "github": {
                "token": os.getenv("GITHUB_TOKEN") or github_config.get("token"),
                "owner": os.getenv("GITHUB_OWNER")
                or github_config.get("owner", "midnghtsapphire"),
                "repo": os.getenv("GITHUB_REPO")
                or github_config.get("repo", "revvel-standards"),
            },
        }

    def get_doppler_token(self) -> str | None:
        """Get Doppler API token."""
        return self._config["doppler"]["token"]

    def get_doppler_project(self) -> str:
        """Get default Doppler project."""
        return self._config["doppler"]["project"]

    def get_doppler_config(self) -> str:
        """Get default Doppler config."""
        return self._config["doppler"]["config"]

    def get_github_token(self) -> str | None:
        """Get GitHub API token."""
        return self._config["github"]["token"]

    def get_github_owner(self) -> str:
        """Get default GitHub owner."""
        return self._config["github"]["owner"]

    def get_github_repo(self) -> str:
        """Get default GitHub repo."""
        return self._config["github"]["repo"]


# Global config instance
config = Config()
