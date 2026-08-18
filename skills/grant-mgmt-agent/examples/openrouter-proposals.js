/**
 * OpenRouter Proposal Generation Example
 * 
 * This module demonstrates how to use OpenRouter API to generate
 * grant proposal sections using multiple LLM models.
 * 
 * API Documentation: https://openrouter.ai/docs
 */

const https = require('https');

const OPENROUTER_BASE = 'openrouter.ai';
const OPENROUTER_PATH = '/api/v1/chat/completions';

/**
 * Call OpenRouter API with specified model
 * 
 * @param {string} model - Model identifier (e.g., 'anthropic/claude-sonnet-4.5')
 * @param {string} systemPrompt - System prompt setting context
 * @param {string} userPrompt - User prompt with instructions
 * @param {Object} options - Additional options
 * @returns {Promise<string>} Generated content
 */
function callOpenRouter(model, systemPrompt, userPrompt, options = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is required');
  }

  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 4000,
      top_p: options.topP || 1.0
    });

    const requestOptions = {
      hostname: OPENROUTER_BASE,
      path: OPENROUTER_PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/midnghtsapphire',
        'X-Title': 'Revvel Grant Management Agent'
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'API Error'));
            return;
          }
          
          if (!parsed.choices || parsed.choices.length === 0) {
            reject(new Error('No response from API'));
            return;
          }
          
          resolve(parsed.choices[0].message.content);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.write(body);
    req.end();
  });
}

/**
 * Generate a proposal section using AI
 *
 * @param {Object} params - Generation parameters
 * @returns {Promise<Object>} Generated section with metadata
 */
async function generateProposalSection(params) {
  const {
    section,
    rfpRequirements,
    evaluationCriteria,
    organizationData,
    projectDetails,
    model = 'anthropic/claude-sonnet-4.5',
    wordLimit = null
  } = params;

  console.log(`🤖 Generating ${section} section using ${model}...`);

  // Base system prompt for all sections
  const systemPrompt = `You are an expert grant proposal writer with 20+ years of experience 
securing funding from federal agencies, foundations, and corporate funders. You write compelling, 
evidence-based narratives that align with funder priorities while showcasing the applicant 
organization's unique strengths and proven track record.

Your writing style is:
- Clear and concise, avoiding jargon unless necessary
- Data-driven with specific metrics and outcomes
- Aligned with funder evaluation criteria
- Professional yet passionate about the mission
- Compliant with all stated requirements

You always:
- Address every requirement explicitly
- Provide concrete, measurable outcomes
- Cite evidence and previous successes
- Demonstrate sustainability and scalability
- Show deep understanding of the problem
- Highlight unique qualifications and approach`;

  // Section-specific prompts
  const sectionPrompts = {
    'executive_summary': `Write an executive summary that captures the essence of the entire proposal 
in ${wordLimit || 250} words or less. Include:
- The problem being addressed and why it matters
- Your proposed solution and approach
- Expected outcomes and impact
- Why your organization is uniquely qualified
- Amount requested and project timeline

Make it compelling enough that if this is all they read, they'll want to fund you.`,

    'need_statement': `Write a need statement that establishes the urgency and importance of the problem. Include:
- Clear articulation of the problem with data
- Who is affected and how many people
- Current gaps in services or solutions
- Why this problem persists
- Consequences if not addressed
- How this aligns with funder priorities

Use compelling statistics, research, and local data. Show you deeply understand the problem.`,

    'goals_objectives': `Write the goals and objectives section. Include:
- Overall goal (broad, long-term impact)
- 3-5 SMART objectives (Specific, Measurable, Achievable, Relevant, Time-bound)
- How each objective addresses the stated need
- How objectives align with funder priorities
- Baseline data and targets for each objective

Be specific about what will change and how you'll measure it.`,

    'methodology': `Write the methodology/approach section detailing how you'll achieve the objectives. Include:
- Overall approach and framework
- Specific activities for each objective
- Timeline with milestones
- Personnel and their roles
- Partnerships and collaboration
- Evidence-based practices or research supporting the approach
- How you'll address potential challenges

Show a clear path from activities to outcomes.`,

    'evaluation': `Write the evaluation plan section. Include:
- Evaluation framework and approach
- Specific metrics for each objective
- Data collection methods and frequency
- Who will conduct evaluation
- How findings will inform ongoing program improvement
- Plans for sharing results

Demonstrate commitment to accountability and learning.`,

    'organizational_capacity': `Write the organizational capacity section. Include:
- Organization history, mission, and track record
- Relevant experience and past successes with data
- Key staff qualifications and expertise
- Board composition and governance
- Financial stability and sustainability
- Infrastructure and resources
- Partnerships and collaborative relationships

Build confidence that you can deliver on the promises made.`,

    'budget_narrative': `Write the budget narrative explaining and justifying each budget line item. Include:
- Clear connection between budget items and activities
- Justification for personnel costs (FTE, rates)
- Rationale for equipment, supplies, travel
- How costs were determined (quotes, market rates)
- Cost-effectiveness considerations
- Indirect costs if applicable
- Cost-sharing or matching funds if required

Show that the budget is reasonable, necessary, and well-planned.`,

    'sustainability': `Write the sustainability plan section. Include:
- Plans for continuing the project after grant period
- Diverse funding strategies
- Capacity building elements
- Systems and partnerships for long-term support
- How outcomes will be maintained
- Exit strategy if applicable

Show you're thinking beyond the grant period.`
  };

  const sectionInstructions = sectionPrompts[section] || 
    `Write the ${section.replace(/_/g, ' ')} section of the grant proposal.`;

  // Build comprehensive user prompt
  const userPrompt = `
RFP Section: ${section.replace(/_/g, ' ').toUpperCase()}

=== RFP REQUIREMENTS ===
${rfpRequirements || 'Address all standard elements for this section.'}

=== EVALUATION CRITERIA ===
${evaluationCriteria || 'Not specified - use best practices for this section.'}

=== ORGANIZATION BACKGROUND ===
Name: ${organizationData.name}
Mission: ${organizationData.mission}
Type: ${organizationData.type}
Founded: ${organizationData.founded || 'N/A'}
Annual Budget: $${organizationData.annualBudget?.toLocaleString() || 'N/A'}
Staff: ${organizationData.staffCount || 'N/A'}

Track Record:
${organizationData.trackRecord || 'Include our proven success in similar programs.'}

=== PROJECT DETAILS ===
${projectDetails || 'Design a compelling project that addresses the need.'}

=== YOUR TASK ===
${sectionInstructions}

${wordLimit ? `WORD LIMIT: ${wordLimit} words maximum. Stay within this limit.` : ''}

Write in a professional, confident tone. Use specific data and examples. Address every requirement.
Do not include placeholder text - write complete, ready-to-submit content.
`;

  const startTime = Date.now();
  
  try {
    const content = await callOpenRouter(model, systemPrompt, userPrompt);
    const wordCount = content.split(/\s+/).length;
    const generationTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`✅ Generated ${wordCount} words in ${generationTime}s`);
    
    if (wordLimit && wordCount > wordLimit * 1.1) {
      console.warn(`⚠️  Content exceeds word limit by ${wordCount - wordLimit} words`);
    }
    
    return {
      section,
      content,
      wordCount,
      wordLimit,
      model,
      generatedAt: new Date().toISOString(),
      generationTime: parseFloat(generationTime),
      status: 'generated',
      reviewed: false
    };
  } catch (error) {
    console.error(`❌ Error generating section: ${error.message}`);
    throw error;
  }
}

/**
 * Generate complete proposal with all sections
 * 
 * @param {Object} params - Proposal parameters
 * @returns {Promise<Object>} Complete proposal
 */
async function generateCompleteProposal(params) {
  const {
    opportunity,
    organization,
    project,
    sections = [
      'executive_summary',
      'need_statement',
      'goals_objectives',
      'methodology',
      'evaluation',
      'organizational_capacity',
      'budget_narrative',
      'sustainability'
    ]
  } = params;

  console.log(`\n📝 Generating complete proposal for: ${opportunity.title}\n`);

  const proposal = {
    opportunityId: opportunity.id,
    opportunityTitle: opportunity.title,
    organizationName: organization.name,
    generatedAt: new Date().toISOString(),
    sections: [],
    metadata: {
      totalWordCount: 0,
      totalGenerationTime: 0,
      models: []
    }
  };

  // Generate each section sequentially
  for (const sectionName of sections) {
    try {
      const section = await generateProposalSection({
        section: sectionName,
        rfpRequirements: opportunity.requirements?.[sectionName],
        evaluationCriteria: opportunity.evaluationCriteria?.[sectionName],
        organizationData: organization,
        projectDetails: project,
        wordLimit: opportunity.wordLimits?.[sectionName]
      });
      
      proposal.sections.push(section);
      proposal.metadata.totalWordCount += section.wordCount;
      proposal.metadata.totalGenerationTime += section.generationTime;
      
      if (!proposal.metadata.models.includes(section.model)) {
        proposal.metadata.models.push(section.model);
      }
      
      // Brief pause between sections to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to generate ${sectionName}: ${error.message}`);
      proposal.sections.push({
        section: sectionName,
        status: 'error',
        error: error.message
      });
    }
  }

  const completedSections = proposal.sections.filter(s => s.status === 'generated').length;
  const totalSections = sections.length;
  
  console.log(`\n✅ Proposal generation complete: ${completedSections}/${totalSections} sections generated`);
  console.log(`   Total words: ${proposal.metadata.totalWordCount.toLocaleString()}`);
  console.log(`   Total time: ${proposal.metadata.totalGenerationTime.toFixed(2)}s`);
  console.log(`   Models used: ${proposal.metadata.models.join(', ')}`);
  
  return proposal;
}

/**
 * Refine a section based on feedback
 * 
 * @param {Object} params - Refinement parameters
 * @returns {Promise<Object>} Refined section
 */
async function refineSection(params) {
  const { originalContent, feedback, section, model = 'anthropic/claude-sonnet-4.5' } = params;

  const systemPrompt = `You are refining a grant proposal section based on reviewer feedback. 
Maintain the core content but address all feedback points to strengthen the section.`;

  const userPrompt = `
=== ORIGINAL CONTENT ===
${originalContent}

=== REVIEWER FEEDBACK ===
${feedback}

=== YOUR TASK ===
Revise the above section to address all feedback points. Maintain the overall structure and 
key points, but strengthen areas identified in the feedback. Keep the same approximate length.

Provide only the revised content, ready to replace the original.
`;

  console.log(`🔄 Refining ${section} section based on feedback...`);
  
  const content = await callOpenRouter(model, systemPrompt, userPrompt);
  
  return {
    section,
    content,
    wordCount: content.split(/\s+/).length,
    model,
    refinedAt: new Date().toISOString(),
    version: 2,
    status: 'refined',
    reviewed: false
  };
}

// Export functions
module.exports = {
  callOpenRouter,
  generateProposalSection,
  generateCompleteProposal,
  refineSection
};

// Example usage
if (require.main === module) {
  const opportunity = {
    id: 'EXAMPLE-001',
    title: 'STEM Education Innovation Grant',
    requirements: {
      need_statement: 'Describe the educational gap your program will address, supported by local data.'
    },
    evaluationCriteria: {
      need_statement: 'Clarity of need (30%), use of data (30%), alignment with funder priorities (40%)'
    },
    wordLimits: {
      need_statement: 500
    }
  };

  const organization = {
    name: 'TechEd Community Center',
    mission: 'Providing technology education and resources to underserved communities',
    type: 'nonprofit',
    founded: 2015,
    annualBudget: 750000,
    staffCount: 12,
    trackRecord: 'Served 2,500+ students with 95% completion rate and 80% job placement rate'
  };

  const project = 'A 12-month after-school STEM program for 100 middle school students in underserved neighborhoods';

  generateProposalSection({
    section: 'need_statement',
    rfpRequirements: opportunity.requirements.need_statement,
    evaluationCriteria: opportunity.evaluationCriteria.need_statement,
    organizationData: organization,
    projectDetails: project,
    wordLimit: opportunity.wordLimits.need_statement
  })
    .then(result => {
      console.log('\n=== GENERATED CONTENT ===\n');
      console.log(result.content);
      console.log(`\n=== METADATA ===`);
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}
