/**
 * Grants.gov API Integration Example
 * 
 * This module demonstrates how to search for and fetch federal grant
 * opportunities from the Grants.gov API.
 * 
 * API Documentation: https://developer.grants.gov/
 */

const https = require('https');

const GRANTS_GOV_BASE = 'www.grants.gov';
const GRANTS_GOV_PATH = '/rest/opportunities/search';

/**
 * Search for grant opportunities on Grants.gov
 * 
 * @param {Object} criteria - Search criteria
 * @param {string} [criteria.keyword] - Keyword search
 * @param {string} [criteria.fundingAgency] - Filter by funding agency
 * @param {string} [criteria.eligibility] - Filter by eligibility
 * @param {number} [criteria.limit=100] - Number of results
 * @returns {Promise<Array>} Array of grant opportunities
 */
async function searchGrantsGov(criteria = {}) {
  const params = new URLSearchParams({
    keyword: criteria.keyword || '',
    fundingAgency: criteria.fundingAgency || '',
    eligibility: criteria.eligibility || '',
    limit: criteria.limit || 100
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: GRANTS_GOV_BASE,
      path: `${GRANTS_GOV_PATH}?${params.toString()}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Revvel-Grant-Management-Agent/1.0'
      }
    };

    const req = https.request(options, (res) => {
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
          
          // Transform to normalized format
          const opportunities = (parsed.opportunities || []).map(opp => ({
            id: opp.id,
            externalId: opp.opportunityID,
            source: 'grants.gov',
            title: opp.opportunityTitle,
            agency: opp.agencyName,
            description: opp.synopsis,
            amount: {
              min: opp.awardFloor,
              max: opp.awardCeiling,
              estimated: opp.estimatedTotalProgramFunding
            },
            deadline: opp.closeDate,
            postedDate: opp.postDate,
            cfdaNumber: opp.cfdaNumber,
            eligibility: opp.eligibilityTypes || [],
            url: `https://www.grants.gov/view-opportunity.html?oppId=${opp.id}`,
            raw: opp
          }));
          
          resolve(opportunities);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.end();
  });
}

/**
 * Get detailed information for a specific opportunity
 * 
 * @param {string} opportunityId - Grants.gov opportunity ID
 * @returns {Promise<Object>} Detailed opportunity information
 */
async function getOpportunityDetails(opportunityId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: GRANTS_GOV_BASE,
      path: `/rest/opportunities/${opportunityId}`,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Revvel-Grant-Management-Agent/1.0'
      }
    };

    const req = https.request(options, (res) => {
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
          
          resolve({
            id: parsed.id,
            title: parsed.opportunityTitle,
            description: parsed.description,
            requirements: parsed.additionalInformation,
            eligibility: parsed.eligibility,
            costSharing: parsed.costSharingRequired,
            restrictions: parsed.restrictions,
            contactInfo: {
              name: parsed.contactName,
              email: parsed.contactEmail,
              phone: parsed.contactPhone
            },
            documents: parsed.relatedDocuments || [],
            raw: parsed
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.end();
  });
}

/**
 * Daily discovery automation function
 * Searches for new opportunities matching organization profile
 * 
 * @param {Object} orgProfile - Organization profile
 * @returns {Promise<Array>} New opportunities
 */
async function dailyDiscovery(orgProfile) {
  console.log('🔍 Running daily grant discovery...');
  
  const searches = [];
  
  // Search by keywords
  for (const keyword of orgProfile.keywords || []) {
    searches.push(
      searchGrantsGov({
        keyword,
        eligibility: orgProfile.type,
        limit: 50
      })
    );
  }
  
  // Run all searches in parallel
  const results = await Promise.all(searches);
  
  // Flatten and deduplicate
  const allOpportunities = results.flat();
  const uniqueOpportunities = Array.from(
    new Map(allOpportunities.map(opp => [opp.id, opp])).values()
  );
  
  console.log(`✅ Found ${uniqueOpportunities.length} unique opportunities`);
  
  return uniqueOpportunities;
}

/**
 * Score opportunity fit based on organization profile
 * 
 * @param {Object} opportunity - Grant opportunity
 * @param {Object} orgProfile - Organization profile
 * @returns {Object} Scored opportunity with reasoning
 */
function scoreOpportunityFit(opportunity, orgProfile) {
  let score = 0;
  const reasons = [];
  
  // Award size fit (30 points)
  if (opportunity.amount.min && opportunity.amount.max) {
    const orgBudget = orgProfile.annualBudget || 1000000;
    const targetMin = orgBudget * 0.05;
    const targetMax = orgBudget * 0.50;
    
    if (opportunity.amount.max >= targetMin && opportunity.amount.min <= targetMax) {
      score += 30;
      reasons.push('Award size matches organizational capacity');
    } else if (opportunity.amount.min > targetMax) {
      reasons.push('Award size may be too large');
    } else {
      reasons.push('Award size may be too small');
    }
  }
  
  // Keyword relevance (40 points)
  const titleLower = opportunity.title.toLowerCase();
  const descLower = (opportunity.description || '').toLowerCase();
  let keywordMatches = 0;
  
  for (const keyword of orgProfile.keywords || []) {
    if (titleLower.includes(keyword.toLowerCase()) || 
        descLower.includes(keyword.toLowerCase())) {
      keywordMatches++;
    }
  }
  
  if (keywordMatches > 0) {
    const keywordScore = Math.min(40, keywordMatches * 10);
    score += keywordScore;
    reasons.push(`${keywordMatches} keyword match(es) found`);
  } else {
    reasons.push('No direct keyword matches');
  }
  
  // Eligibility match (30 points)
  if (opportunity.eligibility.includes(orgProfile.type)) {
    score += 30;
    reasons.push('Organization type is eligible');
  } else {
    reasons.push('Eligibility unclear or not matched');
  }
  
  return {
    ...opportunity,
    fitScore: Math.round(score),
    fitReasons: reasons,
    priority: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low'
  };
}

// Export functions
module.exports = {
  searchGrantsGov,
  getOpportunityDetails,
  dailyDiscovery,
  scoreOpportunityFit
};

// Example usage
if (require.main === module) {
  const orgProfile = {
    type: 'nonprofit',
    keywords: ['education', 'technology', 'youth', 'stem'],
    annualBudget: 500000
  };
  
  dailyDiscovery(orgProfile)
    .then(opportunities => {
      const scored = opportunities.map(opp => 
        scoreOpportunityFit(opp, orgProfile)
      );
      
      // Sort by fit score
      scored.sort((a, b) => b.fitScore - a.fitScore);
      
      console.log('\n📊 Top 5 Opportunities:');
      scored.slice(0, 5).forEach((opp, i) => {
        console.log(`\n${i + 1}. ${opp.title}`);
        console.log(`   Agency: ${opp.agency}`);
        console.log(`   Deadline: ${opp.deadline}`);
        console.log(`   Fit Score: ${opp.fitScore}/100 (${opp.priority})`);
        console.log(`   Reasons: ${opp.fitReasons.join(', ')}`);
      });
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
      process.exit(1);
    });
}
