# Agent Fallback System — Visual Guide

## High-Level Architecture

```text
                          ┌─────────────────────────┐
                          │   GitHub Issue/PR       │
                          │   (Code generation      │
                          │    request)             │
                          └───────────┬─────────────┘
                                      │
                                      ↓
                          ┌─────────────────────────┐
                          │   agent-fallback.yml    │
                          │   Workflow              │
                          └───────────┬─────────────┘
                                      │
                                      ↓
                          ┌─────────────────────────┐
                          │   Health Check          │
                          │   (Which agents are     │
                          │    available?)          │
                          └───────────┬─────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    ↓                 ↓                 ↓
        ┌───────────────────┐ ┌──────────────┐ ┌─────────────────┐
        │ OpenHands_API_KEY     │ │CURSOR_API_KEY│ │OPENROUTER_API_KEY│
        │ configured?       │ │configured?   │ │configured?       │
        └─────────┬─────────┘ └──────┬───────┘ └────────┬─────────┘
                  │                  │                   │
                  └──────────┬───────┴──────┬────────────┘
                             ↓              ↓
                    ┌────────────────────────────────┐
                    │  Recommended Agent Calculated  │
                    └────────────┬───────────────────┘
                                 │
                                 ↓
                    ┌─────────────────────────────────┐
                    │  Step 1: Try OpenHands AI           │
                    │  - Most capable                 │
                    │  - Complex multi-file changes   │
                    │  - Retry 3x with backoff        │
                    └─────────────┬───────────────────┘
                                  │
                         Success? │ Yes → Create PR & Done
                                  │
                                  │ No (Rate limit/Failure)
                                  ↓
                    ┌─────────────────────────────────┐
                    │  Step 2: Try Cursor             │
                    │  - Fast iteration               │
                    │  - Smaller features             │
                    │  - Retry 3x with backoff        │
                    └─────────────┬───────────────────┘
                                  │
                         Success? │ Yes → Create PR & Done
                                  │
                                  │ No (Rate limit/Failure)
                                  ↓
                    ┌─────────────────────────────────┐
                    │  Step 3: Try OpenRouter         │
                    │  - Multi-model fallback         │
                    │  - Sonnet → Opus → GPT-4        │
                    │  - Effectively unlimited        │
                    └─────────────┬───────────────────┘
                                  │
                         Success? │ Yes → Create PR & Done
                                  │
                                  │ No (All agents failed)
                                  ↓
                    ┌─────────────────────────────────┐
                    │  Step 4: Manual Escalation      │
                    │  - Create needs-human issue     │
                    │  - Log full diagnostics         │
                    │  - Add needs-human label        │
                    └─────────────────────────────────┘
```

## Retry Logic Flow

```text
                          ┌─────────────────┐
                          │  Call Agent     │
                          └────────┬────────┘
                                   │
                                   ↓
                          ┌─────────────────┐
                          │  HTTP Request   │
                          └────────┬────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ↓              ↓              ↓
            ┌────────────┐  ┌───────────┐  ┌──────────────┐
            │ 200-202    │  │ 429       │  │ 500-504      │
            │ SUCCESS    │  │ Rate Limit│  │ Server Error │
            └─────┬──────┘  └─────┬─────┘  └──────┬───────┘
                  │               │                │
                  │               │                │
                  ↓               ↓                ↓
            Return success   Wait 10s        Wait 10s
                             Retry (2x)      Retry (2x)
                                   │                │
                                   ↓                ↓
                          Still failing?    Still failing?
                                   │                │
                                   ↓                ↓
                          Try next agent    Try next agent
```

## Monitoring Flow

```text
                    ┌──────────────────────────┐
                    │  Fallback Event          │
                    │  (OpenHands → Cursor)        │
                    └───────────┬──────────────┘
                                │
                                ↓
                    ┌──────────────────────────┐
                    │  Create GitHub Issue     │
                    │  Title: [AUTO-FALLBACK]  │
                    │  Labels: auto-fallback,  │
                    │          OpenHands-limit     │
                    └───────────┬──────────────┘
                                │
                                ↓
                    ┌──────────────────────────┐
                    │  Log Event Details       │
                    │  - Timestamp             │
                    │  - Original issue #      │
                    │  - Agent used            │
                    │  - Reason for fallback   │
                    └───────────┬──────────────┘
                                │
                                ↓
                    ┌──────────────────────────┐
                    │  No human action needed  │
                    │  (Working as designed)   │
                    └──────────────────────────┘
```

## Cost Optimization Flow

```text
                    ┌──────────────────────────┐
                    │  Incoming Task           │
                    └───────────┬──────────────┘
                                │
                                ↓
                    ┌──────────────────────────┐
                    │  Analyze Task Complexity │
                    │  - Lines changed         │
                    │  - Files affected        │
                    │  - Architecture impact   │
                    └───────────┬──────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
                    ↓           ↓           ↓
        ┌──────────────┐ ┌────────────┐ ┌──────────────┐
        │ Simple       │ │ Medium     │ │ Complex      │
        │ <50 lines    │ │ 2-5 files  │ │ Architecture │
        │ 1 file       │ │ Bug fix    │ │ Multi-file   │
        └──────┬───────┘ └─────┬──────┘ └──────┬───────┘
               │               │               │
               ↓               ↓               ↓
        ┌──────────────┐ ┌────────────┐ ┌──────────────┐
        │ OpenRouter   │ │ Cursor     │ │ OpenHands AI     │
        │ (Cheapest)   │ │ (Balanced) │ │ (Most $$)    │
        └──────────────┘ └────────────┘ └──────────────┘
```

## Setup Flow

```text
                    ┌─────────────────────────────┐
                    │  Run setup-agent-fallback.sh│
                    └──────────────┬──────────────┘
                                   │
                                   ↓
                    ┌─────────────────────────────┐
                    │  Check .cursorrules exists  │
                    │  → Create if missing        │
                    └──────────────┬──────────────┘
                                   │
                                   ↓
                    ┌─────────────────────────────┐
                    │  Check .env.example has keys│
                    │  → Warn if missing          │
                    └──────────────┬──────────────┘
                                   │
                                   ↓
                    ┌─────────────────────────────┐
                    │  Check workflow file exists │
                    │  → Copy if missing          │
                    └──────────────┬──────────────┘
                                   │
                                   ↓
                    ┌─────────────────────────────┐
                    │  Check scripts exist        │
                    │  → Make executable          │
                    └──────────────┬──────────────┘
                                   │
                                   ↓
                    ┌─────────────────────────────┐
                    │  Verify GitHub secrets      │
                    │  → Show commands if missing │
                    └──────────────┬──────────────┘
                                   │
                                   ↓
                    ┌─────────────────────────────┐
                    │  Summary + Next Steps       │
                    │  ✅ Setup Complete          │
                    └─────────────────────────────┘
```

## Error Handling Flow

```text
                    ┌──────────────────────────┐
                    │  API Call Fails          │
                    └───────────┬──────────────┘
                                │
                    ┌───────────┴───────────┐
                    │                       │
                    ↓                       ↓
        ┌──────────────────┐    ┌──────────────────┐
        │ 429 Rate Limit   │    │ 401/403 Auth     │
        └────────┬─────────┘    └────────┬─────────┘
                 │                       │
                 ↓                       ↓
        ┌──────────────────┐    ┌──────────────────┐
        │ Try next agent   │    │ Fail fast        │
        │ in chain         │    │ Check key config │
        └──────────────────┘    └──────────────────┘
                    │
                    ↓
        ┌──────────────────────────┐
        │ All agents tried?        │
        └───────────┬──────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ↓                       ↓
┌──────────────────┐    ┌──────────────────┐
│ At least 1       │    │ All failed       │
│ succeeded        │    │                  │
└────────┬─────────┘    └────────┬─────────┘
         │                       │
         ↓                       ↓
┌──────────────────┐    ┌──────────────────┐
│ Create PR        │    │ Create issue     │
│ Comment success  │    │ Add needs-human  │
└──────────────────┘    └──────────────────┘
```
