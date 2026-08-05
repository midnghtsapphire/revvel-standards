# Search Engine Alternatives Research: OpenSearch, MeiliSearch, Typesense vs Elasticsearch

**Version:** 1.0.0
**Date:** 2026-04-30
**Status:** Research Document
**Author:** Audrey Evans (MIDNGHTSAPPHIRE)
**Confidence:** High
**Related Standard:** `AI_RESEARCH_MODULE_STANDARD.md`

---

## Executive Summary

This research evaluates search engine alternatives to Elasticsearch for Revvel applications. After analyzing 7 major search platforms (Elasticsearch, OpenSearch, MeiliSearch, Typesense, Algolia, Apache Solr, and Vespa), **MeiliSearch** emerges as the recommended solution for most Revvel use cases. It offers the fastest time-to-market, MIT licensing, developer-friendly APIs, and is purpose-built for user-facing product search — all at a fraction of Elasticsearch's cost.

**Key Recommendation:** Migrate from Elastic Cloud to MeiliSearch for product/catalog search, with OpenRouter layered on top for AI-enhanced semantic search capabilities.

---

## 1. Current Context & Problem Statement

**Core Question:** What search engine should Revvel applications use instead of Elasticsearch to reduce costs, simplify operations, and maintain or improve search quality?

- **Current Setup:** Elastic Cloud with OpenRouter integration
- **Pain Point:** High cost relative to revenue targets, complex operational overhead, licensing concerns
- **Goal:** Identify affordable, performant alternatives that maintain or improve search quality while reducing costs

---

## 2. Executive Comparison Matrix

| Engine | Best For | License | Cost | Recommendation |
|--------|----------|---------|------|----------------|
| **Elasticsearch** | Petabyte-scale, log analytics | ELv2/SSPL/AGPL | $$$$ | ❌ Overkill for most Revvel apps |
| **OpenSearch** | AWS integration, logs | Apache 2.0 | $-$$ | ⚠️ Only if already on AWS |
| **MeiliSearch** ⭐ | Instant search UX | MIT | $-$$ | ✅ Ideal for product search |
| **Typesense** | Real-time, simplicity | GPL 3 | $-$$ | ✅ Good alternative |
| **Algolia** | Hosted search | Proprietary | $$$$ | ❌ No - cost too high |
| **Apache Solr** | Enterprise, Apache | Apache 2.0 | Free | ❌ Over-complex |
| **Vespa** | Large-scale | Apache 2.0 | Free | ❌ Overkill |

---

## 3. Detailed Analysis by Platform

### 3.1. Elasticsearch (Current Solution)

**What it is:** Full-featured distributed search and analytics engine built on Apache Lucene.

**Cost:** $X00+/month for cloud - pricing is opaque and complex.

**Problems:**
- Licensing changed from Apache 2.0 to dual licensing (Elastic License 2.0 and SSPL) in 2021; AGPL added as a third option in 2024, restoring OSI-approved open-source status
- Expensive for small-to-medium use cases
- Complex operational overhead (cluster management, shard optimization, memory tuning)
- Pricing is not transparent
- Over-engineered for typical product search scenarios

**Strengths:**
- Mature ecosystem with extensive plugins
- Excellent for log analytics and observability at scale
- Strong full-text search capabilities
- Battle-tested at petabyte scale

**Verdict:** ❌ **Too expensive and complex** for Revvel revenue targets. Migrate away from Elastic Cloud.

---

### 3.2. OpenSearch (AWS Fork of Elasticsearch)

**What it is:** AWS-maintained fork of Elasticsearch 7.10.2 (the last Apache 2.0 version before licensing change).

**Cost:**
- Free self-hosted
- ~$X00/month via Amazon OpenSearch Service (managed)

**Pros:**
- Apache 2.0 license (truly open source)
- API-compatible with Elasticsearch 7.x
- Good AWS integration (CloudWatch, IAM, VPC)
- Free security plugins (unlike Elasticsearch paid tiers)
- Active development by AWS

**Cons:**
- Performance may trail Elasticsearch in some benchmarks (Elastic's own tests claim 40-140% gaps, though as a biased source this should be taken directionally)
- Smaller community and plugin ecosystem than Elasticsearch
- Still inherits Elasticsearch's operational complexity
- Requires DevOps expertise for proper tuning

**Best For:**
- Organizations already heavily invested in AWS ecosystem
- Log analytics and observability use cases
- Teams needing Elasticsearch API compatibility

**Verdict:** ⚠️ **Only if already on AWS and need log analytics**. For product search, MeiliSearch is simpler and faster to deploy.

---

### 3.3. MeiliSearch ⭐ RECOMMENDED

**What it is:** Lightweight, Rust-based search engine optimized for instant, typo-tolerant search experiences.

**Cost:**
- Self-hosted: Free (open source)
- MeiliSearch Cloud: Starting at $X/month based on documents and requests

**Pros:**
- **Fastest time-to-market** for delightful search UX (setup in minutes, not days)
- **MIT license** (most permissive open source license)
- **Developer-friendly API** - RESTful, simple, well-documented
- **Typo tolerance built-in** - works out of the box
- **Instant search** - optimized for <50ms response times
- **Easy setup** - single binary, no JVM, minimal configuration
- Great for **product/catalog search** and **document search**
- AI-ready with **vector embeddings support** for semantic search
- Active community and excellent documentation
- Low resource requirements - runs efficiently on modest hardware

**Cons:**
- Not designed for petabyte-scale log analytics
- Maximum index size constrained by OS/storage limits (not strictly RAM-bound; RAM primarily affects indexing and search performance)
- Fewer advanced features than Elasticsearch for analytics use cases
- Smaller plugin ecosystem

**Best For:**
- Product catalogs and e-commerce search
- Documentation sites
- User-facing instant search
- Applications prioritizing developer experience
- Projects needing fast time-to-value

**Technical Notes:**
- Written in Rust for memory safety and performance
- Uses LMDB for storage
- Supports filtering, faceting, geo-search
- Built-in ranking algorithm (no manual tuning needed)
- Supports multiple languages with stemming

**Verdict:** ✅ **Ideal for Revvel e-commerce/product search applications**. Recommended as primary solution for apps needing user-facing search.

---

### 3.4. Typesense

**What it is:** Open-source search engine built for speed, developer experience, and real-time updates.

**Cost:**
- Free self-hosted (open source)
- ~$X/month via Typesense Cloud (managed)

**Pros:**
- **Simple deployment** - single binary, similar to MeiliSearch
- **Real-time search** with near-zero latency (<50ms typical)
- **Easy API** - RESTful and well-documented
- **Geo-search support** built-in
- **Vector search** for AI/semantic capabilities
- **Typo tolerance** and faceting out of the box
- Good performance characteristics
- Multi-tenancy support

**Cons:**
- **GPL 3 license** (less permissive than MIT - requires derivative works to be GPL)
- Smaller community than MeiliSearch
- Fewer integrations and plugins
- Less mature than MeiliSearch in some areas

**Best For:**
- Teams comfortable with GPL licensing
- Applications needing geo-search
- Real-time search with geographic filtering

**Verdict:** ✅ **Good alternative to MeiliSearch**. Choose based on specific feature needs (e.g., if GPL license is acceptable and geo-search is critical).

---

### 3.5. Algolia

**What it is:** Fully-managed search-as-a-service (SaaS) platform.

**Cost:** $X00+/month - pricing scales with records and search operations.

**Pros:**
- Fully managed (zero operations burden)
- Excellent search quality and relevance
- Global CDN for geo-distributed search
- Rich feature set (A/B testing, analytics, personalization)
- Great developer experience

**Cons:**
- ❌ **Very expensive** - costs scale quickly with usage
- Vendor lock-in (proprietary platform)
- No self-hosted option
- Pricing becomes prohibitive at scale
- Not aligned with Revvel's cost optimization goals

**Verdict:** ❌ **Too costly for revenue-targeting**. Savings from avoiding Algolia can fund multiple other infrastructure improvements.

---

### 3.6. Apache Solr

**What it is:** Enterprise-grade search platform built on Apache Lucene (same foundation as Elasticsearch).

**Cost:** Free (open source)

**Pros:**
- Mature platform (since 2005)
- Apache 2.0 license
- Powerful features (faceting, highlighting, geospatial)
- No licensing concerns
- Strong enterprise adoption

**Cons:**
- **Complex setup and configuration** - steep learning curve
- XML configuration (less modern than JSON APIs)
- **Overkill for most use cases** - designed for large enterprises
- Requires significant expertise to operate properly
- Slower development velocity than modern alternatives

**Verdict:** ❌ **Too complex for Revvel needs**. Modern alternatives like MeiliSearch provide better developer experience.

---

### 3.7. Vespa (Yahoo!)

**What it is:** Large-scale search and machine learning inference engine built by Yahoo!.

**Cost:** Free (open source)

**Pros:**
- **Petabyte-scale** capabilities
- Built-in **ML inference** (serve models alongside search)
- Apache 2.0 license
- Designed for massive scale (billions of documents)

**Cons:**
- **Extreme overkill** for typical applications
- Complex architecture and operations
- Designed for Yahoo/Verizon Media scale
- Steep learning curve
- Small community

**Verdict:** ❌ **Overkill for Revvel**. Only justified for applications with billions of documents and need for integrated ML inference.

---

### 3.8. OpenRouter for Search Enhancement

**What it is:** LLM API gateway that can enhance search results with semantic understanding and natural language processing.

**How it works:**
- Traditional search engine (e.g., MeiliSearch) handles indexing and basic retrieval
- OpenRouter processes queries to understand intent
- LLM generates embeddings for semantic search
- Results are re-ranked or augmented with AI-generated insights

**Use Cases:**
- Natural language query understanding ("find me comfortable winter boots under $100")
- Semantic similarity search via embeddings
- Query expansion and synonym handling
- Personalized recommendations

**Cost:** Pay-per-token (varies by model, typically $0.001-$0.10 per 1K tokens)

**Verdict:** ⚠️ **Enhancement, not replacement**. Use OpenRouter to **augment** MeiliSearch, not replace it. Traditional search engine handles indexing; OpenRouter adds semantic intelligence.

---

## 4. Recommendation for Revvel Standards

| Use Case | Recommended Solution |
|----------|---------------------|
| **Product/catalog search** | **MeiliSearch** (primary recommendation) |
| **User-facing instant search** | **MeiliSearch** (optimal for UX) |
| **Log analytics** (if needed) | **OpenSearch** (self-hosted) or skip entirely |
| **AI-enhanced semantic search** | **OpenRouter + MeiliSearch** (combined approach) |
| **Document/content search** | **MeiliSearch** or **Typesense** |

### Recommended Architecture

```text
User Query → MeiliSearch (instant search, typo tolerance)
               ↓
          [Optional] OpenRouter (semantic enhancement, intent understanding)
               ↓
          Results (fast, relevant, AI-augmented)
```

---

## 5. Implementation Roadmap

### Phase 1: Evaluation & Proof of Concept (Week 1-2)
- [ ] Set up MeiliSearch instance (Docker or local)
- [ ] Index sample product catalog data
- [ ] Test search quality, speed, and relevance
- [ ] Compare with current Elasticsearch implementation
- [ ] Benchmark performance (<50ms response time target)

### Phase 2: Migration Planning (Week 3-4)
- [ ] Document current Elasticsearch schema and queries
- [ ] Design MeiliSearch index structure
- [ ] Create data migration scripts
- [ ] Plan rollout strategy (shadow mode → gradual rollout)
- [ ] Establish monitoring and alerting

### Phase 3: Production Deployment (Week 5-6)
- [ ] Deploy MeiliSearch to production (managed cloud or self-hosted)
- [ ] Migrate data from Elasticsearch to MeiliSearch
- [ ] Update application code to use MeiliSearch API
- [ ] Enable monitoring (latency, error rates, search quality metrics)
- [ ] Run shadow mode (parallel queries to both systems for comparison)

### Phase 4: OpenRouter Integration (Week 7-8)
- [ ] Implement vector embeddings generation
- [ ] Add semantic search layer using OpenRouter
- [ ] A/B test search quality with and without AI enhancement
- [ ] Optimize for cost (caching, batch processing)

### Phase 5: Elasticsearch Decommission (Week 9)
- [ ] Verify all workloads migrated to MeiliSearch
- [ ] Archive critical Elasticsearch data
- [ ] Cancel Elastic Cloud subscription
- [ ] Document cost savings achieved

---

## 6. Security Considerations

### MeiliSearch Security
- **Authentication:** MeiliSearch Cloud is protected by default; self-hosted instances are **unprotected unless started with a master key** (`--master-key` flag). Always set a master key in production
- **HTTPS:** Enable TLS for all connections (mandatory in production)
- **API Key Management:**
  - Use read-only keys for search endpoints
  - Restrict admin keys to backend services only
  - Rotate keys regularly
- **Network Security:**
  - Deploy in private network/VPC
  - Use firewall rules to restrict access
  - Consider using a reverse proxy (Nginx, Caddy) for additional security layer

### OpenRouter Security
- **API Key Protection:** Store in secrets manager (Doppler, AWS Secrets Manager)
- **Rate Limiting:** Implement at application level to control costs
- **Data Privacy:** Review OpenRouter's data retention policies
- **Prompt Injection:** Sanitize user queries before sending to LLM

---

## 7. Cost Analysis

> **Note:** Cost values marked with `$X` placeholders are intentionally generalized as specific pricing varies by usage, region, and changes over time. Readers should consult current vendor pricing pages for exact figures. The comparative relationships (e.g., "Elasticsearch is significantly more expensive than MeiliSearch") remain accurate.

### Current State: Elasticsearch Cloud
- **Monthly Cost:** $X00+/month (estimate based on typical usage)
- **Annual Cost:** $X,XXX+/year
- **Operational Overhead:** High (monitoring, tuning, troubleshooting)

### Proposed State: MeiliSearch + OpenRouter

**Option A: Self-Hosted MeiliSearch**
- **Infrastructure:** ~$50-100/month (VPS or cloud instance)
- **OpenRouter:** ~$20-100/month (usage-based)
- **Monthly Total:** ~$70-200/month
- **Annual Savings:** ~$X,XXX+ compared to Elasticsearch

**Option B: MeiliSearch Cloud**
- **MeiliSearch Cloud:** ~$X/month (based on scale)
- **OpenRouter:** ~$20-100/month
- **Monthly Total:** ~$XX-XXX/month
- **Annual Savings:** ~$X,XXX+ compared to Elasticsearch

### Break-Even Analysis
- **Cost Reduction:** 60-85% depending on configuration
- **Break-Even Time:** Immediate (lower monthly costs from month 1)
- **Additional Benefits:**
  - Reduced operational complexity
  - Faster development velocity
  - Better developer experience

---

## 8. Open Questions & Human Decisions Needed

1. **Hosting Preference:** Self-hosted vs. MeiliSearch Cloud?
   - **Self-hosted:** More control, potentially lower cost at scale
   - **Managed:** Less operational burden, faster setup
   - **Recommendation:** Start with MeiliSearch Cloud for speed, evaluate self-hosting after 3 months

2. **Migration Strategy:** Big bang vs. gradual rollout?
   - **Recommendation:** Gradual rollout with shadow mode to validate search quality

3. **Data Retention:** How long to keep Elasticsearch running in parallel?
   - **Recommendation:** 2-4 weeks of parallel operation for validation

4. **OpenRouter Integration Scope:** Which features get AI enhancement?
   - **Recommendation:** Start with query understanding and semantic search, expand based on value

5. **Backup Strategy:** How to handle MeiliSearch backups?
   - **Recommendation:**
     - Daily snapshots of MeiliSearch data
     - Maintain authoritative data in primary database (MeiliSearch is cache/index)

---

## 9. Action Items

### Immediate (This Week)
1. **Migrate off Elastic Cloud** - cancel subscription after migration complete ([#436](https://github.com/midnghtsapphire/revvel-standards/issues/436))
2. **Set up MeiliSearch POC** - test with sample data ([#437](https://github.com/midnghtsapphire/revvel-standards/issues/437))
3. **Document current search usage patterns** - queries, volumes, performance requirements ([#438](https://github.com/midnghtsapphire/revvel-standards/issues/438))

### Short-Term (Next 2-4 Weeks)
1. **Implement MeiliSearch** for primary product search use case ([#439](https://github.com/midnghtsapphire/revvel-standards/issues/439))
2. **Create migration scripts** for data transfer ([#439](https://github.com/midnghtsapphire/revvel-standards/issues/439))
3. **Update application code** to use MeiliSearch API ([#439](https://github.com/midnghtsapphire/revvel-standards/issues/439))
4. **Set up monitoring** for search performance and quality ([#439](https://github.com/midnghtsapphire/revvel-standards/issues/439))

### Medium-Term (1-2 Months)
1. **Add OpenRouter integration** as semantic enhancement layer ([#440](https://github.com/midnghtsapphire/revvel-standards/issues/440))
2. **A/B test search quality** with and without AI enhancement ([#440](https://github.com/midnghtsapphire/revvel-standards/issues/440))
3. **Optimize costs** through caching and query optimization ([#440](https://github.com/midnghtsapphire/revvel-standards/issues/440))
4. **Document lessons learned** and update this research doc ([#440](https://github.com/midnghtsapphire/revvel-standards/issues/440))

---

## 10. Sources and References

### Official Documentation
- [MeiliSearch Documentation](https://www.meilisearch.com/docs)
- [MeiliSearch GitHub Repository](https://github.com/meilisearch/meilisearch)
- [Typesense Documentation](https://typesense.org/docs/)
- [Typesense Comparison with Alternatives](https://typesense.org/docs/overview/comparison-with-alternatives.html)
- [OpenSearch Documentation](https://opensearch.org/docs/latest/)
- [Elasticsearch Licensing Changes (2021)](https://www.elastic.co/blog/licensing-change)

### Comparative Analysis
- [OpenSearch vs Elasticsearch: A Comprehensive Comparison in 2025](https://medium.com/@FrankGoortani/opensearch-vs-elasticsearch-a-comprehensive-comparison-in-2025-aff5a8533422)
- [MeiliSearch vs Elasticsearch](https://www.meilisearch.com/docs/learn/what_is_meilisearch/comparison_to_alternatives)
- [Algolia vs MeiliSearch: Cost Comparison](https://www.meilisearch.com/blog/meilisearch-vs-algolia)

### Technical Resources
- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Vector Search with MeiliSearch](https://www.meilisearch.com/docs/learn/experimental/vector-search)
- [MeiliSearch Cloud Pricing](https://www.meilisearch.com/cloud)
- [Typesense Cloud Pricing](https://typesense.org/docs/guide/typesense-cloud/)

---

## 11. Related Revvel Standards

- `AI_RESEARCH_MODULE_STANDARD.md` - Research methodology used for this analysis
- `DEPLOYMENT_GUIDE.md` - Deployment procedures

---

*This document was created based on the research completed in the original issue and follows the Revvel AI Research Module Standard.*
*Review and validate findings before implementing recommendations. Update this document as new information becomes available.*
