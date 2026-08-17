# Content Automation Skill

**AI-Powered Content Creation Pipeline for Revvel Standards**

---

## Quick Start

1. **Create an issue** with the content topic as the title
2. **Add label**: `content-automation`
3. **Wait 10-15 minutes** for the pipeline to complete
4. **Review output** in `content-automation-output/YYYY-MM-DD-{slug}/`

That's it! The system handles everything from research to multi-format publishing.

---

## What This Skill Does

Content Automation is a complete AI-powered content creation system that eliminates the manual bottleneck in content production. It automates the entire workflow from ideation to publication:

### The 5-Phase Pipeline

```text
Input (topic + context)
    ↓
1. Research & Topic Ideation (2-3 min)
   - AI brainstorms 20-30 variations
   - Validates search demand (optional)
   - Generates comprehensive brief
    ↓
2. Outline Generation (1 min)
   - Structures content sections
   - Defines key points and flow
   - Sets SEO optimization targets
    ↓
3. Draft Generation (3-4 min)
   - AI writes complete first draft
   - Integrates keywords naturally
   - Adds CTAs and internal links
    ↓
4. Content Refinement (2-3 min)
   - Fact-checking pass
   - Tone and pacing improvements
   - Readability optimization
    ↓
5. Multi-Format Export (1 min)
   - Blog HTML with SEO tags
   - Video script with timestamps
   - Social media threads
   - Email newsletter format
    ↓
Output (production-ready content)
```

**Total Time: 10-15 minutes** (vs 4-6 hours manually)  
**Cost: $0.30 per blog post** (vs $100-150 manual)  
**Quality: Passes automated SEO, readability, and technical gates**

---

## Features

### Automated Quality Gates
- ✅ **SEO**: Title length, keyword density, meta descriptions, headings
- ✅ **Readability**: Flesch score, sentence length, active voice
- ✅ **Structure**: Clear intro/conclusion, logical flow, word count
- ✅ **Technical**: No broken links, valid markup, no spelling errors

### Multi-Format Output
Every piece of content is automatically exported in:
- **Blog HTML** - Ready-to-publish with schema.org markup
- **Video Script** - Timestamped with presenter notes
- **Social Threads** - Twitter/X, LinkedIn formats
- **Email Newsletter** - HTML newsletter template

### AI Model Selection
Smart model routing based on task requirements:
- **Research**: Claude Opus 4 (best reasoning)
- **Generation**: DeepSeek (cost-effective)
- **Editing**: Claude Sonnet 4.6 (excellent tone control)
- **Fact-checking**: GPT-5.4 (strong verification)

### Security & Compliance
- Input sanitization (prevents code injection)
- API keys in GitHub Secrets
- Avoid sending PII in topics/prompts (PII filtering is not automatically enforced)
- Human review by default
- GDPR/CCPA compliant

---

## Installation

### 1. Required Secrets

Set in repository Settings → Secrets and variables → Actions:

```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

Get your API key: <https://openrouter.ai/keys>

### 2. Optional Secrets (for validation)

```bash
TUBEBUDDY_API_KEY=...     # YouTube keyword research
VIDIQ_API_KEY=...          # Video SEO validation
```

### 3. Repository Variables

Set in Settings → Secrets and variables → Actions → Variables:

| Variable | Default | Purpose |
|---|---|---|
| `CONTENT_TARGET_AUDIENCE` | "general audience" | Who the content is for |
| `CONTENT_BRAND_VOICE` | "professional yet approachable" | Tone guidelines |
| `CONTENT_PRIMARY_KEYWORDS` | "" | Core SEO keywords |
| `CONTENT_AUTO_PUBLISH` | "false" | Skip human review |

---

## Usage

### Method 1: Issue-Based (Recommended)

**Best for:** Regular content requests, team collaboration

1. Go to Issues → New Issue
2. Title: "Write blog post about [your topic]"
3. Description (optional):
   ```text
   Target audience: Young professionals
   Keywords: budget headphones, affordable audio
   Tone: Professional yet approachable
   ```
4. Add label: `content-automation`
5. Submit

**What happens:**
- Bot comments with progress tracker
- Pipeline runs for 10-15 minutes
- Bot posts completion comment with results
- Content saved to `content-automation-output/`

### Method 2: Workflow Dispatch (Manual)

**Best for:** Ad-hoc requests, urgent content

1. Go to Actions → Content Automation
2. Click "Run workflow"
3. Fill inputs:
   - **Topic**: "Best wireless headphones 2026"
   - **Format**: blog | video | social | email | all
   - **Urgency**: draft | final | publish
   - **Target audience**: "Tech enthusiasts"
4. Click "Run workflow"

### Method 3: Scheduled (Automatic)

**Best for:** Weekly content planning

- Runs every Sunday 09:00 UTC
- Generates 2-4 content ideas
- Creates weekly content calendar
- Auto-commits to repository

---

## Output Structure

```text
content-automation-output/
└── 2026-05-02-best-wireless-headphones/
    ├── metadata.json           # Stats, models, quality scores
    ├── brief.md                # Research and topic analysis
    ├── outline.md              # Structured content plan
    ├── draft_v1.md             # First AI-generated draft
    ├── draft_final.md          # Refined, ready-to-publish
    ├── formats/
    │   ├── blog.html           # Blog-ready HTML
    │   ├── video-script.md     # Timestamped video script
    │   ├── social-thread.md    # Twitter/X thread
    │   ├── linkedin-post.md    # LinkedIn post
    │   └── email.html          # Newsletter-ready HTML
    └── assets/
        └── (manually add images here)
```

---

## Configuration Examples

### Custom Brand Voice

```yaml
# .github/variables
CONTENT_BRAND_VOICE: "Technical and precise, but friendly. Use analogies to explain complex concepts."
```

**Result:** Content will match your specific tone automatically.

### SEO Keywords

```yaml
CONTENT_PRIMARY_KEYWORDS: "budget headphones 2026,best cheap headphones,affordable wireless headphones"
```

**Result:** Keywords automatically integrated with 1-2% density.

### Auto-Publish Mode

```yaml
CONTENT_AUTO_PUBLISH: "true"
```

**Result:** Skips human review, marks content as final immediately. Use with caution.

---

## Best Practices

### ✅ DO

1. **Be specific in topics**
   - Good: "Compare top 5 wireless headphones under $100 for students"
   - Bad: "Write about headphones"

2. **Provide context**
   - Target audience
   - Primary keywords
   - Desired tone
   - Word count target

3. **Review and edit**
   - Always fact-check statistics
   - Add personal insights
   - Verify links work
   - Add visuals (images/diagrams)

4. **Use keywords strategically**
   - Research before generating
   - 1-2 primary keywords max
   - 5-7 secondary keywords

5. **Track performance**
   - Monitor which topics work
   - Update templates based on results
   - Refresh content quarterly

### ❌ DON'T

1. Publish first drafts without review
2. Ignore quality gate warnings
3. Use vague or broad topics
4. Forget to add images
5. Skip fact-checking AI output

---

## Troubleshooting

| Issue | Solution |
|---|---|
| **Content is too generic** | Add more specific context, keywords, and examples in issue description |
| **Facts are incorrect** | Run fact-checking pass, add authoritative sources to brief |
| **SEO score is low** | Research keywords first, specify primary/secondary keywords explicitly |
| **Generation takes too long** | Normal 10-15 min. Check workflow logs if longer. |
| **Cost is too high** | Use DeepSeek for drafts, reduce word counts, batch requests |
| **Workflow fails** | Check `OPENROUTER_API_KEY`, verify API rate limits, simplify topic |

---

## Cost Analysis

### Per Content Piece
| Type | Tokens | Model | Cost | Time |
|---|---|---|---|---|
| Blog post (1500 words) | ~10k | Claude Opus 4 | $0.30 | 10-15 min |
| Video script (10 min) | ~5k | DeepSeek | $0.05 | 5-8 min |
| Social thread (10 tweets) | ~2k | Claude Sonnet 4.6 | $0.02 | 2-3 min |
| Email newsletter | ~4k | DeepSeek | $0.03 | 5 min |

### Monthly Estimates
- **20 blog posts**: $6-10
- **40 social posts**: $0.80
- **4 newsletters**: $0.12
- **Total**: **$10-15/month**

### ROI Comparison
- **Automated**: $10-15/month
- **Manual** (at $25/hr): $2,500-4,000/month
- **Savings**: 99%
- **Time saved**: 100+ hours/month

---

## Integration

### With Other Skills

| Skill | Integration Point |
|---|---|
| **noimosai** | Marketing distribution, social posting |
| **seo-metadata** | Technical SEO, schema markup |
| **eeat-trust-authority** | Author credibility, citations |
| **product-pipeline** | Auto-generate product docs |
| **openclaw-eeat** | Content distribution, authority building |

### With External Tools

- **TubeBuddy/VidIQ**: Topic validation (optional)
- **OpenRouter**: AI generation (required)
- **GitHub Actions**: Automation orchestration

---

## Examples

See [EXAMPLES.md](./EXAMPLES.md) for 10 detailed usage scenarios:

1. Generate blog post via issue
2. Generate video script via workflow dispatch
3. Weekly content calendar (automated)
4. Generate social media thread
5. Multi-format content generation
6. Custom brand voice
7. SEO-focused content
8. Human-in-loop review
9. Error handling
10. Cost tracking

---

## Files in This Skill

```text
skills/content-automation/
├── SKILL.md                    # Complete skill documentation
├── content-automation.skill.yml # Machine-readable config
├── EXAMPLES.md                 # 10 practical examples
└── README.md                   # This file
```

## Related Files

```text
.github/workflows/content-automation.yml    # Workflow automation
scripts/content-automation.js               # Pipeline implementation  
standards/CONTENT_AUTOMATION_STANDARD.md    # Standard documentation
tests/content-automation.test.js            # Test suite (15 tests)
```

---

## Support

- **Documentation**: See `SKILL.md` for complete technical details
- **Examples**: See `EXAMPLES.md` for usage scenarios
- **Issues**: Open a GitHub issue with label `content-automation`
- **Standard**: See `standards/CONTENT_AUTOMATION_STANDARD.md`

---

## Metrics

Track these KPIs to measure effectiveness:

| Metric | Target | How to Measure |
|---|---|---|
| Generation time | < 15 min | Workflow duration |
| Cost per piece | < $0.50 | OpenRouter API costs |
| Quality score | > 70/100 | Internal rubric |
| SEO pass rate | 100% | Automated checks |
| Edit time saved | > 80% | Before/after comparison |
| Publish rate | 10+ pieces/week | GitHub commits |

---

**Version**: 1.0.0  
**Date**: May 2, 2026  
**Author**: Audrey Evans (MIDNGHTSAPPHIRE)  
**License**: Proprietary - All Rights Reserved

---

*This skill solves the content creation bottleneck by automating the complete pipeline from ideation to publication, reducing time by 95% and cost by 99% while maintaining quality through automated gates and human review.*
