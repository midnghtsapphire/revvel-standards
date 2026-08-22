# The SCALE Prompt Template for System Design

The **SCALE Prompt Template** is a standardized, five-layer runtime specification designed to guide AI agents toward producing highly detailed, production-ready system architectures. By structuring prompts with this acronym, developers and architects eliminate ambiguity and prevent "drift" or over-generalized, hand-wavy solutions.

## The SCALE Acronym Breakdown
1.  **S**ystem: Defines the name, core identity, and primary high-level purpose of the system.
2.  **C**onstraints: Specifies quantitative performance metrics (DAU, P99 latency, consistency models, and regulatory compliance).
3.  **A**PIs: Outlines key endpoints, payload schemas, and request/response shapes.
4.  **L**ayers: Details the structural layout (client, edge, application, caching, database, and storage tiers).
5.  **E**dge cases: Maps out critical failure modes, traffic hotspots, race conditions, and mitigation rules.

See Promhoeador collected copy for the full reusable template and RAG worked example.
