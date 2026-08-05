"""Connector adapters and contracts. Skeletons only — no live calls."""

from .base import BaseConnector, Capability, Connector, ConnectorManifest
from .registry import REGISTRY, all_capability_keys, capability, get, manifests

__all__ = [
    "BaseConnector",
    "Capability",
    "Connector",
    "ConnectorManifest",
    "REGISTRY",
    "all_capability_keys",
    "capability",
    "get",
    "manifests",
]
