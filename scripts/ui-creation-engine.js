#!/usr/bin/env node

/**
 * UI Creation Engine
 * 
 * Comprehensive engine for creating cutting-edge websites and mobile apps
 * that compete with top vendors in the USA.
 * 
 * Features:
 * - Competitive research using OpenRouter swarms
 * - Image optimization with SEO filenames and alt text
 * - Comprehensive SEO metadata generation
 * - UI/UX pattern analysis and recommendations
 * - Complete scaffolding generation
 * 
 * Usage:
 *   node scripts/ui-creation-engine.js \
 *     --business="Soul2Bowl" \
 *     --industry="catering" \
 *     --location="St. Louis, MO" \
 *     --output="./output"
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE = "openrouter.ai";
const OPENROUTER_PATH = "/api/v1/chat/completions";

// Default models for each phase
const MODELS = {
  scout: "anthropic/claude-sonnet-4",
  synthesizer: "anthropic/claude-opus-4",
  design: "anthropic/claude-sonnet-4",
  metadata: "anthropic/claude-sonnet-4",
  altText: "anthropic/claude-haiku-4-5",
};

// ---------------------------------------------------------------------------
// Argument Parsing
// ---------------------------------------------------------------------------

function parseArgs() {
  const args = {
    business: "",
    industry: "",
    location: "",
    services: "",
    platform: "website",
    competitors: "",
    output: "./ui-creation-output",
  };

  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--([^=]+)=(.+)$/);
    if (match) {
      const [, key, value] = match;
      args[key] = value;
    }
  });

  return args;
}

// ---------------------------------------------------------------------------
// OpenRouter HTTP Helper
// ---------------------------------------------------------------------------

function callOpenRouter(model, systemPrompt, userPrompt) {
  return new Promise((resolve, reject) => {
    if (!OPENROUTER_API_KEY) {
      return reject(new Error("OPENROUTER_API_KEY environment variable is required."));
    }

    const payload = JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    });

    const options = {
      hostname: OPENROUTER_BASE,
      path: OPENROUTER_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://github.com/midnghtsapphire/revvel-standards",
        "X-Title": "Revvel UI Creation Engine",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`OpenRouter API error: ${res.statusCode} ${data}`));
        }
        try {
          const json = JSON.parse(data);
          const content = json.choices?.[0]?.message?.content;
          if (!content) {
            return reject(new Error("No content in OpenRouter response"));
          }
          resolve(content);
        } catch (err) {
          reject(new Error(`Failed to parse OpenRouter response: ${err.message}`));
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Research Swarm: Phase 1 - Competitive Research
// ---------------------------------------------------------------------------

async function runCompetitiveResearchSwarm(args) {
  console.log("\n🔬 Phase 1: Competitive Research Swarm");
  console.log("=" .repeat(60));

  const scouts = [
    {
      name: "Scout-1: Top Competitors",
      systemPrompt: `You are Scout-1, a competitive research specialist. Your job is to identify and analyze the top 10-15 competitors in the specified industry and location.`,
      userPrompt: `Find and analyze the top 10-15 ${args.industry} businesses in ${args.location} and the USA overall.

For each competitor, provide:
1. Business name and website URL
2. Primary services/products offered
3. Key features of their website/app
4. Design quality (1-10)
5. Unique selling propositions
6. Target audience

Format your response as a structured list with clear sections.`,
    },
    {
      name: "Scout-2: UI/UX Patterns",
      systemPrompt: `You are Scout-2, a UI/UX design analyst. Your job is to identify common design patterns, trends, and innovations in the target industry.`,
      userPrompt: `Analyze the UI/UX patterns used by leading ${args.industry} businesses.

Focus on:
1. Visual design trends (colors, typography, layout)
2. Navigation patterns and information architecture
3. Conversion elements (CTAs, forms, checkout flows)
4. Mobile vs desktop experiences
5. Interactive features and animations
6. Accessibility features

Provide a comprehensive analysis of what makes the best designs stand out.`,
    },
    {
      name: "Scout-3: SEO Analysis",
      systemPrompt: `You are Scout-3, an SEO and metadata specialist. Your job is to analyze how top performers optimize for search engines.`,
      userPrompt: `Analyze the SEO strategies of top ${args.industry} businesses in ${args.location}.

Focus on:
1. Common keywords and search terms
2. Meta title and description patterns
3. Use of structured data (JSON-LD)
4. Image optimization practices
5. Page load performance
6. Mobile-friendliness
7. Local SEO strategies

Identify the top 20 keywords that should be targeted.`,
    },
    {
      name: "Scout-4: Feature Analysis",
      systemPrompt: `You are Scout-4, a product feature analyst. Your job is to identify must-have, nice-to-have, and breakthrough features.`,
      userPrompt: `Analyze the features offered by top ${args.industry} businesses.

Categorize features into:
1. **Baseline Features** (100% of competitors have these)
2. **Competitive Features** (50-80% have these)
3. **Differentiators** (10-30% have these)
4. **Gaps** (features nobody offers but customers might want)

For each feature, explain why it matters and how it's implemented.`,
    },
    {
      name: "Scout-5: Technology Stack",
      systemPrompt: `You are Scout-5, a technology stack analyst. Your job is to identify the tools, frameworks, and platforms used by top competitors.`,
      userPrompt: `Analyze the technology choices of leading ${args.industry} businesses.

Focus on:
1. Frontend frameworks (React, Next.js, Vue, etc.)
2. CMS platforms (WordPress, Shopify, custom, etc.)
3. Hosting and infrastructure
4. Third-party integrations (payment, booking, CRM)
5. Analytics and tracking tools
6. Performance optimization techniques

Recommend the best technology stack for a new ${args.platform}.`,
    },
  ];

  const results = [];

  // Run scouts in parallel
  console.log(`\n⚡ Running ${scouts.length} Scout agents in parallel...`);
  const startTime = Date.now();

  const scoutPromises = scouts.map(async (scout) => {
    console.log(`  → [${scout.name}] Starting...`);
    try {
      const content = await callOpenRouter(MODELS.scout, scout.systemPrompt, scout.userPrompt);
      console.log(`  ✅ [${scout.name}] Complete`);
      return { name: scout.name, content };
    } catch (err) {
      console.warn(`  ⚠️  [${scout.name}] Failed: ${err.message}`);
      return { name: scout.name, content: `Error: ${err.message}`, error: true };
    }
  });

  const scoutResults = await Promise.all(scoutPromises);
  results.push(...scoutResults);

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Research swarm complete in ${duration}s`);

  return results;
}

// ---------------------------------------------------------------------------
// Synthesis: Phase 2 - Competitive Analysis Report
// ---------------------------------------------------------------------------

async function synthesizeCompetitiveAnalysis(scoutResults, args) {
  console.log("\n📊 Phase 2: Synthesizing Competitive Analysis");
  console.log("=" .repeat(60));

  const systemPrompt = `You are Sage, the Revvel Research Synthesizer. Your job is to take findings from multiple Scout agents and create a comprehensive competitive analysis report.

Format the report with clear sections, actionable insights, and specific recommendations.`;

  const userPrompt = `Synthesize the following research findings into a comprehensive competitive analysis report for ${args.business} (${args.industry} in ${args.location}).

Scout Research Findings:

${scoutResults
  .map((r) => `\n## ${r.name}\n\n${r.content}`)
  .join("\n\n---\n\n")}

Create a report with these sections:

# Competitive Analysis: ${args.business}

## Executive Summary
[2-3 paragraph overview of the competitive landscape]

## Top 10 Competitors
[Ranked list with scores, strengths, weaknesses, URLs]

## Industry Patterns
[Common features, design trends, technology choices]

## SEO & Keywords
[Top 20 keywords to target, meta patterns, schema recommendations]

## Gaps & Opportunities
[What competitors are missing, underserved niches, innovative angles]

## Differentiation Strategy
[3-5 unique features/angles that would make ${args.business} stand out]

## Recommendations

### Baseline Features (Must Have)
[List with checkboxes]

### Competitive Features (Match Leaders)
[List with checkboxes]

### Breakthrough Features (Exceed Leaders)
[List with checkboxes]

## Technology Recommendations
[Recommended tech stack with rationale]

---

Make the report actionable, specific, and data-driven.`;

  console.log("  → [Sage: Synthesizer] Analyzing findings...");
  const synthesis = await callOpenRouter(MODELS.synthesizer, systemPrompt, userPrompt);
  console.log("  ✅ [Sage: Synthesizer] Complete");

  return synthesis;
}

// ---------------------------------------------------------------------------
// Image Optimization: Phase 3
// ---------------------------------------------------------------------------

async function generateImageOptimizationPlan(synthesis, args) {
  console.log("\n🖼️  Phase 3: Image Optimization Plan");
  console.log("=" .repeat(60));

  const systemPrompt = `You are Pixel, the UI/Image specialist. Your job is to create an image optimization plan including SEO filenames and descriptive alt text.`;

  const userPrompt = `Based on this competitive analysis for ${args.business}:

${synthesis}

Create an image optimization plan with:

1. **Required Images** (list each image needed for the website)
2. **SEO Filenames** (descriptive, keyword-rich names)
3. **Alt Text** (5-15 words, descriptive, natural keywords)
4. **Sizes & Formats** (dimensions, WebP format, file size targets)
5. **Optimization Pipeline** (conversion steps, compression settings)

Format:
\`\`\`json
{
  "images": [
    {
      "name": "hero-image",
      "filename": "${args.business.toLowerCase().replace(/\s+/g, '-')}-[descriptive-name]-hero-1920x1080.webp",
      "alt": "[5-15 word descriptive alt text with keywords]",
      "size": "1920x1080",
      "maxFileSize": "300KB",
      "purpose": "Homepage hero section"
    }
  ]
}
\`\`\`

Ensure every filename follows: [business]-[subject]-[context]-[size].webp`;

  console.log("  → [Pixel: Image Optimizer] Generating plan...");
  const plan = await callOpenRouter(MODELS.design, systemPrompt, userPrompt);
  console.log("  ✅ [Pixel: Image Optimizer] Complete");

  return plan;
}

// ---------------------------------------------------------------------------
// SEO Metadata: Phase 4
// ---------------------------------------------------------------------------

async function generateSEOMetadata(synthesis, args) {
  console.log("\n🔍 Phase 4: SEO Metadata Generation");
  console.log("=" .repeat(60));

  const systemPrompt = `You are Sage, the SEO metadata specialist. Your job is to generate comprehensive, high-quality metadata that achieves Lighthouse scores of 95+.`;

  const userPrompt = `Based on this competitive analysis for ${args.business}:

${synthesis}

Generate complete SEO metadata for these pages:
1. Homepage
2. Services/Menu page
3. Order/Booking page
4. About page
5. Contact page

For each page, provide:

\`\`\`typescript
export const metadata: Metadata = {
  title: '[Title] — [Value Prop] | [Location]', // Max 60 chars
  description: '[One compelling sentence 150-160 chars]',
  keywords: '[keyword1, keyword2, keyword3]',
  alternates: { canonical: 'https://[domain].com/[path]' },
  openGraph: {
    title: '[OG Title]',
    description: '[OG Description]',
    url: 'https://[domain].com/[path]',
    siteName: '${args.business}',
    images: [{
      url: 'https://[domain].com/[seo-filename].webp',
      width: 1200,
      height: 630,
      alt: '[Descriptive alt text with keywords]'
    }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '[Twitter Title]',
    description: '[Twitter Description]',
    images: {
      url: 'https://[domain].com/[og-image].webp',
      alt: '[Same as OG alt]'
    },
  },
};
\`\`\`

Also provide JSON-LD schemas for:
- Organization
- LocalBusiness
- BreadcrumbList

Use actual keywords from the competitive analysis.`;

  console.log("  → [Sage: SEO Generator] Creating metadata...");
  const metadata = await callOpenRouter(MODELS.metadata, systemPrompt, userPrompt);
  console.log("  ✅ [Sage: SEO Generator] Complete");

  return metadata;
}

// ---------------------------------------------------------------------------
// UI Design Recommendations: Phase 5
// ---------------------------------------------------------------------------

function shouldIncludeMCPPromptPack(args) {
  const context = `${args.business || ""} ${args.industry || ""} ${args.services || ""}`;
  return /\b(?:mcp|model[\s-]+context[\s-]+protocol)\b/i.test(context);
}

function buildUIRecommendationsUserPrompt(synthesis, args) {
  const mcpPromptPack = shouldIncludeMCPPromptPack(args)
    ? `

## 6. MCP Landing Page Visual Prompt Pack
Include these exact master prompts in the final recommendations so they can be used directly for image generation:

### Prompt 1: The MCP Server Node & Context Stream (Connected & Real-time)
A cinematic hero shot of an ultra-modern landing page for a Model Context Protocol (MCP) server integration engine. The interface features a central glassmorphic terminal hub floating over a deep charcoal and navy background. Radiant, glowing circuit lines and translucent data pipelines extend outwards from the terminal, connecting to smaller, semi-transparent frosted glass modules representing diverse data sources and enterprise tools. Crisp, glowing neon-blue and amber monospaced text streams display real-time context exchanges and tool-calling scripts. Soft atmospheric haze drifts between the floating UI layers, catching sharp, brilliant rim lighting on the refractive, glossy glass edges. Photorealistic, 8k resolution, elegant 3D realism, hyper-detailed cloud architecture visualization.

### Prompt 2: The MCP Host Hub & File/Tool Execution (Sleek Developer View)
A close-up cinematic shot of a developer landing page for an advanced MCP host ecosystem. The central focus is a layered, thick-cut frosted glass workspace hovering over a dark, minimalist gradient background. The top glass layer displays a sharp, glowing code block executing a context handshake or tool-definition script. Overlapping it is a beautifully rendered, semi-transparent glass module illustrating active database and API connections, with sharp caustics and realistic light leaks rippling across the physical surfaces. Elegant, physical depth is created by soft shadows falling realistically between the floating UI cards. Hyper-realistic, 8k, ray-traced reflections, premium developer tool UX visualization, 3D glossy realism.

💡 Tips for Fine-Tuning the MCP Vibe:
- To emphasize tool-calling or security: Add phrases like showing secure API authorization badges or displaying sandboxed tool execution logs to make the functional purpose clearer.
- To change the visual hierarchy: If you want a more abstract layout representing the "protocol" flow, use terms like a central core with radial glass nodes stretching outward to shift it away from a standard rectangular layout.`
    : "";
  return `Based on this competitive analysis for ${args.business}:

${synthesis}

Create detailed UI/UX recommendations including:

## 1. Design System
- Color palette (primary, secondary, accent, neutrals)
- Typography (headings, body, size scale)
- Spacing system (margin, padding scale)
- Border radius, shadows, effects

## 2. Component Library
List all needed components:
- Navigation (header, mobile menu)
- Hero section
- Feature grid
- Service/product cards
- Testimonial carousel
- CTA sections
- Forms (contact, order, booking)
- Footer

For each component, describe:
- Visual design
- Interactive behavior
- Responsive breakpoints

## 3. Page Layouts
Detailed wireframes for:
- Homepage
- Services/Menu
- Order/Booking
- About
- Contact

## 4. Conversion Optimization
- CTA placement and copy
- Trust signals (reviews, credentials)
- Friction reduction strategies
- Mobile-first considerations

## 5. Differentiation Elements
3-5 UI features that would make ${args.business} stand out from all competitors.

Be specific, actionable, and modern. Reference Tailwind CSS utility classes where appropriate.${mcpPromptPack}`;
}

function truncatePromptSection(text, maxLength) {
  if (typeof text !== "string" || text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trimEnd()}\n\n[Content truncated to keep total prompt size within model limits.]`;
}

async function generateUIRecommendations(synthesis, args) {
  console.log("\n🎨 Phase 5: UI Design Recommendations");
  console.log("=" .repeat(60));

  const systemPrompt = `You are Pixel, the UI/UX design specialist. Your job is to create specific design recommendations that match or exceed top competitors.`;
  const hasMcpPromptPack = shouldIncludeMCPPromptPack(args);
  const boundedSynthesis = truncatePromptSection(
    synthesis,
    hasMcpPromptPack ? 12000 : 24000
  );

  if (hasMcpPromptPack && typeof synthesis === "string" && synthesis.length > 12000) {
    console.warn(
      `  ⚠️  Synthesis truncated from ${synthesis.length} to 12000 chars to fit MCP prompt budget.`
    );
  }

  const userPrompt = buildUIRecommendationsUserPrompt(boundedSynthesis, args);

  console.log("  → [Pixel: UI Designer] Generating recommendations...");
  const uiDesign = await callOpenRouter(MODELS.design, systemPrompt, userPrompt);
  console.log("  ✅ [Pixel: UI Designer] Complete");

  return uiDesign;
}

// ---------------------------------------------------------------------------
// Output Generation: Phase 6
// ---------------------------------------------------------------------------

function generateOutputFiles(results, args) {
  console.log("\n📝 Phase 6: Generating Output Files");
  console.log("=" .repeat(60));

  const outputDir = args.output;
  
  // Create output directory structure
  const dirs = [
    outputDir,
    path.join(outputDir, "research"),
    path.join(outputDir, "design"),
    path.join(outputDir, "seo"),
    path.join(outputDir, "images"),
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`  ✅ Created: ${dir}`);
    }
  });

  // Write research reports
  fs.writeFileSync(
    path.join(outputDir, "research", "competitive-analysis.md"),
    results.synthesis,
    "utf8"
  );
  console.log(`  ✅ Written: research/competitive-analysis.md`);

  // Write scout findings
  results.scoutResults.forEach((scout, idx) => {
    const filename = `scout-${idx + 1}-${scout.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.md`;
    fs.writeFileSync(
      path.join(outputDir, "research", filename),
      `# ${scout.name}\n\n${scout.content}`,
      "utf8"
    );
  });
  console.log(`  ✅ Written: ${results.scoutResults.length} scout reports`);

  // Write image optimization plan
  fs.writeFileSync(
    path.join(outputDir, "images", "optimization-plan.md"),
    results.imageOptimization,
    "utf8"
  );
  console.log(`  ✅ Written: images/optimization-plan.md`);

  // Write SEO metadata
  fs.writeFileSync(
    path.join(outputDir, "seo", "metadata.md"),
    results.seoMetadata,
    "utf8"
  );
  console.log(`  ✅ Written: seo/metadata.md`);

  // Write UI design recommendations
  fs.writeFileSync(
    path.join(outputDir, "design", "ui-recommendations.md"),
    results.uiDesign,
    "utf8"
  );
  console.log(`  ✅ Written: design/ui-recommendations.md`);

  // Write summary README
  const readme = `# UI Creation Engine Output — ${args.business}

**Generated:** ${new Date().toISOString()}
**Business:** ${args.business}
**Industry:** ${args.industry}
**Location:** ${args.location}
**Platform:** ${args.platform}

## Output Structure

\`\`\`
${outputDir}/
├── research/
│   ├── competitive-analysis.md      # Comprehensive competitive analysis
│   ├── scout-1-*.md                 # Individual scout findings
│   └── ...
├── design/
│   └── ui-recommendations.md        # UI/UX design system and components
├── seo/
│   └── metadata.md                  # SEO metadata for all pages
└── images/
    └── optimization-plan.md         # Image optimization plan with filenames and alt text
\`\`\`

## Next Steps

1. **Review Research**: Read \`research/competitive-analysis.md\`
2. **Implement Design**: Follow \`design/ui-recommendations.md\`
3. **Optimize Images**: Use \`images/optimization-plan.md\` for image processing
4. **Add SEO**: Implement metadata from \`seo/metadata.md\`
5. **Run Lighthouse**: Validate SEO score ≥ 95

## Key Findings

${results.synthesis.split("\n").slice(0, 20).join("\n")}

[See full analysis in research/competitive-analysis.md]

---

*Generated by Revvel UI Creation Engine*
*Powered by OpenRouter Multi-Agent Swarms*
`;

  fs.writeFileSync(path.join(outputDir, "README.md"), readme, "utf8");
  console.log(`  ✅ Written: README.md`);

  console.log(`\n✅ All files written to: ${outputDir}`);
}

// ---------------------------------------------------------------------------
// Main Orchestration
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs();

  // Validate required arguments
  if (!args.business || !args.industry || !args.location) {
    console.error("❌ Error: Missing required arguments\n");
    console.log("Usage:");
    console.log("  node scripts/ui-creation-engine.js \\");
    console.log('    --business="Business Name" \\');
    console.log('    --industry="industry type" \\');
    console.log('    --location="City, State" \\');
    console.log('    --services="optional services list" \\');
    console.log('    --output="./output-directory"');
    console.log("\nExample:");
    console.log('  node scripts/ui-creation-engine.js \\');
    console.log('    --business="Soul2Bowl" \\');
    console.log('    --industry="catering, meal prep" \\');
    console.log('    --location="St. Louis, MO" \\');
    console.log('    --services="catering, Sunday dinner, meal prep"');
    process.exit(1);
  }

  console.log("\n🎨 Revvel UI Creation Engine");
  console.log("=" .repeat(60));
  console.log(`Business: ${args.business}`);
  console.log(`Industry: ${args.industry}`);
  console.log(`Location: ${args.location}`);
  console.log(`Platform: ${args.platform}`);
  console.log(`Output: ${args.output}`);
  console.log("=" .repeat(60));

  const startTime = Date.now();

  try {
    // Phase 1: Research Swarm
    const scoutResults = await runCompetitiveResearchSwarm(args);

    // Phase 2: Synthesis
    const synthesis = await synthesizeCompetitiveAnalysis(scoutResults, args);

    // Phase 3: Image Optimization
    const imageOptimization = await generateImageOptimizationPlan(synthesis, args);

    // Phase 4: SEO Metadata
    const seoMetadata = await generateSEOMetadata(synthesis, args);

    // Phase 5: UI Design
    const uiDesign = await generateUIRecommendations(synthesis, args);

    // Phase 6: Output
    generateOutputFiles(
      {
        scoutResults,
        synthesis,
        imageOptimization,
        seoMetadata,
        uiDesign,
      },
      args
    );

    const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log("\n" + "=" .repeat(60));
    console.log(`✅ UI Creation Engine Complete in ${totalDuration}s`);
    console.log(`📁 Output directory: ${args.output}`);
    console.log("=" .repeat(60));
    console.log("\n🎨 Pixel signing off. UI creation complete!");

  } catch (err) {
    console.error("\n❌ Fatal Error:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

module.exports = { main, shouldIncludeMCPPromptPack, buildUIRecommendationsUserPrompt };
