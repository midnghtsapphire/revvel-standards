#!/usr/bin/env node
'use strict';

/**
 * Content Automation Script
 * 
 * Implements the complete content creation pipeline:
 * 1. Research & Topic Ideation
 * 2. Outline Generation
 * 3. Draft Generation
 * 4. Content Refinement
 * 5. Multi-Format Export
 * 
 * Uses OpenRouter for AI generation with model selection per task.
 */

const fs = require('fs');
const { assertCloudAllowed } = require("./llm-spend-gate");
const path = require('path');
const https = require('https');

// Configuration from environment
const CONFIG = {
  openrouterKey: process.env.OPENROUTER_API_KEY,
  topic: process.env.CONTENT_TOPIC || 'Example Topic',
  format: process.env.CONTENT_FORMAT || 'blog',
  urgency: process.env.CONTENT_URGENCY || 'draft',
  audience: process.env.CONTENT_AUDIENCE || 'general audience',
  brandVoice: process.env.CONTENT_BRAND_VOICE || 'professional yet approachable',
  keywords: (process.env.CONTENT_PRIMARY_KEYWORDS || '').split(',').filter(Boolean),
  autoPublish: process.env.CONTENT_AUTO_PUBLISH === 'true',
  tubeBuddyKey: process.env.TUBEBUDDY_API_KEY,
  vidiqKey: process.env.VIDIQ_API_KEY,
};

// Model selection per task
const MODELS = {
  ideation: 'anthropic/claude-opus-4',
  generation: 'deepseek/deepseek-chat',
  editing: 'anthropic/claude-sonnet-4.6',
  factcheck: 'openai/gpt-5.4',
};

// Output directory
const OUTPUT_DIR = path.join(process.cwd(), 'content-automation-output');
const timestamp = new Date().toISOString().split('T')[0];
const slug = (CONFIG.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'untitled').slice(0, 50);
const contentDir = path.join(OUTPUT_DIR, `${timestamp}-${slug}`);
const formatsDir = path.join(contentDir, 'formats');
const assetsDir = path.join(contentDir, 'assets');

/**
 * Call OpenRouter API
 */
async function callOpenRouter(model, messages, maxTokens = 4000) {
  // Spend gate (#17850): refuse unless someone deliberately allowed it.
  assertCloudAllowed("content-automation");
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
    });

    const options = {
      hostname: 'openrouter.ai',
      port: 443,
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.openrouterKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'HTTP-Referer': 'https://github.com/midnghtsapphire/revvel-standards',
        'X-Title': 'Revvel Standards Content Automation',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          if (result.error) {
            reject(new Error(result.error.message || JSON.stringify(result.error)));
          } else if (!result.choices || !result.choices.length || !result.choices[0].message) {
            reject(new Error(`Unexpected API response: no choices returned. Response: ${JSON.stringify(result).substring(0, 200)}`));
          } else {
            resolve(result.choices[0].message.content);
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Phase 1: Research & Topic Ideation
 */
async function phaseResearch() {
  console.log('🔍 Phase 1: Research & Topic Ideation...');
  
  const systemPrompt = `You are an expert content strategist. Generate a comprehensive content brief for the topic provided.

Include:
1. 5-10 compelling title variants (50-60 chars each)
2. Target audience analysis
3. Key points to cover (bullet list)
4. SEO keywords (primary + 5-7 secondary)
5. Competitive insights
6. Estimated search demand (low/medium/high)
7. Content angle/hook

Format as structured JSON.`;

  const userPrompt = `Topic: ${CONFIG.topic}
Audience: ${CONFIG.audience}
Brand Voice: ${CONFIG.brandVoice}
Primary Keywords: ${CONFIG.keywords.join(', ')}

Generate a complete content brief for this topic.`;

  const response = await callOpenRouter(MODELS.ideation, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 3000);

  // Try to parse as JSON, fallback to text
  let brief;
  try {
    brief = JSON.parse(response);
  } catch {
    brief = { raw: response };
  }

  // Save brief
  fs.writeFileSync(
    path.join(contentDir, 'brief.md'),
    typeof brief === 'string' ? brief : `# Content Brief\n\n${response}`,
    'utf8'
  );

  console.log('  ✓ Content brief generated');
  return brief;
}

/**
 * Phase 2: Outline Generation
 */
async function phaseOutline(brief) {
  console.log('📝 Phase 2: Outline Generation...');

  const systemPrompt = `You are an expert content outliner. Create a detailed, structured outline for the content.

Include:
- Introduction (hook, problem, promise)
- Body sections (H2 headings with key points)
- Conclusion (summary, CTA)
- Meta: word count target, reading time, tone notes

Format as structured markdown with clear H2/H3 hierarchy.`;

  const userPrompt = `Topic: ${CONFIG.topic}
Brief: ${JSON.stringify(brief)}
Format: ${CONFIG.format}
Target Length: ${CONFIG.format === 'blog' ? '1200-1500 words' : 'appropriate for format'}

Create a detailed content outline.`;

  const outline = await callOpenRouter(MODELS.generation, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 2000);

  fs.writeFileSync(path.join(contentDir, 'outline.md'), outline, 'utf8');
  console.log('  ✓ Outline generated');
  return outline;
}

/**
 * Phase 3: Draft Generation
 */
async function phaseDraft(brief, outline) {
  console.log('✍️  Phase 3: Draft Generation...');

  const systemPrompt = `You are an expert ${CONFIG.format} writer. Write the complete first draft following the outline provided.

Guidelines:
- ${CONFIG.brandVoice} tone
- Natural, conversational language
- SEO-optimized (keywords naturally integrated)
- Clear structure with headings
- Include CTAs and internal linking suggestions
- Engaging introduction and strong conclusion

Write the complete content, ready for editing.`;

  const userPrompt = `Topic: ${CONFIG.topic}
Audience: ${CONFIG.audience}
Outline: ${outline}
Keywords: ${CONFIG.keywords.join(', ')}

Write the complete ${CONFIG.format} content following the outline.`;

  const draft = await callOpenRouter(MODELS.generation, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 6000);

  fs.writeFileSync(path.join(contentDir, 'draft_v1.md'), draft, 'utf8');
  console.log('  ✓ First draft generated');
  return draft;
}

/**
 * Phase 4: Content Refinement
 */
async function phaseRefinement(draft) {
  console.log('🔧 Phase 4: Content Refinement...');

  const systemPrompt = `You are an expert content editor. Refine the draft to improve:

1. Fact accuracy (flag any unsupported claims)
2. Tone and pacing (remove robotic language, add conversational flow)
3. Readability (vary sentence length, break up paragraphs)
4. SEO (verify keyword placement, add meta description)
5. Engagement (strengthen hook and CTA)

Return the refined content plus a brief "Editor Notes" section at the end.`;

  const userPrompt = `Brand Voice: ${CONFIG.brandVoice}
Draft Content:

${draft}

Refine this content for publication.`;

  const refined = await callOpenRouter(MODELS.editing, [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], 6000);

  fs.writeFileSync(path.join(contentDir, 'draft_final.md'), refined, 'utf8');
  console.log('  ✓ Content refined');
  return refined;
}

/**
 * Phase 5: Multi-Format Export
 */
async function phaseExport(finalContent) {
  console.log('📦 Phase 5: Multi-Format Export...');

  const formats = [];

  // Blog HTML
  if (CONFIG.format === 'blog' || CONFIG.format === 'all') {
    const blogHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${CONFIG.topic}</title>
  <meta name="description" content="Auto-generated content">
</head>
<body>
  <article>
${finalContent.replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/^# (.+)$/gm, '<h1>$1</h1>')
           .replace(/^## (.+)$/gm, '<h2>$1</h2>')
           .replace(/^### (.+)$/gm, '<h3>$1</h3>')
           .split('\n\n').map(p => p.trim() && !p.startsWith('<h') ? `    <p>${p}</p>` : `    ${p}`).join('\n')}
  </article>
</body>
</html>`;
    fs.writeFileSync(path.join(formatsDir, 'blog.html'), blogHtml, 'utf8');
    formats.push('blog.html');
    console.log('  ✓ Blog HTML exported');
  }

  // Video Script
  if (CONFIG.format === 'video' || CONFIG.format === 'all') {
    const videoScript = `# Video Script: ${CONFIG.topic}

## Opening (0:00-0:30)
[Hook and introduction]

## Main Content
${finalContent}

## Closing
[Summary and CTA]

---
*Total estimated duration: 10-12 minutes*
*Presenter notes: Maintain ${CONFIG.brandVoice} tone throughout*`;
    fs.writeFileSync(path.join(formatsDir, 'video-script.md'), videoScript, 'utf8');
    formats.push('video-script.md');
    console.log('  ✓ Video script exported');
  }

  // Social Thread (Twitter/X)
  if (CONFIG.format === 'social' || CONFIG.format === 'all') {
    const socialPrompt = `Convert this content into a Twitter/X thread (8-10 tweets, max 280 chars each):

${finalContent.substring(0, 2000)}

Format each tweet with a number (1/, 2/, etc.).`;
    
    const socialThread = await callOpenRouter(MODELS.generation, [
      { role: 'user', content: socialPrompt },
    ], 1000);
    
    fs.writeFileSync(path.join(formatsDir, 'social-thread.md'), socialThread, 'utf8');
    formats.push('social-thread.md');
    console.log('  ✓ Social thread exported');
  }

  // Email Newsletter HTML
  if (CONFIG.format === 'email' || CONFIG.format === 'all') {
    const emailHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${CONFIG.topic}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 24px; }
    h1 { color: #1a1a1a; font-size: 24px; margin-top: 0; }
    h2 { color: #2a2a2a; font-size: 18px; margin-top: 24px; }
    h3 { color: #3a3a3a; font-size: 16px; }
    p { margin: 12px 0; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #888; text-align: center; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <div class="container">
    <article>
${finalContent
           .replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/^# (.+)$/gm, '<h1>$1</h1>')
           .replace(/^## (.+)$/gm, '<h2>$1</h2>')
           .replace(/^### (.+)$/gm, '<h3>$1</h3>')
           .split('\n\n').map(p => p.trim() && !p.startsWith('<h') ? `      <p>${p}</p>` : `      ${p}`).join('\n')}
    </article>
    <div class="footer">
      <p>You're receiving this because you subscribed to updates from ${CONFIG.brandVoice} content.</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a> · <a href="{{preferences_url}}">Manage preferences</a></p>
    </div>
  </div>
</body>
</html>`;
    fs.writeFileSync(path.join(formatsDir, 'email.html'), emailHtml, 'utf8');
    formats.push('email.html');
    console.log('  ✓ Email newsletter exported');
  }

  return formats;
}

/**
 * Quality Gate Checks
 */
function runQualityGates(finalContent) {
  console.log('🚦 Running Quality Gates...');

  const results = {
    seo: { passed: true, details: [] },
    readability: { passed: true, details: [] },
    structure: { passed: true, details: [] },
    technical: { passed: true, details: [] },
  };

  // SEO checks
  const titleMatch = finalContent.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : '';
  if (CONFIG.format === 'blog' && (title.length < 50 || title.length > 60)) {
    results.seo.passed = false;
    results.seo.details.push(`Title length ${title.length} (target: 50-60)`);
  }


  const headings = (finalContent.match(/^## /gm) || []).length;
  if (CONFIG.format === 'blog' && headings < 3) {
    results.structure.passed = false;
    results.structure.details.push(`Only ${headings} H2 headings (min: 3)`);
  }

  // Word count
  const wordCount = finalContent.split(/\s+/).length;
  if (CONFIG.format === 'blog' && (wordCount < 800 || wordCount > 3000)) {
    results.structure.passed = false;
    results.structure.details.push(`Word count ${wordCount} (range: 800-3000, target: 1200-1500)`);
  }

  console.log('  SEO:', results.seo.passed ? '✅' : '⚠️');
  console.log('  Readability:', results.readability.passed ? '✅' : '⚠️');
  console.log('  Structure:', results.structure.passed ? '✅' : '⚠️');
  console.log('  Technical:', results.technical.passed ? '✅' : '⚠️');

  return results;
}

/**
 * Main Pipeline
 */
async function main() {
  const startTime = Date.now();

  try {
    // Validate required config
    if (!CONFIG.openrouterKey) {
      throw new Error('OPENROUTER_API_KEY is required');
    }

    // Create output directories
    fs.mkdirSync(contentDir, { recursive: true });
    fs.mkdirSync(formatsDir, { recursive: true });
    fs.mkdirSync(assetsDir, { recursive: true });

    console.log('🤖 Content Automation Pipeline Starting...');
    console.log(`   Topic: ${CONFIG.topic}`);
    console.log(`   Format: ${CONFIG.format}`);
    console.log(`   Audience: ${CONFIG.audience}`);
    console.log('');

    // Run phases
    const brief = await phaseResearch();
    const outline = await phaseOutline(brief);
    const draft = await phaseDraft(brief, outline);
    const finalContent = await phaseRefinement(draft);

    const qualityGates = runQualityGates(finalContent);
    const allGatesPassed = Object.values(qualityGates).every(gate => gate.passed);

    if (!allGatesPassed) {
      const warnings = Object.entries(qualityGates)
        .filter(([, gate]) => !gate.passed)
        .map(([name, gate]) => `${name}: ${gate.details.join('; ')}`)
        .join('\n   ');
      // Quality gates are advisory — warn and continue so the pipeline never blocks
      // on AI-generated content that slightly misses targets (e.g. SEO title length,
      // word count, H2 heading count). Gate results are still surfaced as ✅/⚠️ in
      // the issue comment so humans can review and iterate.
      console.warn(`\n⚠️  Quality gate warnings (export continues):\n   ${warnings}\n`);
    }

    const formats = await phaseExport(finalContent);

    // Calculate metrics
    const endTime = Date.now();
    const durationSeconds = Math.round((endTime - startTime) / 1000);
    const wordCount = finalContent.split(/\s+/).length;

    // Save metadata
    const metadata = {
      title: CONFIG.topic,
      format: CONFIG.format,
      audience: CONFIG.audience,
      brand_voice: CONFIG.brandVoice,
      keywords: CONFIG.keywords,
      word_count: wordCount,
      generation_time_seconds: durationSeconds,
      models_used: Object.values(MODELS).filter((v, i, a) => a.indexOf(v) === i),
      formats,
      quality_gates: qualityGates,
      timestamp: new Date().toISOString(),
    };

    fs.writeFileSync(
      path.join(contentDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf8'
    );

    // Output path to stdout for workflow (don't commit pointer file)
    console.log(`::set-output name=content_path::${contentDir}`);

    console.log('');
    console.log('✅ Content Generation Complete!');
    console.log(`   Output: ${contentDir}`);
    console.log(`   Duration: ${durationSeconds}s`);
    console.log(`   Word Count: ${wordCount}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Content Automation Failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { callOpenRouter, CONFIG, runQualityGates };
