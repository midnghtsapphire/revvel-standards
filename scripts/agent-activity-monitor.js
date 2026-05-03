#!/usr/bin/env node

/**
 * Agent Activity Monitor
 * 
 * Provides visibility into agent actions, completeness, and health.
 * Addresses: "I NEED A LOG OF WHO IS DOING WHAT TO BE CHECKED"
 */

const fs = require('fs');
const path = require('path');

const AUDIT_LOG_PATH = 'logs/agent-audit/audit.jsonl';
const TOKEN_LOG_PATH = 'logs/agent-audit/token-usage.jsonl';

/**
 * Parse JSONL file and return array of entries
 */
function parseJSONL(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  return content
    .trim()
    .split('\n')
    .filter(line => line)
    .map(line => JSON.parse(line));
}

/**
 * Get activity summary for the last N hours
 */
function getActivitySummary(hours = 24) {
  const entries = parseJSONL(AUDIT_LOG_PATH);
  const cutoff = Date.now() - (hours * 60 * 60 * 1000);
  
  const recentEntries = entries.filter(e => {
    return new Date(e.timestamp) > cutoff;
  });
  
  // Group by actor
  const byActor = {};
  const byEventType = {};
  const byResource = {};
  
  recentEntries.forEach(entry => {
    // By actor
    if (!byActor[entry.actor]) {
      byActor[entry.actor] = {
        count: 0,
        agent_type: entry.agent_type,
        events: []
      };
    }
    byActor[entry.actor].count++;
    byActor[entry.actor].events.push(entry.event_type);
    
    // By event type
    if (!byEventType[entry.event_type]) {
      byEventType[entry.event_type] = 0;
    }
    byEventType[entry.event_type]++;
    
    // By resource
    if (entry.resource_number) {
      const key = `${entry.resource_type} #${entry.resource_number}`;
      if (!byResource[key]) {
        byResource[key] = {
          title: entry.resource_title,
          count: 0,
          actors: new Set()
        };
      }
      byResource[key].count++;
      byResource[key].actors.add(entry.actor);
    }
  });
  
  // Convert Sets to Arrays
  Object.keys(byResource).forEach(key => {
    byResource[key].actors = Array.from(byResource[key].actors);
  });
  
  return {
    total: recentEntries.length,
    byActor,
    byEventType,
    byResource,
    timeRange: {
      from: new Date(cutoff).toISOString(),
      to: new Date().toISOString(),
      hours
    }
  };
}

/**
 * Check for potential issues
 */
function detectIssues(summary) {
  const issues = [];
  
  // Check for bot activity
  const botActors = Object.keys(summary.byActor).filter(actor => 
    summary.byActor[actor].agent_type === 'bot'
  );
  
  const humanActors = Object.keys(summary.byActor).filter(actor => 
    summary.byActor[actor].agent_type === 'human'
  );
  
  if (botActors.length === 0 && humanActors.length > 0) {
    issues.push({
      severity: 'warning',
      type: 'no_bot_activity',
      message: 'No bot activity detected despite human activity',
      recommendation: 'Check if automation workflows are functioning'
    });
  }
  
  // Check for very low activity
  if (summary.total < 5 && summary.timeRange.hours === 24) {
    issues.push({
      severity: 'warning',
      type: 'low_activity',
      message: 'Very low activity in the last 24 hours',
      recommendation: 'Verify workflows are running and agents are active'
    });
  }
  
  // Check for stale resources (lots of activity but no closure)
  Object.keys(summary.byResource).forEach(resource => {
    const data = summary.byResource[resource];
    if (data.count > 20) {
      issues.push({
        severity: 'info',
        type: 'high_activity_resource',
        message: `${resource} has ${data.count} events - may indicate repeated attempts`,
        recommendation: 'Review if this resource is stuck or blocked'
      });
    }
  });
  
  return issues;
}

/**
 * Generate human-readable report
 */
function generateReport(hours = 24) {
  console.log('========================================');
  console.log('    AGENT ACTIVITY MONITOR REPORT');
  console.log('========================================\n');
  
  if (!fs.existsSync(AUDIT_LOG_PATH)) {
    console.log('⚠️  No audit log found. Agents may not have started logging yet.');
    console.log(`Expected log at: ${AUDIT_LOG_PATH}\n`);
    return;
  }
  
  const summary = getActivitySummary(hours);
  
  console.log(`📊 Summary (Last ${hours} hours)`);
  console.log(`─────────────────────────────────────────`);
  console.log(`Total Events: ${summary.total}`);
  console.log(`Time Range: ${summary.timeRange.from} to ${summary.timeRange.to}\n`);
  
  console.log(`👥 Activity by Actor:`);
  console.log(`─────────────────────────────────────────`);
  const actorsSorted = Object.entries(summary.byActor)
    .sort((a, b) => b[1].count - a[1].count);
  
  actorsSorted.forEach(([actor, data]) => {
    const icon = data.agent_type === 'bot' ? '🤖' : '👤';
    console.log(`${icon} ${actor.padEnd(30)} ${data.count.toString().padStart(4)} events`);
  });
  console.log('');
  
  console.log(`📋 Activity by Event Type:`);
  console.log(`─────────────────────────────────────────`);
  const eventsSorted = Object.entries(summary.byEventType)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  
  eventsSorted.forEach(([event, count]) => {
    console.log(`  ${event.padEnd(30)} ${count.toString().padStart(4)}`);
  });
  console.log('');
  
  console.log(`🎯 Most Active Resources:`);
  console.log(`─────────────────────────────────────────`);
  const resourcesSorted = Object.entries(summary.byResource)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10);
  
  if (resourcesSorted.length === 0) {
    console.log('  No resource activity recorded');
  } else {
    resourcesSorted.forEach(([resource, data]) => {
      console.log(`  ${resource.padEnd(20)} ${data.count.toString().padStart(3)} events | ${data.actors.length} actors`);
      console.log(`    Title: ${data.title ? data.title.substring(0, 60) : 'N/A'}`);
    });
  }
  console.log('');
  
  // Detect and report issues
  const issues = detectIssues(summary);
  
  if (issues.length > 0) {
    console.log(`⚠️  Detected Issues:`);
    console.log(`─────────────────────────────────────────`);
    issues.forEach(issue => {
      const icon = issue.severity === 'warning' ? '⚠️ ' : 'ℹ️ ';
      console.log(`${icon} ${issue.type.toUpperCase()}`);
      console.log(`   Message: ${issue.message}`);
      console.log(`   Action: ${issue.recommendation}\n`);
    });
  } else {
    console.log(`✅ No issues detected\n`);
  }
  
  // Token usage if available
  if (fs.existsSync(TOKEN_LOG_PATH)) {
    const tokenEntries = parseJSONL(TOKEN_LOG_PATH);
    if (tokenEntries.length > 0) {
      const latest = tokenEntries[tokenEntries.length - 1];
      console.log(`💰 Latest Token Usage Check:`);
      console.log(`─────────────────────────────────────────`);
      console.log(`  Timestamp: ${latest.timestamp}`);
      console.log(`  Data: ${JSON.stringify(latest.data, null, 2)}\n`);
    }
  }
  
  console.log('========================================\n');
}

/**
 * Export data as JSON for programmatic use
 */
function exportJSON(hours = 24, outputPath = null) {
  const summary = getActivitySummary(hours);
  const issues = detectIssues(summary);
  
  const report = {
    generated_at: new Date().toISOString(),
    summary,
    issues
  };
  
  const json = JSON.stringify(report, null, 2);
  
  if (outputPath) {
    fs.writeFileSync(outputPath, json);
    console.log(`✅ Report exported to ${outputPath}`);
  } else {
    console.log(json);
  }
}

/**
 * Verify audit log chain integrity
 */
function verifyChain() {
  console.log('🔐 Verifying Audit Chain Integrity\n');
  
  if (!fs.existsSync(AUDIT_LOG_PATH)) {
    console.log('⚠️  No audit log found.');
    return;
  }
  
  const entries = parseJSONL(AUDIT_LOG_PATH);
  const crypto = require('crypto');
  
  let valid = true;
  let prevHash = '0000000000000000';
  
  entries.forEach((entry, index) => {
    // Verify prev_hash matches
    if (entry.prev_hash !== prevHash) {
      console.log(`❌ Chain break at entry ${index + 1}`);
      console.log(`   Expected prev_hash: ${prevHash}`);
      console.log(`   Actual prev_hash: ${entry.prev_hash}`);
      valid = false;
    }
    
    // Recalculate entry hash
    const entryCopy = { ...entry };
    delete entryCopy.entry_hash;
    const entryStr = JSON.stringify(entryCopy, null, 0);
    const calculatedHash = crypto.createHash('sha256').update(entryStr).digest('hex');
    
    if (entry.entry_hash !== calculatedHash) {
      console.log(`❌ Hash mismatch at entry ${index + 1}`);
      console.log(`   Stored hash: ${entry.entry_hash}`);
      console.log(`   Calculated hash: ${calculatedHash}`);
      valid = false;
    }
    
    prevHash = entry.entry_hash;
  });
  
  if (valid) {
    console.log(`✅ Chain is valid (${entries.length} entries verified)\n`);
  } else {
    console.log(`\n❌ Chain verification failed - log may have been tampered with\n`);
  }
}

// CLI Interface
const args = process.argv.slice(2);
const command = args[0] || 'report';

switch (command) {
  case 'report':
    const hours = parseInt(args[1]) || 24;
    generateReport(hours);
    break;
    
  case 'export':
    const exportHours = parseInt(args[1]) || 24;
    const outputPath = args[2] || null;
    exportJSON(exportHours, outputPath);
    break;
    
  case 'verify':
    verifyChain();
    break;
    
  case 'help':
    console.log('Agent Activity Monitor');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/agent-activity-monitor.js report [hours]  - Generate human-readable report');
    console.log('  node scripts/agent-activity-monitor.js export [hours] [output.json] - Export data as JSON');
    console.log('  node scripts/agent-activity-monitor.js verify  - Verify audit chain integrity');
    console.log('  node scripts/agent-activity-monitor.js help    - Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node scripts/agent-activity-monitor.js report 48');
    console.log('  node scripts/agent-activity-monitor.js export 24 report.json');
    console.log('  node scripts/agent-activity-monitor.js verify');
    break;
    
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Run with "help" for usage information');
    process.exit(1);
}
