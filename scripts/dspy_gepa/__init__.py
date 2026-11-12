"""DSPy GEPA integration for agent prompt optimization (WR #18338).

The live optimizer is a separate command from the offline tests. It refuses a
non-local endpoint unless REVVEL_LLM_ALLOW_CLOUD and REVVEL_GEPA_SPEND_APPROVED
are both exactly "1". Offline tests use dspy.utils.DummyLM and make no network
call. GOAP_AGENT_PROMPT.md and AGENT_BUILD_PROMPT.md are inputs only.
"""

__all__ = ["__version__"]

__version__ = "2026.11.11"
