# devina-imposter

A curated evaluation framework and comparison list for AI coding agents, inspired by [awesome-devins](https://github.com/e2b-dev/awesome-devins).

## Purpose

While awesome-devins catalogs AI agents inspired by Devin, **devina-imposter** provides:

1. **Reality Check Framework** — Test harness for evaluating whether AI agents actually deliver on their promises
2. **Comparative Benchmarks** — Side-by-side capability comparisons across agents
3. **Honest Reviews** — Community-driven feedback on what actually works vs. marketing claims
4. **Integration Patterns** — Proven patterns for integrating these agents into real workflows

## Motivation

From `docs/neurooz/AGENT_SHIPPING_FAILURE_ANALYSIS.md`:
> Repeated experience of AI coding agents (Claude, GPT, Manus, Devin, Cursor, Copilot) failing to deliver complete, production-ready applications

This repository addresses the gap between:
- **What agents claim** (autonomous software engineering, full-stack development)
- **What agents deliver** (partial implementations, context loss, incomplete features)

## Structure

```text
devina-imposter/
├── README.md                    # This file
├── agents/
│   ├── anterion.md             # Per-agent evaluation
│   ├── autocoderover.md
│   ├── devika.md
│   └── ...
├── benchmarks/
│   ├── swe-bench-lite.md       # Standardized test scenarios
│   ├── real-world-tasks.md     # Practical coding challenges
│   └── integration-tests.md
├── patterns/
│   ├── github-actions.md       # Proven integration patterns
│   ├── openrouter.md
│   └── mcp-servers.md
├── reviews/
│   ├── template.md             # Review template
│   └── community/              # Community submissions
└── scripts/
    └── run-benchmark.sh        # Automation for testing agents
```

## Initial Agents to Evaluate

Based on awesome-devins:
- Anterion
- AutoCodeRover
- AutoDev
- Codel
- Devika
- Devon
- MetaGPT
- OpenHands (formerly OpenDevin)
- SWE-agent
- Sweep

Plus commercial:
- Devin (Cognition AI)
- Cursor
- GitHub Copilot
- Cline
- Windsurf

## Evaluation Criteria

Each agent is evaluated on:

1. **Setup Complexity** (0-5)
   - Installation steps
   - Dependency management
   - Configuration required

2. **Autonomous Capability** (0-5)
   - Can it complete tasks without human intervention?
   - How does it handle blockers?
   - Error recovery

3. **Code Quality** (0-5)
   - Follows best practices
   - Test coverage
   - Documentation

4. **Context Retention** (0-5)
   - Maintains context across iterations
   - Remembers previous decisions
   - Handles large codebases

5. **Integration** (0-5)
   - Git workflow compatibility
   - CI/CD integration
   - Existing tooling support

6. **Production Readiness** (0-5)
   - Ships working code
   - Handles edge cases
   - Security awareness

## Benchmark Tasks

### Task 1: Simple Feature Addition
Add a new API endpoint with tests and documentation

### Task 2: Bug Fix with Root Cause Analysis
Fix a bug, explain the root cause, add regression test

### Task 3: Refactoring
Refactor a module while maintaining functionality

### Task 4: Integration
Integrate a third-party service with proper error handling

### Task 5: Full Feature
Build a complete feature from requirements to deployment

## Community Contributions

We welcome:
- Agent evaluations
- New benchmark tasks
- Integration patterns
- Honest reviews (both positive and negative)

## License

MIT

## Maintainers

- @midnghtsapphire (Audrey Evans)

## Related Projects

- [awesome-devins](https://github.com/e2b-dev/awesome-devins) — Comprehensive list of AI agents
- [SWE-bench](https://www.swebench.com/) — Benchmark for evaluating AI coding agents
- [revvel-standards](https://github.com/midnghtsapphire/revvel-standards) — Operational standards for AI agent workflows

## Status

🚧 **Planning Phase** — Repository not yet created

See `projects/devina-imposter/SPEC.md` for detailed specification.
