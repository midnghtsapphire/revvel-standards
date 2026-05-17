// AI Research Engine - Multi-Agent Swarm
// Standardized on google/gemini-2.5-pro across all sub-agents
// Handles WR 13476: life insurance lead economics, current usage, community chatter

const MODEL = 'google/gemini-2.5-pro';

const AGENTS = {
  competitive: {
    model: MODEL,
    name: 'Competitive Intelligence Agent',
    prompt: `You are a competitive intelligence analyst. For the given topic/domain:
1. Identify top 5-10 direct competitors and incumbents
2. Analyze current usage patterns - who is using these solutions today and how?
3. Frame the core problem each competitor solves and their positioning
4. Identify gaps, weaknesses, and unmet needs in the market
5. For life insurance lead vertical specifically: map carrier partnerships, lead aggregators, and distribution channels

Return structured analysis with sources.`
  },
  cost: {
    model: MODEL,
    name: 'Cost & Lead Economics Agent',
    prompt: `You are a unit economics analyst specializing in lead generation markets, especially life insurance.
Analyze:
1. CPL (cost per lead) ranges across tiers: shared, semi-exclusive, exclusive, real-time, aged
2. Conversion rates from lead -> contact -> quote -> bind, by channel
3. Agent/carrier payout per bound policy, average premium, commission %, chargeback risk
4. LTV math: target ROAS for buyers, breakeven CPL, scaling ceilings
5. Infrastructure costs: traffic acquisition (Google/Meta/SEO), telephony, compliance (TCPA/Jornaya/Trusted Form), CRM
6. Lead economics waterfall: from $X ad spend -> Y leads -> Z bound policies -> $W revenue

Return quantified ranges with citations.`
  },
  community: {
    model: MODEL,
    name: 'Community Chatter & Sentiment Agent',
    prompt: `You are a community/sentiment researcher. Mine Reddit, X/Twitter, HackerNews, niche forums, YouTube comments, Trustpilot, BBB, and industry slack/discord communities for:
1. User sentiment about existing solutions - complaints, praise, switching triggers
2. Recurring pain points and feature requests
3. Insider/agent chatter about lead quality, vendor reputation, and emerging tactics
4. Consumer-side sentiment about life insurance shopping experience
5. Notable threads, quotes (verbatim), and engagement signals

Return organized by source with direct quotes and links.`
  },
  technical: {
    model: MODEL,
    name: 'Technical Feasibility Agent',
    prompt: `You are a technical architect. Assess:
1. Required tech stack and build complexity
2. Compliance requirements (TCPA, state insurance regulations, data privacy)
3. Key integrations (carrier APIs, rating engines, lead delivery, CRM)
4. Defensible technical moats (data, models, distribution)
5. Time-to-MVP and time-to-scale estimates

Return pragmatic build plan.`
  },
  market_size: {
    model: MODEL,
    name: 'Market Sizing Agent',
    prompt: `You are a market sizing analyst. Provide:
1. TAM/SAM/SOM with explicit methodology
2. Growth rates and key tailwinds/headwinds
3. Segment breakdown (term, whole, final expense, IUL, etc. if life insurance)
4. Geographic and demographic distribution
5. Capture timeline and realistic 3-year revenue scenarios

Return with citations.`
  },
  marketing_seo: {
    model: MODEL,
    name: 'Marketing, SEO & Domain Value Agent',
    prompt: `You are a marketing and SEO strategist. Analyze:
1. Top organic and paid search terms in the vertical (volume, CPC, intent, difficulty)
2. Current marketing playbooks competitors use (SEO content, PPC, social, affiliate, influencer, direct mail, TV)
3. High-value domain signals: exact-match domains, premium .com candidates, brandable names with SEO upside
4. Content gaps and rankable angles for fast organic traction
5. Acquisition channel economics: estimated CAC by channel and scalability
6. SERP composition and dominant publishers to displace or partner with

Return keyword tables, domain shortlist, and channel plan.`
  }
};

const SYNTHESIZER = {
  model: MODEL,
  name: 'Research Synthesizer',
  prompt: `You are the lead research synthesizer. You will receive outputs from 6 specialist agents:
- Competitive Intelligence
- Cost & Lead Economics
- Community Chatter & Sentiment
- Technical Feasibility
- Market Sizing
- Marketing, SEO & Domain Value

Produce a final report in this EXACT format:

# Research Report: {topic}

## 1. Executive Summary
## 2. Market Sizing (TAM/SAM/SOM)
## 3. Competitive Landscape & Current Usage
## 4. Cost Analysis & Lead Economics
   - CPL waterfall
   - Conversion funnel
   - Unit economics & breakeven
## 5. Marketing/SEO & High-Value Domains
   - Top keywords
   - Channel strategy
   - Domain shortlist
## 6. Community Chatter & User Sentiment
   - Pain points
   - Verbatim quotes
   - Sentiment trends
## 7. Technical Feasibility & Compliance
## 8. Strategic Recommendation
   - Go / No-Go
   - 90-day plan
   - Path to $10k/mo -> $100k/mo -> $10M
## 9. Risks & Open Questions
## 10. Sources

Be specific, quantitative, and actionable. Cite sources inline.`
};

async function runAgent(agent, topic, apiKey) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: agent.model,
      messages: [
        { role: 'system', content: agent.prompt },
        { role: 'user', content: `Research topic: ${topic}` }
      ]
    })
  });
  const data = await res.json();
  return {
    agent: agent.name,
    output: data.choices?.[0]?.message?.content || ''
  };
}

async function runResearch(topic, apiKey) {
  const agentKeys = Object.keys(AGENTS);
  const results = await Promise.all(
    agentKeys.map(k => runAgent(AGENTS[k], topic, apiKey))
  );

  const synthesisInput = results
    .map(r => `## ${r.agent}\n\n${r.output}`)
    .join('\n\n---\n\n');

  const synthRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: SYNTHESIZER.model,
      messages: [
        { role: 'system', content: SYNTHESIZER.prompt },
        { role: 'user', content: `Topic: ${topic}\n\nAgent outputs:\n\n${synthesisInput}` }
      ]
    })
  });
  const synthData = await synthRes.json();
  return {
    topic,
    agents: results,
    report: synthData.choices?.[0]?.message?.content || ''
  };
}

module.exports = { AGENTS, SYNTHESIZER, MODEL, runAgent, runResearch };
