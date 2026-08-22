# The SCALE Prompt Template for System Design

The **SCALE Prompt Template** is a standardized, five-layer runtime specification designed to guide AI agents toward producing highly detailed, production-ready system architectures. By structuring prompts with this acronym, developers and architects eliminate ambiguity and prevent "drift" or over-generalized, hand-wavy solutions.

## The SCALE Acronym Breakdown
1.  **S**ystem: Defines the name, core identity, and primary high-level purpose of the system.
2.  **C**onstraints: Specifies quantitative performance metrics (DAU, P99 latency, consistency models, and regulatory compliance).
3.  **A**PIs: Outlines key endpoints, payload schemas, and request/response shapes.
4.  **L**ayers: Details the structural layout (client, edge, application, caching, database, and storage tiers).
5.  **E**dge cases: Maps out critical failure modes, traffic hotspots, race conditions, and mitigation rules.

---

## Reusable Markdown Template

```markdown
# ROLE: Senior AI Systems Architect & Advisor
# CONTEXT: You are designing a production-grade, highly available, cost-effective system.

## 1. SYSTEM
- **Name**: [System Name]
- **Core Purpose**: [One-line description of the business and engineering goal]

## 2. CONSTRAINTS
- **Traffic Profile**: [DAU, peak QPS, read/write ratio]
- **Latency SLA**: [e.g., P99 write < 50ms, P99 read < 100ms]
- **Consistency Model**: [e.g., Strong consistency, Eventual consistency with Saga patterns]
- **Compliance & Privacy**: [e.g., GDPR, SOC 2, HIPAA, data isolation boundaries]

## 3. APIS
- **Endpoint**: [Method] [Path]
  - **Description**: [Goal of this API]
  - **Request Body (JSON Schema)**:
    ```json
    { ... }
    ```
  - **Response Body (JSON Schema)**:
    ```json
    { ... }
    ```

## 4. LAYERS
- **Client & Edge**: [Web/Mobile apps, CDN caching, SSL termination, API Gateway routing]
- **Application & Orchestration**: [Microservices, event brokers, multi-agent runtimes]
- **Caching & High-Availability**: [In-memory caches, read replicas, connection pooling]
- **Data & Vector Storage**: [Primary DB, vector search indexes, partitioned tables]

## 5. EDGE CASES & MITIGATIONS
- **Hotspots**: [How do we handle disproportionate traffic to specific resources/shards?]
- **Failure Modes**: [Circuit breakers, fallback databases, retry queues with exponential backoff]
- **Race Conditions**: [Distributed locking mechanisms, optimistic concurrency control]
```

---

## Worked Example: Distributed Enterprise RAG Pipeline

Below is a system prompt formatted using the **SCALE** template to generate a secure, high-performance RAG pipeline:

```markdown
## 1. SYSTEM
- **Name**: GenRead-Enterprise
- **Core Purpose**: A secure, low-latency, corporate-wide retrieval-augmented generation engine that answers questions grounded strictly in private corporate documents.

## 2. CONSTRAINTS
- **Traffic Profile**: 50,000 DAU, average 10 QPS, peak 100 QPS. Read-heavy (95% queries, 5% document uploads).
- **Latency SLA**: P95 retrieval-to-generation pipeline latency < 1.8 seconds.
- **Consistency Model**: Eventual consistency. Document additions must propagate to the vector index within 60 seconds.
- **Compliance & Privacy**: Tenant isolation. Users must never retrieve document segments above their RBAC clearance. Data must reside locally within AWS VPC (us-east-1).

## 3. APIS
- **Endpoint**: POST /api/v1/query
  - **Description**: Submits a natural language query, retrieves relevant document chunks, and generates a cited answer.
  - **Request Body**:
    ```json
    {
      "query": "string",
      "user_id": "string",
      "role": "string",
      "session_id": "string"
    }
    ```
  - **Response Body**:
    ```json
    {
      "answer": "string",
      "citations": [
        {
          "document_id": "string",
          "chunk_id": "string",
          "text_segment": "string"
        }
      ],
      "latency_ms": 1240
    }
    ```

## 4. LAYERS
- **Client & Edge**: React interface connects to AWS CloudFront CDN; API requests land on Kong API Gateway for rate limiting and JWT auth verification.
- **Orchestration Layer**: Python FastAPI microservice coordinates document pre-processing, chunking, and embedding. Integrates with LangGraph for stateful agent routing.
- **Inference & LLM Layer**: Local Triton Inference Server running Mixtral-8x7B for text generation and BGE-M3 for vector embeddings.
- **Storage Layer**: Weaviate Vector Database for semantic search; PostgreSQL for session metadata and document lineage; S3 (via VPC Gateway Endpoints) for raw PDF storage.

## 5. EDGE CASES & MITIGATIONS
- **Hotspots (Hot Tenant Shards)**: Implemented physical multi-tenant isolation inside Weaviate per corporate tenant to prevent a noisy neighbor from consuming shared cache.
- **Failure Modes**: If Triton Inference Server times out or fails, gracefully fall back to a lightweight, locally deployed Llama-3-8B model on a secondary cluster, flagging the degradation in the response.
- **Race Conditions**: Two admins uploading the same document simultaneously is mitigated using distributed locking with Redis (Redlock) on the document hash before starting the pipeline.
```
