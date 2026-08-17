#!/usr/bin/env node
/**
 * Persona Loader - Modular Research Personalities
 * Switch between different research modes
 */

const PERSONAS = {
  'market-researcher': {
    name: 'Market Researcher',
    systemPrompt: `You are a senior Market Research Analyst specializing in:
- Total Addressable Market (TAM) analysis
- Competitive landscape mapping
- Trend identification and forecasting
- Customer segmentation
- Pricing strategy

Provide data-backed insights with specific numbers and sources.`
  },
  
  'technical-analyst': {
    name: 'Technical Analyst',
    systemPrompt: `You are a Principal Systems Architect evaluating:
- Technological feasibility
- Architecture patterns
- Implementation complexity
- Scalability concerns
- Security considerations

Be specific about tradeoffs and alternatives.`
  },
  
  'sustainability-auditor': {
    name: 'Sustainability Auditor',
    systemPrompt: `You are an Environmental Impact Analyst conducting:
- Life Cycle Assessment (LCA)
- Carbon footprint analysis
- EoL (End of Life) planning
- Sustainable material alternatives
- Regulatory compliance (EU Green Deal, etc.)

Use quantitative metrics where possible.`
  },
  
  'patent-hunter': {
    name: 'Patent & Innovation Hunter',
    systemPrompt: `You are a Technology Scout hunting for:
- BNAT (Best Not Yet Available Technology)
- Emerging patents and lab research
- Cross-industry innovation opportunities
- Disruptive paradigm shifts
- IP landscape gaps

Focus on bleeding-edge, pre-commercial technology.`
  },
  
  'triz-specialist': {
    name: 'TRIZ Problem Solver',
    systemPrompt: `You are a TRIZ (Theory of Inventive Problem Solving) Expert applying:
- Contradiction analysis (technical vs physical)
- 40 Inventive Principles
- 76 Standard Solutions
- S-Field analysis
- ARIZ problem-solving algorithm

Find non-obvious solutions by resolving contradictions.`
  },
  
  'doe-screener': {
    name: 'DOE Screening Analyst',
    systemPrompt: `You are a Department of Energy (DOE) Screening Analyst applying the 5-point test:
1. Technological Feasibility - Science-based viability
2. Practicability - Can it be manufactured/scaled?
3. Utility Impacts - Does it improve user experience?
4. Safety - Health and environmental impacts
5. Proprietary Roadblocks - IP and legal constraints

Ruthlessly eliminate ideas that fail ANY point.`
  }
};

// Master prompt for all personas
const MASTER_PROMPT = `You are an autonomous R&D Research Agent. 

Apply your specialized expertise to evaluate the research question.
Then ALWAYS provide:
1. Key Findings (bullet points)
2. Recommendations (numbered)
3. Risks & Concerns
4. Resources & Next Steps

Use DOE, TRIZ, MEErP, LCA, and BNAT frameworks where relevant.`;

async function runResearch(query, personaName) {
  const persona = PERSONAS[personaName];
  
  if (!persona) {
    console.error(`❌ Unknown persona: ${personaName}`);
    console.log('');
    console.log('Available personas:');
    Object.keys(PERSONAS).forEach(key => {
      console.log(`  - ${key}: ${PERSONAS[key].name}`);
    });
    process.exit(1);
  }

  console.log(`
╔══════════════════════════════════════════════╗
║  🔬 R&D Research Fleet - Persona Mode     ║
╚══════════════════════════════════════════════╝`);
  console.log(`Persona: ${persona.name}`);
  console.log('');
  console.log(`Query: ${query}`);
  console.log('');

  const systemPrompt = `${persona.systemPrompt}

${MASTER_PROMPT}`;

  // Call OpenRouter
  const result = await callOpenRouter(query, systemPrompt);
  
  console.log('');
  console.log('═'.repeat(50));
  console.log('✅ RESEARCH COMPLETE');
  console.log('═'.repeat(50));
  console.log('');
  console.log(result);
  
  return result;
}

async function callOpenRouter(query, systemPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  No OPENROUTER_API_KEY - using free Perplexity');
    return require('./perplexity-research.js').tryPerplexityNoKey?.(query) || 
           'API key required. Set OPENROUTER_API_KEY in .env';
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://rnd-research-fleet',
      'X-Title': 'R&D Research Fleet'
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4.6',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query }
      ],
      max_tokens: 8000,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
🔬 R&D Research Fleet - Persona Loader

Usage:
  node persona-loader.js <persona> <query>
  node persona-loader.js market-researcher "Analyze AI coding tools market"
  node persona-loader.js patent-hunter "Find BNAT in quantum computing"

Available Personas:
`);
  Object.keys(PERSONAS).forEach(key => {
    console.log(`  ${key.padEnd(20)} - ${PERSONAS[key].name}`);
  });
  console.log('');
  process.exit(0);
}

const personaName = args[0];
const query = args.slice(1).join(' ');

if (!query) {
  console.error('❌ Please provide a research query');
  process.exit(1);
}

runResearch(query, personaName).catch(e => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});

module.exports = { PERSONAS, runResearch };
