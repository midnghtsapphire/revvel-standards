#!/usr/bin/env node
/**
 * Deep Search Router - Sonnet 3.5 + Fusion
 * Model routing with automatic failover
 */

const ROUTING_PROFILES = {
  deep_search: {
    description: "Deep R&D research using DOE Screening, TRIZ, MEErP, LCA, BNAT",
    models: [
      "anthropic/claude-3.5-sonnet",
      "openrouter/fusion"
    ]
  },
  market_research: {
    description: "Market analysis, TAM, competitors, trends",
    models: [
      "anthropic/claude-3.5-sonnet",
      "openrouter/fusion",
      "deepseek/deepseek-v3.2"
    ]
  },
  technical: {
    description: "Technical feasibility, architecture, implementation",
    models: [
      "anthropic/claude-3.5-sonnet",
      "openai/gpt-5.2-codex"
    ]
  }
};

const MASTER_PROMPT = `You are an autonomous Lead Systems Engineer, Market Analyst, and R&D Director.

Apply these frameworks:
1. DOE 5-Point Screening (Feasibility, Practicability, Utility, Safety, Proprietary)
2. TRIZ (Theory of Inventive Problem Solving) 
3. MEErP (Market, User, Technology, Environmental Assessment)
4. LCA (Life Cycle Assessment - Cradle-to-Grave)
5. BNAT (Best Not Yet Available Technology)

Final output: Refine, Repurpose, or Pivot verdict with BOM and Cost-Benefit Analysis.`;

async function callOpenRouter({ models, messages, temperature = 0.7, max_tokens = 8000 }) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY required");
  }

  // Try each model in order
  for (const model of models) {
    try {
      console.log(`Trying: ${model}...`);
      
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://rnd-research-fleet',
          'X-Title': 'R&D Research Fleet'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens,
          temperature
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content;
      }
      
      console.log(`  ⚠️  ${model} failed: ${response.status}`);
    } catch (e) {
      console.log(`  ⚠️  ${model} error: ${e.message}`);
    }
  }

  throw new Error("All models failed");
}

async function deepSearch(query, profileName = 'deep_search') {
  const profile = ROUTING_PROFILES[profileName] || ROUTING_PROFILES.deep_search;
  
  console.log('🔬 Deep Search Router');
  console.log('═'.repeat(50));
  console.log(`Profile: ${profile.description}`);
  console.log(`Models: ${profile.models.join(' → ')}`);
  console.log('');
  console.log(`Query: ${query}`);
  console.log('');

  const messages = [
    { role: 'system', content: MASTER_PROMPT },
    { role: 'user', content: query }
  ];

  const result = await callOpenRouter({
    models: profile.models,
    messages,
    max_tokens: 8000,
    temperature: 0.7
  });

  console.log('');
  console.log('═'.repeat(50));
  console.log('✅ RESEARCH COMPLETE');
  console.log('═'.repeat(50));
  console.log('');
  console.log(result);
  
  return result;
}

// CLI — guarded so the module can be safely required (e.g. by twin-search.js)
// without executing a search on import.
if (require.main === module) {
  const query = process.argv.slice(2).join(' ');
  const profile = process.argv[2] === '--profile' ? process.argv[3] : null;
  const actualQuery = profile ? process.argv.slice(4).join(' ') : query;

  if (!actualQuery) {
    console.log(`
🔬 Deep Search Router

Usage:
  node deep-search-router.js "your research question"
  node deep-search-router.js --profile market "your question"

Profiles:
  deep_search (default) - DOE, TRIZ, MEErP, LCA, BNAT
  market_research       - TAM, competitors, trends
  technical            - Feasibility, architecture

Models:
  Primary: anthropic/claude-3.5-sonnet
  Fallback: openrouter/fusion
`);
    process.exit(0);
  }

  deepSearch(actualQuery, profile || 'deep_search').catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  });
}

module.exports = { deepSearch, callOpenRouter, ROUTING_PROFILES, MASTER_PROMPT };
