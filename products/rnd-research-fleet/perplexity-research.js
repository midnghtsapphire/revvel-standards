#!/usr/bin/env node
/**
 * Perplexity Research - No API Key Required
 * Uses free Perplexity bridge + OpenRouter Fusion fallback
 */

const fs = require('fs');
const { execFileSync } = require('child_process');

// Master R&D Prompt
const SYSTEM_PROMPT = `You are an autonomous Lead Systems Engineer, Market Analyst, and R&D Director.

EVALUATION FRAMEWORKS:
- DOE 5-Point Screening (Feasibility, Practicability, Utility, Safety, Proprietary)
- TRIZ (Theory of Inventive Problem Solving)
- MEErP (Market, User, Technology, Environmental Assessment)
- LCA (Life Cycle Assessment - Cradle-to-Grave)
- BNAT (Best Not Yet Available Technology)

Never accept the initial idea at face value. Deconstruct, research, and either:
- Refine: Improve the existing concept
- Repurpose: Use existing tech in new ways
- Pivot: Abandon for a superior paradigm

Provide a final verdict with BOM and Cost-Benefit Analysis.`;

// Configuration
const CONFIG = {
  model: 'sonar',
  fallbackMode: 'auto',
  maxTokens: 8000,
  temperature: 0.7,
  outputFile: '/tmp/research-results.md',
};

// Get query from args or prompt
const query = process.argv.slice(2).join(' ') || 
  (async () => {
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => rl.question('Enter your research question: ', resolve));
  })().then(q => { console.log(''); return q; });

async function main() {
  const researchQuery = await query;
  
  if (!researchQuery) {
    console.log('Usage: node perplexity-research.js "Your research question"');
    process.exit(1);
  }

  console.log('🔬 R&D Research Fleet - Deep Research Mode');
  console.log('═'.repeat(50));
  console.log('');
  console.log(`Research Query: ${researchQuery}`);
  console.log('');
  console.log('Framework: DOE Screening + TRIZ + MEErP + LCA + BNAT');
  console.log('');

  // Try Perplexity no-key bridge first
  let result = await tryPerplexityNoKey(researchQuery);
  
  // Fallback to OpenRouter if no-key fails
  if (!result) {
    console.log('📡 Falling back to OpenRouter Fusion...');
    result = await tryOpenRouterFusion(researchQuery);
  }

  if (result) {
    // Save result
    fs.writeFileSync(CONFIG.outputFile, result);
    console.log('');
    console.log('═'.repeat(50));
    console.log('✅ RESEARCH COMPLETE');
    console.log('═'.repeat(50));
    console.log('');
    console.log(result);
    console.log('');
    console.log(`📄 Saved to: ${CONFIG.outputFile}`);
  } else {
    console.error('❌ All research methods failed.');
    process.exit(1);
  }
}

async function tryPerplexityNoKey(query) {
  try {
    console.log('🔍 Using Perplexity (no API key required)...');
    
    const pythonScript = `
import sys
try:
    from perplexity_api import LabsClient
    client = LabsClient()
    result = client.search("${query.replace(/"/g, '\\"')}")
    print(result)
except ImportError:
    print("IMPORT_ERROR")
except Exception as e:
    print(f"ERROR: {e}")
`;
    
    const output = execFileSync('python3', ['-c', pythonScript], { 
      encoding: 'utf8',
      timeout: 60000 
    }).trim();

    if (output === 'IMPORT_ERROR' || output.startsWith('ERROR:')) {
      console.log('⚠️  Perplexity bridge not available');
      return null;
    }

    return output;
  } catch (e) {
    console.log('⚠️  Perplexity failed:', e.message);
    return null;
  }
}

async function tryOpenRouterFusion(query) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  No OpenRouter API key. Research limited.');
    console.log('💡 Get a free key at https://openrouter.ai/keys');
    return null;
  }

  try {
    console.log('🚀 Using OpenRouter Fusion...');
    
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://rnd-research-fleet',
        'X-Title': 'R&D Research Fleet'
      },
      body: JSON.stringify({
        model: 'openrouter/fusion',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: query }
        ],
        max_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (e) {
    console.error('❌ OpenRouter failed:', e.message);
    return null;
  }
}

// Run
main().catch(console.error);
