#!/usr/bin/env node
/**
 * Workflow Retry Script with Exponential Backoff
 * 
 * Automatically retries failed GitHub Actions workflows with:
 * - Exponential backoff (1min, 2min, 4min, 8min)
 * - Jitter (randomize retry timing to avoid thundering herd)
 * - Circuit breaker (stop after max attempts)
 * - Transient failure detection
 * 
 * Usage:
 *   node scripts/workflow-retry.js <workflow-run-id>
 *   
 * Environment:
 *   GITHUB_TOKEN - GitHub API token (required)
 *   GITHUB_REPOSITORY - owner/repo (required)
 */

'use strict';

const { Octokit } = require('@octokit/rest');

// Configuration
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY || 'midnghtsapphire/revvel-standards';
const MAX_ATTEMPTS = 3;
const MAX_BACKOFF_MS = 8 * 60 * 1000; // 8 minutes
const MONITOR_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

// Parse repository
const [owner, repo] = GITHUB_REPOSITORY.split('/');

// Initialize Octokit
const octokit = new Octokit({ auth: GITHUB_TOKEN });

/**
 * Sleep utility
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if workflow failure is transient (should retry)
 * 
 * Transient failures include:
 * - API rate limits (403, 429)
 * - Timeouts (504, 524)
 * - Network errors (ECONNRESET, ETIMEDOUT, ENOTFOUND)
 * - External service unavailable (503)
 * - Temporary GitHub issues
 */
async function isTransientFailure(runId) {
  try {
    // Get workflow run logs
    const { data: jobs } = await octokit.rest.actions.listJobsForWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    
    // Check each job for transient error patterns
    for (const job of jobs.jobs) {
      if (job.conclusion === 'failure') {
        // Get job logs (note: logs are returned as redirect URL, not content)
        // We'll check job step conclusions and names instead
        const jobName = job.name.toLowerCase();
        const stepNames = job.steps?.map(s => s.name?.toLowerCase() || '').join(' ') || '';
        
        // Transient error patterns in job/step names
        const transientPatterns = [
          /rate limit/i,
          /timeout/i,
          /503/i,
          /502/i,
          /504/i,
          /connection/i,
          /network/i,
          /temporary/i,
          /throttle/i,
        ];
        
        for (const pattern of transientPatterns) {
          if (pattern.test(jobName) || pattern.test(stepNames)) {
            console.log(`  ⚠️ Transient failure detected in job: ${job.name}`);
            return true;
          }
        }
      }
    }
    
    return false;
  } catch (error) {
    console.warn(`  ⚠️ Error checking for transient failure: ${error.message}`);
    return false;
  }
}

/**
 * Monitor workflow run until completion or timeout
 */
async function monitorWorkflowRun(runId, timeoutMs = MONITOR_TIMEOUT_MS) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    try {
      const { data: run } = await octokit.rest.actions.getWorkflowRun({
        owner,
        repo,
        run_id: runId,
      });
      
      if (run.status === 'completed') {
        return run;
      }
      
      // Wait 10 seconds before checking again
      await sleep(10000);
    } catch (error) {
      console.warn(`  ⚠️ Error monitoring workflow: ${error.message}`);
      await sleep(10000);
    }
  }
  
  throw new Error(`Workflow monitoring timed out after ${timeoutMs / 1000}s`);
}

/**
 * Retry workflow with exponential backoff
 */
async function retryWorkflow(runId, attempt = 1) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Retry Attempt ${attempt}/${MAX_ATTEMPTS}`);
  console.log(`${'='.repeat(60)}\n`);
  
  if (attempt > MAX_ATTEMPTS) {
    console.log('❌ Max retry attempts reached');
    return false;
  }
  
  // Calculate backoff with jitter
  const baseBackoffMs = 60000 * Math.pow(2, attempt - 1); // 1min, 2min, 4min, 8min
  const backoffMs = Math.min(baseBackoffMs, MAX_BACKOFF_MS);
  const jitterMs = Math.random() * 10000; // Random 0-10s jitter
  const totalWaitMs = backoffMs + jitterMs;
  
  console.log(`⏳ Waiting ${(totalWaitMs / 1000).toFixed(1)}s before retry...`);
  await sleep(totalWaitMs);
  
  try {
    // Re-run workflow
    console.log(`\n🔄 Re-running workflow ${runId}...`);
    await octokit.rest.actions.reRunWorkflow({
      owner,
      repo,
      run_id: runId,
    });
    
    console.log('✅ Workflow re-run triggered');
    
    // Wait a bit for workflow to start
    await sleep(10000);
    
    // Monitor for completion
    console.log('\n👀 Monitoring workflow run...');
    const result = await monitorWorkflowRun(runId, MONITOR_TIMEOUT_MS);
    
    console.log(`\n📊 Workflow Status: ${result.conclusion}`);
    
    if (result.conclusion === 'success') {
      console.log('\n✅ Workflow succeeded on retry!');
      return true;
    } else if (result.conclusion === 'failure') {
      console.log('\n❌ Workflow failed on retry');
      
      // Check if transient failure (should retry again)
      const isTransient = await isTransientFailure(runId);
      
      if (isTransient && attempt < MAX_ATTEMPTS) {
        console.log('⚠️ Transient failure detected, will retry again');
        return retryWorkflow(runId, attempt + 1);
      } else if (!isTransient) {
        console.log('❌ Non-transient failure detected, stopping retries');
        return false;
      } else {
        console.log('❌ Max attempts reached, stopping retries');
        return false;
      }
    } else {
      console.log(`\n⚠️ Unexpected conclusion: ${result.conclusion}`);
      return false;
    }
  } catch (error) {
    console.error(`\n❌ Error during retry: ${error.message}`);
    
    // Check if error is transient
    const isTransient = error.message.includes('rate limit') ||
                       error.message.includes('timeout') ||
                       error.message.includes('503') ||
                       error.message.includes('502');
    
    if (isTransient && attempt < MAX_ATTEMPTS) {
      console.log('⚠️ Transient error, will retry');
      return retryWorkflow(runId, attempt + 1);
    }
    
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  // Validate inputs
  if (!GITHUB_TOKEN) {
    console.error('❌ Error: GITHUB_TOKEN environment variable is required');
    process.exit(1);
  }
  
  const runId = process.argv[2];
  if (!runId) {
    console.error('❌ Error: Workflow run ID is required');
    console.error('\nUsage: node scripts/workflow-retry.js <workflow-run-id>');
    process.exit(1);
  }
  
  console.log('🚀 GitHub Actions Workflow Retry Script');
  console.log(`${'='.repeat(60)}\n`);
  console.log(`Repository: ${GITHUB_REPOSITORY}`);
  console.log(`Workflow Run ID: ${runId}`);
  console.log(`Max Attempts: ${MAX_ATTEMPTS}`);
  console.log(`Max Backoff: ${MAX_BACKOFF_MS / 1000}s\n`);
  
  try {
    // Get workflow run details
    const { data: run } = await octokit.rest.actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId,
    });
    
    console.log(`📋 Workflow: ${run.name}`);
    console.log(`📊 Status: ${run.status}`);
    console.log(`📌 Conclusion: ${run.conclusion || 'N/A'}`);
    console.log(`🔗 URL: ${run.html_url}\n`);
    
    // Check if workflow is already successful
    if (run.conclusion === 'success') {
      console.log('✅ Workflow already succeeded, no retry needed');
      process.exit(0);
    }
    
    // Check if workflow is still running
    if (run.status !== 'completed') {
      console.log('⚠️ Workflow is still running, waiting for completion...');
      const completedRun = await monitorWorkflowRun(runId, MONITOR_TIMEOUT_MS);
      if (completedRun.conclusion === 'success') {
        console.log('✅ Workflow succeeded while waiting');
        process.exit(0);
      }
    }
    
    // Check if failure is transient
    console.log('🔍 Checking if failure is transient...');
    const isTransient = await isTransientFailure(runId);
    
    if (!isTransient) {
      console.log('❌ Non-transient failure detected');
      console.log('   Manual investigation required');
      process.exit(1);
    }
    
    console.log('✅ Transient failure detected, proceeding with retry\n');
    
    // Retry workflow
    const success = await retryWorkflow(runId);
    
    if (success) {
      console.log('\n✅ Workflow retry successful!');
      process.exit(0);
    } else {
      console.log('\n❌ Workflow retry failed');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run main function
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for testing
module.exports = {
  retryWorkflow,
  isTransientFailure,
  monitorWorkflowRun,
};
