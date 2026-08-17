# Content Automation Examples

This document provides practical examples of using the content automation skill in the revvel-standards repository.

---

## Example 1: Generate a Blog Post via Issue

### Scenario
You want to generate a blog post about "Best Budget Headphones 2026"

### Steps
1. Go to the repository: <https://github.com/midnghtsapphire/revvel-standards>
2. Click **Issues** → **New Issue**
3. Set the title:
   ```text
   Write blog post about best budget headphones 2026
   ```
4. Add description (optional):
   ```text
   Target audience: Young professionals, students
   Keywords: budget headphones, affordable audio, wireless headphones
   Tone: Professional yet approachable
   ```
5. Add the label: **`content-automation`**
6. Click **Submit new issue**

### What Happens
- Within seconds, the workflow triggers
- Bot posts acknowledgment comment with progress tracker
- Pipeline runs for ~10-15 minutes:
  - Research phase (2-3 min)
  - Outline generation (1 min)
  - Draft creation (3-4 min)
  - Refinement (2-3 min)
  - Multi-format export (1 min)
- Bot posts completion comment with:
  - Generated content location
  - Word count and quality scores
  - Available formats
  - Next steps

### Output
Generated content is saved to:
```text
content-automation-output/2026-05-02-best-budget-headphones-2026/
├── metadata.json
├── brief.md
├── outline.md
├── draft_v1.md
├── draft_final.md
└── formats/
    ├── blog.html
    ├── video-script.md
    ├── social-thread.md
    └── email.html
```

---

## Example 2: Generate Video Script via Workflow Dispatch

### Scenario
You want to create a video script manually without opening an issue

### Steps
1. Go to **Actions** → **Content Automation**
2. Click **Run workflow** (top right)
3. Fill in the inputs:
   - **Topic:** "How to choose the right burial insurance"
   - **Format:** video
   - **Urgency:** final
   - **Target audience:** Seniors 65+, family members
4. Click **Run workflow**

### What Happens
- Workflow starts immediately
- Runs all 5 pipeline phases
- Generates video script with timestamps
- Commits to repository automatically

### Output
```text
content-automation-output/2026-05-02-how-to-choose-the-right-burial-insurance/
├── metadata.json
├── brief.md
├── outline.md
├── draft_v1.md
├── draft_final.md
└── formats/
    └── video-script.md  # Timestamped video script
```

---

## Example 3: Weekly Content Calendar (Automated)

### Scenario
Every Sunday at 09:00 UTC, the system automatically generates content ideas

### How It Works
- Triggered by schedule: `cron: '0 9 * * 0'`
- Runs the standard blog pipeline with topic "Weekly Content Calendar"
- Generates a content calendar post through the 5-phase pipeline (research, outline, draft, refinement, export)
- Commits to repository

### Output
The scheduled run uses the standard blog pipeline with topic "Weekly Content Calendar":
```text
content-automation-output/2026-05-02-weekly-content-calendar/
├── metadata.json
├── brief.md
├── outline.md
├── draft_v1.md
├── draft_final.md
└── formats/
    └── blog.html
```

---

## Example 4: Generate Social Media Thread

### Scenario
You have a blog post and want to convert it to a Twitter/X thread

### Steps
1. Open an issue or use workflow dispatch
2. Set topic to your blog post title
3. Set format: **social**
4. Provide the blog content in description (or reference URL)

### Output
```text
content-automation-output/2026-05-02-your-topic/
└── formats/
    └── social-thread.md
```

**Sample social-thread.md:**
```markdown
# Twitter/X Thread: Best Budget Headphones 2026

1/ 🎧 Looking for affordable headphones that don't compromise on quality? 
I tested 15 budget headphones under $100. Here are the winners 👇

2/ First up: The TechSound Pro ($79.99)
✅ 40-hour battery life
✅ Active noise cancellation
✅ Comfortable for all-day wear
Perfect for: Students, remote workers

3/ Runner-up: AudioMax Lite ($59.99)
✅ Best bass in its price range
✅ Foldable design
✅ 30-hour battery
Perfect for: Commuters, gym-goers

...

10/ Full comparison with specs, pros/cons, and where to buy 
👉 [blog link]

What's your budget headphone pick? Drop it below! 👇
```

---

## Example 5: Multi-Format Content Generation

### Scenario
You want to generate content in ALL formats at once

### Steps
1. Use workflow dispatch
2. Set format: **all**
3. Provide topic and context

### Output
All formats generated simultaneously:
```text
content-automation-output/2026-05-02-your-topic/
└── formats/
    ├── blog.html            # Ready-to-publish blog HTML
    ├── video-script.md      # Timestamped video script
    ├── social-thread.md     # Twitter/X thread format
    ├── linkedin-post.md     # LinkedIn post format
    └── email.html           # Newsletter-ready HTML
```

---

## Example 6: Custom Brand Voice

### Scenario
You want content in a specific tone (technical, casual, formal, etc.)

### Setup
1. Set repository variable: `CONTENT_BRAND_VOICE`
   - Go to Settings → Secrets and variables → Actions → Variables
   - Click **New repository variable**
   - Name: `CONTENT_BRAND_VOICE`
   - Value: "Technical and precise, but friendly. Use analogies."

### Usage
All generated content will follow this voice automatically.

### Example Outputs

**Professional yet approachable (default):**
> "When shopping for budget headphones, you'll want to consider three key factors: sound quality, comfort, and battery life. Let's break down each one."

**Technical and precise:**
> "Budget headphone selection requires evaluating frequency response (20Hz-20kHz standard), driver size (40mm optimal), and impedance (32Ω for portable use). Consider these specifications..."

**Casual and fun:**
> "Alright, headphone hunters! 🎧 Let's talk budget picks that actually slap. We're diving into the good stuff without breaking the bank..."

---

## Example 7: SEO-Focused Content

### Scenario
You want highly optimized content targeting specific keywords

### Setup
1. Set repository variable: `CONTENT_PRIMARY_KEYWORDS`
   - Name: `CONTENT_PRIMARY_KEYWORDS`
   - Value: "budget headphones 2026,best cheap headphones,affordable wireless headphones"

### Usage
Keywords are automatically:
- Included in title
- Distributed naturally (1-2% density)
- Added to meta description
- Tagged in metadata

### Quality Gate Checks
Content must pass:
- ✅ Primary keyword in title
- ✅ Keyword density 1-2%
- ✅ Meta description 150-160 chars
- ✅ H2/H3 headings include keywords

---

## Example 8: Human-in-Loop Review

### Scenario
You want to review all content before it's marked final

### Setup (Default Behavior)
- `CONTENT_AUTO_PUBLISH` defaults to `false`
- All content is tagged with `content:draft` label
- Human review required before publishing

### Workflow
1. Content is generated and committed
2. Issue gets `content:draft` label
3. Review generated content in `content-automation-output/`
4. Make edits directly to `draft_final.md`
5. Add `content:final` label when approved
6. Close issue when published

### Auto-Publish Mode (Optional)
Set `CONTENT_AUTO_PUBLISH` to `true`:
- Skips human review
- Content marked `content:final` immediately
- Suitable for high-volume automation

---

## Example 9: Error Handling

### Scenario
Content generation fails (API error, rate limit, etc.)

### What Happens
1. Workflow fails gracefully
2. Bot posts error comment to issue with:
   - Error details
   - Common causes
   - Next steps
3. Self-heal job currently logs a fallback placeholder (retry logic is not implemented yet)
4. If generation fails, review the workflow run logs and re-run after fixing the root cause

### Recovery Steps
1. Check workflow logs for specific error
2. Common fixes:
   - Verify `OPENROUTER_API_KEY` is set
   - Check API rate limits
   - Simplify topic if too vague
   - Wait and retry if transient failure

---

## Example 10: Cost Tracking

### Monitoring Costs
Check metadata.json for each generated piece:

```json
{
  "title": "Best Budget Headphones 2026",
  "word_count": 1543,
  "generation_time_seconds": 847,
  "models_used": [
    "anthropic/claude-opus-4",
    "deepseek/deepseek-chat",
    "anthropic/claude-sonnet-4.6"
  ],
  "estimated_cost_usd": 0.32
}
```

### Monthly Cost Estimation
- 20 blog posts: ~$6-10
- 40 social posts: ~$0.80
- 4 newsletters: ~$0.12
- **Total: ~$10-15/month**

Compare to:
- Manual writing: 100+ hours ($2,500-4,000 at $25/hr)
- **ROI: 200-400x**

---

## Tips & Best Practices

### For Best Results

1. **Be specific in topics**
   - ❌ Bad: "Write about headphones"
   - ✅ Good: "Compare top 5 wireless headphones under $100 for students"

2. **Provide context**
   - Target audience
   - Primary keywords
   - Desired tone
   - Word count target

3. **Review and edit**
   - AI is excellent but not perfect
   - Always fact-check statistics
   - Add personal insights
   - Verify links work

4. **Use keywords strategically**
   - Research before generating
   - 1-2 primary keywords max
   - 5-7 secondary keywords

5. **Optimize images separately**
   - Content automation handles text
   - Add images manually
   - Use tools like Midjourney, DALL-E, or stock photos

### Common Pitfalls

❌ **Don't:**
- Generate content without human review (for important topics)
- Publish first drafts without editing
- Ignore quality gate warnings
- Use vague or overly broad topics
- Forget to add visuals and formatting

✅ **Do:**
- Start with the refinement pass
- Add citations for claims
- Test CTAs and links
- Preview on mobile
- Track performance metrics

---

## Integration Examples

### With NoimosAI
1. Generate content with content-automation
2. NoimosAI handles distribution:
   - Social media posting
   - Email newsletters
   - SEO optimization
   - Affiliate link insertion

### With Product Pipeline
1. Product pipeline identifies new product opportunity
2. Triggers content-automation for product docs
3. Generates:
   - Product description
   - Feature comparison
   - User guide
   - FAQ

### With SEO Metadata Skill
1. Content-automation generates article
2. seo-metadata adds:
   - Schema.org markup
   - Open Graph tags
   - Twitter Cards
   - Structured data

---

## Troubleshooting

### Content is too generic
**Solution:** Add more specific context, keywords, and examples in issue description

### Facts are incorrect
**Solution:** Run fact-checking pass, add authoritative sources to brief

### SEO score is low
**Solution:** Research keywords first, specify primary/secondary keywords explicitly

### Generation takes too long
**Solution:** Normal 10-15 min. If longer, check workflow logs for API delays

### Cost is too high
**Solution:** Switch to cheaper models (DeepSeek), reduce word counts, batch requests

---

*For more information, see:*
- `skills/content-automation/SKILL.md` — Complete skill documentation
- `standards/CONTENT_AUTOMATION_STANDARD.md` — Implementation standard
- `.github/workflows/content-automation.yml` — Workflow configuration
- `scripts/content-automation.js` — Pipeline implementation
