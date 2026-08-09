import os
from pathlib import Path
from unittest.mock import patch, mock_open
import pytest

from gatekeeper_cli.config import Config


def test_load_config_default():
    """Test loading configuration with no file and no environment variables."""
    with patch.dict(os.environ, {}, clear=True):
        with patch.object(Path, "exists", return_value=False):
            config_instance = Config()
            config = config_instance._config

            assert config["doppler"]["token"] is None
            assert config["doppler"]["project"] == "revvel-standards"
            assert config["doppler"]["config"] == "prd"

            assert config["github"]["token"] is None
            assert config["github"]["owner"] == "midnghtsapphire"
            assert config["github"]["repo"] == "revvel-standards"


def test_load_config_from_file():
    """Test loading configuration from a YAML file."""
    mock_yaml = """
doppler:
  token: doppler-file-token
  project: doppler-file-project
  config: doppler-file-config
github:
  token: github-file-token
  owner: github-file-owner
  repo: github-file-repo
"""
    with patch.dict(os.environ, {}, clear=True):
        with patch.object(Path, "exists", return_value=True):
            with patch("builtins.open", mock_open(read_data=mock_yaml)):
                config_instance = Config()
                config = config_instance._config

                assert config["doppler"]["token"] == "doppler-file-token"
                assert config["doppler"]["project"] == "doppler-file-project"
                assert config["doppler"]["config"] == "doppler-file-config"

                assert config["github"]["token"] == "github-file-token"
                assert config["github"]["owner"] == "github-file-owner"
                assert config["github"]["repo"] == "github-file-repo"


def test_load_config_from_env():
    """Test loading configuration from environment variables."""
    env_vars = {
        "DOPPLER_TOKEN": "doppler-env-token",
        "DOPPLER_PROJECT": "doppler-env-project",
        "DOPPLER_CONFIG": "doppler-env-config",
        "GITHUB_TOKEN": "github-env-token",
        "GITHUB_OWNER": "github-env-owner",
        "GITHUB_REPO": "github-env-repo",
    }
    with patch.dict(os.environ, env_vars, clear=True):
        with patch.object(Path, "exists", return_value=False):
            config_instance = Config()
            config = config_instance._config

            assert config["doppler"]["token"] == "doppler-env-token"
            assert config["doppler"]["project"] == "doppler-env-project"
            assert config["doppler"]["config"] == "doppler-env-config"

            assert config["github"]["token"] == "github-env-token"
            assert config["github"]["owner"] == "github-env-owner"
            assert config["github"]["repo"] == "github-env-repo"


def test_load_config_env_overrides_file():
    """Test that environment variables override file configuration."""
    mock_yaml = """
doppler:
  token: doppler-file-token
  project: doppler-file-project
  config: doppler-file-config
github:
  token: github-file-token
  owner: github-file-owner
  repo: github-file-repo
"""
    env_vars = {
        "DOPPLER_TOKEN": "doppler-env-token",
        "DOPPLER_PROJECT": "doppler-env-project",
        # Intentionally omitting DOPPLER_CONFIG to ensure file fallback works
        "GITHUB_TOKEN": "github-env-token",
        "GITHUB_OWNER": "github-env-owner",
        # Intentionally omitting GITHUB_REPO to ensure file fallback works
    }

    with patch.dict(os.environ, env_vars, clear=True):
        with patch.object(Path, "exists", return_value=True):
            with patch("builtins.open", mock_open(read_data=mock_yaml)):
                config_instance = Config()
                config = config_instance._config

                assert config["doppler"]["token"] == "doppler-env-token"
                assert config["doppler"]["project"] == "doppler-env-project"
                assert config["doppler"]["config"] == "doppler-file-config"

                assert config["github"]["token"] == "github-env-token"
                assert config["github"]["owner"] == "github-env-owner"
                assert config["github"]["repo"] == "github-file-repo"
