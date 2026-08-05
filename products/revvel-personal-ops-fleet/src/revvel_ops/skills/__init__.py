"""Runtime skills. Each skill emits proposals only; none executes actions."""

from . import email_cleanup  # noqa: F401

__all__ = ["email_cleanup"]
