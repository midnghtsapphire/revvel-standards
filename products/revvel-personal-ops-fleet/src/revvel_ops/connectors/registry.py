"""Connector registry. Import-time only; no network activity."""

from __future__ import annotations

from .base import BaseConnector, ConnectorManifest
from .box import BoxConnector
from .calendar import GoogleCalendarConnector
from .dropbox import DropboxConnector
from .gdrive import GoogleDriveConnector
from .github import GitHubConnector
from .gmail import GmailConnector
from .local_companion import LocalCompanionConnector
from .mobile_companion import MobileCompanionConnector
from .n8n import N8nConnector
from .openrouter import OpenRouterConnector

_CONNECTOR_CLASSES = [
    GmailConnector,
    GoogleCalendarConnector,
    GoogleDriveConnector,
    DropboxConnector,
    BoxConnector,
    GitHubConnector,
    LocalCompanionConnector,
    MobileCompanionConnector,
    N8nConnector,
    OpenRouterConnector,
]

REGISTRY: dict[str, BaseConnector] = {}
for _cls in _CONNECTOR_CLASSES:
    _instance = _cls()
    REGISTRY[_instance.manifest.name] = _instance


def get(name: str) -> BaseConnector | None:
    return REGISTRY.get(name)


def manifests() -> list[ConnectorManifest]:
    return [c.manifest for c in REGISTRY.values()]


def capability(key: str):
    for connector in REGISTRY.values():
        cap = connector.manifest.capability(key)
        if cap is not None:
            return connector, cap
    return None, None


def all_capability_keys() -> list[str]:
    keys: list[str] = []
    for connector in REGISTRY.values():
        keys.extend(connector.capability_keys())
    return sorted(keys)
