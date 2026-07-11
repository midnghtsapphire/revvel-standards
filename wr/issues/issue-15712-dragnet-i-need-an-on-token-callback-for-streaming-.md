# WR: [WR] /dragnet i need an on_token callback for streaming for openhands? can ou please help. i have one script i found on OH website belwo

**Issue:** #15712  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-11  
**Research Date:** 2026-07-11  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

### Output Type (required)

production-app

### PDF pipeline batch

Not applicable

### Research Mode

deepresearch

### Delivery Mode

build-direct

### Lifecycle Mode

new-build

### Commercial Mode

saas-app

### Assign To / Decision Team

orchestrator

### Summary

i need an on_token callback for streaming for openhands? can ou please help. i have one script i found on OH website belwo

### Objective

please help me do this ; or do it: import os
import sys
from typing import Literal

from pydantic import SecretStr

from openhands.sdk import (
    Conversation,
    get_logger,
)
from openhands.sdk.llm import LLM
from openhands.sdk.llm.streaming import ModelResponseStream
from openhands.tools.preset.default import get_default_agent

logger = get_logger(**name**)

api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("Set LLM_API_KEY or OPENAI_API_KEY in your environment.")

model = os.getenv("LLM_MODEL", "anthropic/claude-sonnet-4-5-20250929")
base_url = os.getenv("LLM_BASE_URL")
llm = LLM(
    model=model,
    api_key=SecretStr(api_key),
    base_url=base_url,
    usage_id="stream-demo",
    stream=True,
)

agent = get_default_agent(llm=llm, cli_mode=True)

## Define streaming states
StreamingState = Literal["thinking", "content", "tool_name", "tool_args"]
## Track state across on_token calls for boundary detection
_current_state: StreamingState | None = None

def on_token(chunk: ModelResponseStream) -> None:
    """
    Handle all types of streaming tokens including content,
    tool calls, and thinking blocks with dynamic boundary detection.
    """
    global_current_state

    choices = chunk.choices
    for choice in choices:
        delta = choice.delta
        if delta is not None:
            # Handle thinking blocks (reasoning content)
            reasoning_content = getattr(delta, "reasoning_content", None)
            if isinstance(reasoning_content, str) and reasoning_content:
                if _current_state != "thinking":
                    if _current_state is not None:
                        sys.stdout.write("\n")
                    sys.stdout.write("THINKING: ")
                    _current_state = "thinking"
                sys.stdout.write(reasoning_content)
                sys.stdout.flush()

            # Handle regular content
            content = getattr(delta, "content", None)
            if isinstance(content, str) and content:
                if _current_state != "content":
                    if _current_state is not None:
                        sys.stdout.write("\n")
                    sys.stdout.write("CONTENT: ")
                    _current_state = "content"
                sys.stdout.write(content)
                sys.stdout.flush()

            # Handle tool calls
            tool_calls = getattr(delta, "tool_calls", None)
            if tool_calls:
                for tool_call in tool_calls:
                    tool_name = (
                        tool_call.function.name if tool_call.function.name else ""
                    )
                    tool_args = (
                        tool_call.function.arguments
                        if tool_call.function.arguments
                        else ""
                    )
                    if tool_name:
                        if _current_state != "tool_name":
                            if _current_state is not None:
                                sys.stdout.write("\n")
                            sys.stdout.write("TOOL NAME: ")
                            _current_state = "tool_name"
                        sys.stdout.write(tool_name)
                        sys.stdout.flush()
                    if tool_args:
                        if _current_state != "tool_args":
                            if _current_state is not None:
                                sys.stdout.write("\n")
                            sys.stdout.write("TOOL ARGS: ")
                            _current_state = "tool_args"
                        sys.stdout.write(tool_args)
                        sys.stdout.flush()

conversation = Conversation(
    agent=agent,
    workspace=os.getcwd(),
    token_callbacks=[on_token],
)

story_prompt = (
    "Tell me a long story about LLM streaming, write it a file, "
    "make sure it has multiple paragraphs. "
)
conversation.send_message(story_prompt)
print("Token Streaming:")
print("-" * 100 + "\n")
conversation.run()

cleanup_prompt = (
    "Thank you. Please delete the streaming story file now that I've read it, "
    "then confirm the deletion."
)
conversation.send_message(cleanup_prompt)
print("Token Streaming:")
print("-" * 100 + "\n")
conversation.run()

## Report cost
cost = llm.metrics.accumulated_cost
print(f"EXAMPLE_COST: {cost}")

### Required Bundle

openhands-sdk, pydantic, typing (built-in), os (built-in), sys (built-in). The user needs help implementing an on_token callback for streaming in OpenHands SDK, specifically for handling ModelResponseStream chunks with different streaming states like thinking, content, tool_name, and tool_args.

### Definition of Done

The streaming callback implementation is complete when the on_token function correctly handles all ModelResponseStream chunk types (thinking, content, tool_name, tool_args), maintains proper state tracking across streaming boundaries, integrates seamlessly with the existing OpenHands SDK agent workflow, and successfully processes real-time token streams without errors or data loss.

### Do Not Under-Scope

Ensure the streaming callback implementation handles all token types (content, tool calls, thinking blocks) with proper state management and boundary detection. Don't overlook error handling for malformed chunks, state transitions between different streaming modes, or cleanup when streaming completes. The callback must maintain thread safety if used in concurrent contexts and properly handle partial JSON in tool arguments that may arrive across multiple chunks.

### Explicit Exclusions

This work request excludes any modifications to the core OpenHands SDK streaming architecture or LLM class internals. The implementation should not involve changes to the ModelResponseStream class structure or the underlying streaming protocol. Additionally, this excludes creating a complete production application framework or extensive error handling beyond basic token processing safeguards.

### Delivery Shape

One PR preferred, split only if blocked

### Sellable Artifact Bundle

please help get this pushed out asap!

### Purchase Validation (functions-as-purchased)

N/A — not a purchased artifact for this Output Type.

### Expected Scope

1 shippable app with docs + tests + deploy path

### Validation Expectations

it did say need on_token call back for streaming in Openhands sorry not openrouter callback?
import os
import sys
from typing import Literal

from pydantic import SecretStr

from openhands.sdk import (
    Conversation,
    get_logger,
)
from openhands.sdk.llm import LLM
from openhands.sdk.llm.streaming import ModelResponseStream
from openhands.tools.preset.default import get_default_agent

logger = get_logger(**name**)

api_key = os.getenv("LLM_API_KEY") or os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("Set LLM_API_KEY or OPENAI_API_KEY in your environment.")

model = os.getenv("LLM_MODEL", "anthropic/claude-sonnet-4-5-20250929")
base_url = os.getenv("LLM_BASE_URL")
llm = LLM(
    model=model,
    api_key=SecretStr(api_key),
    base_url=base_url,
    usage_id="stream-demo",
    stream=True,
)

agent = get_default_agent(llm=llm, cli_mode=True)

## Define streaming states
StreamingState = Literal["thinking", "content", "tool_name", "tool_args"]
## Track state across on_token calls for boundary detection
_current_state: StreamingState | None = None

def on_token(chunk: ModelResponseStream) -> None:
    """
    Handle all types of streaming tokens including content,
    tool calls, and thinking blocks with dynamic boundary detection.
    """
    global_current_state

    choices = chunk.choices
    for choice in choices:
        delta = choice.delta
        if delta is not None:
            # Handle thinking blocks (reasoning content)
            reasoning_content = getattr(delta, "reasoning_content", None)
            if isinstance(reasoning_content, str) and reasoning_content:
                if _current_state != "thinking":
                    if _current_state is not None:
                        sys.stdout.write("\n")
                    sys.stdout.write("THINKING: ")
                    _current_state = "thinking"
                sys.stdout.write(reasoning_content)
                sys.stdout.flush()

            # Handle regular content
            content = getattr(delta, "content", None)
            if isinstance(content, str) and content:
                if _current_state != "content":
                    if _current_state is not None:
                        sys.stdout.write("\n")
                    sys.stdout.write("CONTENT: ")
                    _current_state = "content"
                sys.stdout.write(content)
                sys.stdout.flush()

            # Handle tool calls
            tool_calls = getattr(delta, "tool_calls", None)
            if tool_calls:
                for tool_call in tool_calls:
                    tool_name = (
                        tool_call.function.name if tool_call.function.name else ""
                    )
                    tool_args = (
                        tool_call.function.arguments
                        if tool_call.function.arguments
                        else ""
                    )
                    if tool_name:
                        if _current_state != "tool_name":
                            if _current_state is not None:
                                sys.stdout.write("\n")
                            sys.stdout.write("TOOL NAME: ")
                            _current_state = "tool_name"
                        sys.stdout.write(tool_name)
                        sys.stdout.flush()
                    if tool_args:
                        if _current_state != "tool_args":
                            if _current_state is not None:
                                sys.stdout.write("\n")
                            sys.stdout.write("TOOL ARGS: ")
                            _current_state = "tool_args"
                        sys.stdout.write(tool_args)
                        sys.stdout.flush()

conversation = Conversation(
    agent=agent,
    workspace=os.getcwd(),
    token_callbacks=[on_token],
)

story_prompt = (
    "Tell me a long story about LLM streaming, write it a file, "
    "make sure it has multiple paragraphs. "
)
conversation.send_message(story_prompt)
print("Token Streaming:")
print("-" * 100 + "\n")
conversation.run()

cleanup_prompt = (
    "Thank you. Please delete the streaming story file now that I've read it, "
    "then confirm the deletion."
)
conversation.send_message(cleanup_prompt)
print("Token Streaming:")
print("-" * 100 + "\n")
conversation.run()

## Report cost
cost = llm.metrics.accumulated_cost
print(f"EXAMPLE_COST: {cost}")

### Blocker Rule

If any part of the Required Bundle cannot be completed in one iteration, open a WR-BLOCKER issue (label: `wr-blocker`) that names the missing capability, credential, or human action, and reference it from the PR body. Do NOT silently drop scope.

### Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Summary

N/A — pending Jules refinement

## Objective

N/A — pending Jules refinement

## Required Bundle

N/A — pending Jules refinement

## Definition of Done

N/A — pending Jules refinement

## Validation

N/A — pending Jules refinement

## Blockers

N/A — pending Jules refinement

<!-- Market research, BOM, SEO, monetization sections are intentionally absent: BASIC template is for bug/chore/docs/refactor WRs with no product/market surface. Use WR_TEMPLATE_FULL.md only for new products or sellable assets. -->
