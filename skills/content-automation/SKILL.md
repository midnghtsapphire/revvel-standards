# Skill: Content Automation — AI-Powered Content Creation Pipeline

**Version:** 1.0.0  
**Date:** 2026-05-02  
**Status:** Active  
**Standard:** `standards/CONTENT_AUTOMATION_STANDARD.md`  
**Workflow:** `.github/workflows/content-automation.yml`

---

## What is Content Automation

Content Automation is an end-to-end AI-powered content creation pipeline that handles everything from topic ideation through production-ready content. It automates the complete content creation workflow outlined in the problem statement:

1. **Research and Topic Ideation** (Planning Phase)
2. **Script/Outline Generation** (Production Phase)
3. **Content Refinement and Publishing** (Quality Phase)

This skill integrates with OpenRouter for AI generation, implements validation and quality gates, and produces ready-to-publish content for blogs, videos, social media, and documentation.

---

## When to Load This Skill

Load this skill when the task involves:

- Content creation, writing, or copywriting
- Blog post generation or article writing
- Video script writing or podcast outlines
- Social media content planning and creation
- Topic research and ideation
- Content calendars and editorial planning
- SEO content optimization
- Multi-format content production
- Any issue labelled `content-automation`, `content`, `writing`, `blog`, or `seo-content`

---

## What This Skill Does

| Stage | Action | Tools Used |
|---|---|---|
| **Topic Ideation** | Research audience needs, trends, and validate topic demand | OpenRouter (ChatGPT/Perplexity prompts), TubeBuddy/VidIQ APIs (optional) |
| **Content Briefing** | Generate structured outlines with key points, SEO keywords, target audience | OpenRouter (Claude Opus 4 for research) |
| **Script Generation** | Create first drafts of articles, video scripts, social posts | OpenRouter (DeepSeek/Claude for generation) |
| **Content Refinement** | Fact-check, add conversational language, improve pacing, verify SEO | Human-in-loop + AI editing passes |
| **Multi-Format Export** | Convert content to blog HTML, video script, social posts, email | Template engine + format adapters |
| **Publishing** | Auto-commit to content repos, trigger deployment workflows | GitHub API, content management integration |

---

## The Content Automation Pipeline

### Phase 1: Research & Topic Ideation

```text
User/Trigger Input (topic area, target audience)
         ↓
AI Brainstorm Session (OpenRouter)
  - Generate 20-30 topic ideas
  - Create hooks, angles, formats
  - Suggest keywords and tags
         ↓
Topic Validation (optional)
  - Check search volume (TubeBuddy/VidIQ)
  - Analyze competition
  - Score topics by demand × feasibility
         ↓
Output: ranked_topics.json
```

### Phase 2: Outline & Script Generation

```text
Selected Topic + Brief
         ↓
AI Outline Generator (OpenRouter)
  - Research phase: gather facts, sources
  - Structure: intro, body sections, conclusion
  - SEO: keywords, meta description, title variants
         ↓
AI Script Writer (OpenRouter)
  - Generate 1st draft from outline
  - Target word count / duration
  - Include CTAs and links
         ↓
Output: draft_content.md
```

### Phase 3: Refinement & Quality Gates

```text
Draft Content
         ↓
AI Editor Pass 1: Fact-checking
  - Verify claims, statistics
  - Flag unsupported assertions
  - Add source citations
         ↓
AI Editor Pass 2: Tone & Pacing
  - Remove robotic language
  - Add conversational flow
  - Adjust reading level
         ↓
Human Review (optional)
  - Manual edits and approval
  - Brand voice alignment
         ↓
Output: final_content.md + metadata.json
```

### Phase 4: Multi-Format Export

```text
Final Content
         ↓
Format Adapters
  - Blog: HTML with SEO tags
  - Video: Timestamped script
  - Social: Thread/carousel format
  - Email: Newsletter-ready
         ↓
Auto-Publish or Stage for Review
```

---

## Configuration

### Required Secrets

| Secret | Purpose | Where to get it |
|---|---|---|
| `OPENROUTER_API_KEY` | AI content generation | [openrouter.ai](https://openrouter.ai) → Keys |
| `GITHUB_TOKEN` | Auto-commit generated content | Automatically provided in Actions |

### Optional Secrets (for validation)

| Secret | Purpose |
|---|---|
| `TUBEBUDDY_API_KEY` | YouTube keyword research and validation |
| `VIDIQ_API_KEY` | Video SEO and competition analysis |

### Repository Variables

| Variable | Purpose | Default |
|---|---|---|
| `CONTENT_TARGET_AUDIENCE` | Define who the content is for | "general audience" |
| `CONTENT_BRAND_VOICE` | Tone guidelines (professional/casual/technical) | "professional yet approachable" |
| `CONTENT_PRIMARY_KEYWORDS` | Core SEO keywords to target | "" |
| `CONTENT_AUTO_PUBLISH` | Auto-commit without human review | "false" |

---

## Workflow Triggers

### 1. Label-triggered (instant)

Any issue with labels `content-automation`, `content`, `writing`, or `blog` automatically triggers the content pipeline.

### 2. Scheduled (weekly)

`.github/workflows/content-automation.yml` runs weekly (Sunday 09:00 UTC) to:
- Generate 2-4 new blog post ideas
- Create content calendar for next week
- Refresh existing content based on trends

### 3. Manual Dispatch

GitHub Actions → Content Automation → Run workflow
- Custom topic input
- Target format (blog/video/social)
- Urgency (draft/final/publish)

---

## API Integration — OpenRouter

All AI generation uses OpenRouter with model selection based on task:

### Model Selection Strategy

| Task | Model | Why |
|---|---|---|
| Topic ideation & research | `anthropic/claude-opus-4` | Best reasoning and research |
| Content generation (first draft) | `deepseek/deepseek-chat` | Cost-effective, good quality |
| Editing & refinement | `anthropic/claude-sonnet-4.6` | Excellent editing, tone control |
| Fact-checking | `openai/gpt-5.4` | Strong at verification |

### Sample API Call

```bash
curl https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "anthropic/claude-opus-4",
    "messages": [{
      "role": "system",
      "content": "You are an expert content strategist. Generate 20 blog post topic ideas for a [TARGET_AUDIENCE] interested in [SUBJECT_AREA]. Each topic should: 1) Address a real pain point, 2) Have SEO potential (searchable keywords), 3) Be achievable in a 1200-1500 word article. Format as JSON array with: title, description, keywords[], estimated_search_volume (low/medium/high), competition_level (low/medium/high)."
    }, {
      "role": "user",
      "content": "Subject: Amazon product reviews\nAudience: Online shoppers looking for honest product recommendations\nFocus: Home electronics, small appliances, everyday items"
    }]
  }'
```

---

## Content Quality Gates

Every piece of content must pass these automated checks before publishing:

### 1. SEO Quality
- [ ] Title 50-60 characters
- [ ] Meta description 150-160 characters
- [ ] Primary keyword appears in title
- [ ] Primary keyword density 1-2%
- [ ] H2/H3 subheadings present
- [ ] Internal links included (min 2)
- [ ] External authoritative sources cited (min 1)
- [ ] Image alt text provided

### 2. Readability
- [ ] Flesch reading ease score > 60
- [ ] Average sentence length < 20 words
- [ ] Paragraph length < 150 words
- [ ] No jargon without explanation
- [ ] Active voice > 80%

### 3. Content Structure
- [ ] Clear introduction with hook
- [ ] Logical flow between sections
- [ ] Strong conclusion with CTA
- [ ] Word count within target range
- [ ] No orphaned sections

### 4. Technical Quality
- [ ] No broken links
- [ ] Images optimized (< 200KB)
- [ ] Markdown/HTML valid
- [ ] No spelling errors
- [ ] No placeholder text

---

## Output Structure

Generated content is stored in this structure:

```text
content-automation-output/
├── YYYY-MM-DD-{slug}/
│   ├── metadata.json         # Title, keywords, audience, timestamps
│   ├── brief.md              # Original topic brief and research
│   ├── outline.md            # Structured outline
│   ├── draft_v1.md           # First AI-generated draft
│   ├── draft_final.md        # Refined, ready-to-publish
│   ├── formats/
│   │   ├── blog.html         # Blog-ready HTML with SEO tags
│   │   ├── video-script.md   # Timestamped video script
│   │   ├── social-thread.md  # Twitter/X thread format
│   │   ├── linkedin-post.md  # LinkedIn post format
│   │   └── email.html        # Newsletter-ready HTML
│   └── assets/
│       ├── cover-image.jpg   # Generated or sourced cover image
│       └── social-card.jpg   # Social media preview image
```

---

## Content Templates

The skill includes pre-built templates for common content types:

| Template | Use Case | Structure |
|---|---|---|
| `how-to-guide` | Step-by-step tutorials | Problem → Solution → Steps → Conclusion |
| `product-review` | Product analysis | Overview → Specs → Pros/Cons → Verdict |
| `comparison` | "X vs Y" articles | Intro → Feature comparison table → Winner |
| `listicle` | "Top 10" style posts | Intro → Numbered list → Summary |
| `case-study` | Success stories | Challenge → Solution → Results → Takeaways |
| `news-analysis` | Industry news | What happened → Why it matters → Impact |

---

## Agent Workflow — Content Automation in Action

### Example: Generate a Blog Post

```text
Issue: "Write blog post about best budget headphones 2026"
Label: content-automation
         ↓
Workflow Triggered
         ↓
Step 1: Research Phase (2-3 min)
  - AI generates 10 title variants
  - Researches current headphone market
  - Identifies 5-7 top budget models
  - Gathers specs, prices, review quotes
         ↓
Step 2: Outline Generation (1 min)
  - Structure: Intro → Buying guide → Reviews → Comparison → Conclusion
  - SEO keywords: "budget headphones", "best cheap headphones", "affordable audio"
  - Word count target: 1500-1800
         ↓
Step 3: Draft Generation (3-4 min)
  - AI writes full article
  - Includes product links (Amazon affiliate)
  - Adds comparison table
  - Inserts images (placeholders with alt text)
         ↓
Step 4: Refinement (2-3 min)
  - Fact-check product specs
  - Improve conversational tone
  - Verify affiliate links work
  - Run readability checks
         ↓
Step 5: Multi-Format Export (1 min)
  - Blog HTML with schema.org markup
  - Twitter thread (8-10 tweets)
  - LinkedIn summary post
  - Email newsletter version
         ↓
Step 6: Output
  - Commit to content repo
  - Comment on issue with preview links
  - Tag for human review if AUTO_PUBLISH=false
         ↓
Total time: 10-15 minutes (vs 4-6 hours manually)
```

---

## Best Practices

### For AI-Generated Content

1. **Always fact-check**: AI can hallucinate statistics, dates, and details
2. **Edit for brand voice**: First drafts are generic — add your personality
3. **Add human insights**: Include personal experiences or unique perspectives
4. **Update regularly**: Content becomes stale — refresh quarterly
5. **Monitor performance**: Track which AI-generated topics perform best

### For Quality

1. **Use the refinement pass**: Never publish first draft
2. **Add citations**: Build trust with authoritative sources
3. **Include visuals**: AI-generated text needs human-curated images
4. **Test CTAs**: Verify links and calls-to-action work
5. **Mobile preview**: Check readability on mobile devices

### For SEO

1. **Research keywords first**: Don't let AI guess what to target
2. **Internal linking**: Connect to your existing content
3. **Schema markup**: Add structured data for rich results
4. **Meta optimization**: Craft compelling titles and descriptions
5. **Content depth**: Aim for comprehensive coverage, not thin content

---

## Labels

Add these labels to the repository (`.github/labels.yml`):

| Label | Color | Meaning |
|---|---|---|
| `content-automation` | `#00D4AA` | Trigger content automation pipeline |
| `content` | `#F7C948` | General content task |
| `writing` | `#FF69B4` | Writing/copywriting task |
| `blog` | `#7B68EE` | Blog post creation |
| `seo-content` | `#3DDCFF` | SEO-focused content |
| `content:draft` | `#FFA500` | Draft stage, needs review |
| `content:final` | `#00FF00` | Final, ready to publish |

---

## Integration with Existing Skills

Content Automation works alongside:

- **noimosai**: Marketing strategy and distribution
- **seo-metadata**: Technical SEO implementation
- **eeat-trust-authority**: Building author credibility
- **product-pipeline**: Auto-generate product documentation
- **openclaw-eeat**: Content distribution and authority building

---

## Troubleshooting

### "Content is too generic
- Add more specific context in the brief
- Include target keywords explicitly
- Run a second refinement pass with brand voice guidelines

### "Facts are incorrect
- Enable fact-checking gate
- Add authoritative sources to brief
- Use GPT-5.4 for verification pass

### "SEO score is low
- Run keyword research before generation
- Specify primary and secondary keywords
- Use SEO-focused templates

### "Tone doesn't match brand
- Update `CONTENT_BRAND_VOICE` variable
- Include example content in brief
- Add editing pass with tone guidelines

---

## Cost Estimates

Based on OpenRouter pricing (as of May 2026):

| Content Type | Tokens | Model | Cost | Time |
|---|---|---|---|---|
| Blog post (1500 words) | ~10k | Claude Opus 4 | ~$0.30 | 10-15 min |
| Video script (10 min) | ~5k | DeepSeek | ~$0.05 | 5-8 min |
| Social thread (10 tweets) | ~2k | Claude Sonnet 4.6 | ~$0.02 | 2-3 min |
| Email newsletter | ~4k | DeepSeek | ~$0.03 | 5 min |

**Monthly cost for 20 blog posts + 40 social posts + 4 newsletters:** ~$10-15

---

## Success Metrics

Track these KPIs to measure content automation effectiveness:

| Metric | Target | How to Measure |
|---|---|---|
| Content generation time | < 15 min per piece | Workflow duration |
| Cost per content piece | < $0.50 | OpenRouter API costs |
| First-draft quality score | > 70/100 | Internal quality rubric |
| SEO readiness | 100% pass gates | Automated checks |
| Human edit time saved | > 80% reduction | Before/after comparison |
| Content publish rate | 10+ pieces/week | GitHub commits |

---

## Maintenance

### Weekly
- Review generated content quality
- Update templates based on performance
- Refresh keyword lists

### Monthly  
- Audit AI model selection (cost vs quality)
- Update brand voice guidelines
- Review and improve automation rules

### Quarterly
- Analyze content performance (traffic, engagement)
- Optimize prompts and templates
- Update OpenRouter model selections

---

*This skill was created to solve the content creation automation challenge outlined in issue [WR] Add to revvel-standards to create automation. It implements both the planning phase (research and ideation) and production phase (script generation and refinement) using AI-powered automation while maintaining quality through validation gates and human-in-loop review options.*
