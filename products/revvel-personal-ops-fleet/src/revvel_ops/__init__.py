"""Revvel Personal Ops Fleet — control plane for a hybrid personal ops agent fleet.

Safety invariants (enforced in code, not just docs):
  * No module in this package performs a network call.
  * ``planner.apply`` always refuses; the MVP is plan/dry-run only.
  * Default autonomy mode is ``review_everything``.
"""

__version__ = "0.1.0"

from .models import (  # noqa: F401
    ActionProposal,
    AuditEvent,
    AutonomyMode,
    Disposition,
    Evidence,
    Permission,
    Plan,
    PolicyDecision,
    Reversibility,
    RiskTier,
)

__all__ = [
    "ActionProposal",
    "AuditEvent",
    "AutonomyMode",
    "Disposition",
    "Evidence",
    "Permission",
    "Plan",
    "PolicyDecision",
    "Reversibility",
    "RiskTier",
    "__version__",
]
