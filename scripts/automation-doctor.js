#!/usr/bin/env node

/**
 * Automation Doctor
 * Validates GitHub Actions workflows and diagnoses stuck issues
 * 
 * Usage:
 *   node scripts/automation-doctor.js [--validate] [--labels] [--stuck] [--report]
 * 
 * Options:
 *   --validate  Validate all workflow YAML files
 *   --labels   Check required labels exist
 *   --stuck    Find stuck issues
 *   --report   Generate markdown report (default)
 */

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

// Configuration
const CONFIG = {
  workflowDir: '.github/workflows',
  requiredLabels: [
    'wr:new', 'wr:research', 'wr:research-complete', 'wr:code',
    'wr:pr-open', 'wr:checking', 'wr:check-failed', 'wr:review',
    'wr:merge-ready', 'wr:done', 'lifecycle:stuck', 'needs-human'
  ],
  jobTimeoutDefaults: {
    'label': 15,
    'sync': 15,
    'validation': 30,
    'test': 30,
    'ai-coding': 45,
    'audit': 60
  }
};

class AutomationDoctor {
  constructor(options = {}) {
    this.options = options;
    this.results = {
      workflows: { valid: [], invalid: [], missingTimeout: [] },
      labels: { present: [], missing: [] },
      stuck: [],
      errors: []
    };
  }

  async run() {
    console.log('🔍 Running Automation Doctor...\n');
    
    if (this.options.validate || this.options.all) {
      await this.validateWorkflows();
    }
    
    if (this.options.labels || this.options.all) {
      this.checkLabels();
    }
    
    if (this.options.stuck || this.options.all) {
      // Would need GitHub API for this
      this.results.stuck.push({ note: 'Requires GitHub API - use workflow for live check' });
    }
    
    if (this.options.report !== false) {
      this.generateReport();
    }
    
    return this.results;
  }

  async validateWorkflows() {
    console.log('📋 Validating workflows...');
    
    const workflowDir = path.join(process.cwd(), CONFIG.workflowDir);
    if (!fs.existsSync(workflowDir)) {
      this.results.errors.push(`Workflow directory not found: ${workflowDir}`);
      return;
    }
    
    const files = fs.readdirSync(workflowDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
    let validCount = 0;
    let invalidCount = 0;
    
    for (const file of files) {
      const filePath = path.join(workflowDir, file);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const doc = YAML.parse(content);
        
        if (!doc || !doc.jobs) {
          this.results.workflows.invalid.push({ file, error: 'Missing jobs section' });
          invalidCount++;
          continue;
        }
        
        // Check for timeout-minutes on jobs
        const jobNames = Object.keys(doc.jobs);
        const missingTimeout = [];
        
        for (const jobName of jobNames) {
          const job = doc.jobs[jobName];
          
          // Determine job type and expected timeout
          const name = jobName.toLowerCase();
          let hasTimeout = job['timeout-minutes'] !== undefined;
          
          if (!hasTimeout) {
            missingTimeout.push(jobName);
          }
        }
        
        if (missingTimeout.length > 0) {
          this.results.workflows.missingTimeout.push({ file, jobs: missingTimeout });
        }
        
        this.results.workflows.valid.push(file);
        validCount++;
        
      } catch (e) {
        this.results.workflows.invalid.push({ file, error: e.message });
        invalidCount++;
      }
    }
    
    console.log(`  ✓ Valid: ${validCount}, Invalid: ${invalidCount}, Missing timeout: ${this.results.workflows.missingTimeout.length}`);
  }

  checkLabels() {
    console.log('\n🏷️ Checking required labels...');
    
    // Check if labels exist in the repo
    // This would normally use GitHub API
    const labelFile = path.join(process.cwd(), '.github/labels.yml');
    
    if (fs.existsSync(labelFile)) {
      try {
        const content = fs.readFileSync(labelFile, 'utf8');
        const doc = YAML.parse(content);
        const existing = doc.labels?.map(l => l.name) || [];
        
        for (const required of CONFIG.requiredLabels) {
          if (existing.includes(required)) {
            this.results.labels.present.push(required);
          } else {
            this.results.labels.missing.push(required);
          }
        }
      } catch (e) {
        this.results.errors.push('Could not parse labels file: ' + e.message);
      }
    } else {
      console.log('  ℹ️ No labels.yml found - labels would be created via workflow');
      this.results.labels.missing = CONFIG.requiredLabels;
    }
    
    console.log(`  Present: ${this.results.labels.present.length}, Missing: ${this.results.labels.missing.length}`);
  }

  generateReport() {
    console.log('\n📊 Generating report...\n');
    
    const report = [];
    report.push('# Automation Doctor Report');
    report.push('');
    report.push(`Generated: ${new Date().toISOString()}`);
    report.push('');
    
    // Workflow Summary
    report.push('## Workflow Validation');
    report.push('');
    report.push(`- Valid workflows: ${this.results.workflows.valid.length}`);
    report.push(`- Invalid workflows: ${this.results.workflows.invalid.length}`);
    report.push(`- Jobs missing timeout: ${this.results.workflows.missingTimeout.length}`);
    report.push('');
    
    if (this.results.workflows.invalid.length > 0) {
      report.push('### Invalid Workflows');
      report.push('');
      for (const w of this.results.workflows.invalid) {
        report.push(`- \`${w.file}\`: ${w.error}`);
      }
      report.push('');
    }
    
    if (this.results.workflows.missingTimeout.length > 0) {
      report.push('### Jobs Missing timeout-minutes');
      report.push('');
      for (const w of this.results.workflows.missingTimeout) {
        report.push(`- \`${w.file}\`: ${w.jobs.join(', ')}`);
      }
      report.push('');
    }
    
    // Labels Summary
    report.push('## Labels Check');
    report.push('');
    report.push(`- Present: ${this.results.labels.present.length}`);
    report.push(`- Missing: ${this.results.labels.missing.length}`);
    report.push('');
    
    if (this.results.labels.missing.length > 0) {
      report.push('### Missing Labels');
      report.push('');
      for (const label of this.results.labels.missing) {
        report.push(`- \`${label}\``);
      }
      report.push('');
    }
    
    // Errors
    if (this.results.errors.length > 0) {
      report.push('## Errors');
      report.push('');
      for (const error of this.results.errors) {
        report.push(`- ${error}`);
      }
      report.push('');
    }
    
    const reportText = report.join('\n');
    console.log(reportText);
    
    // Write report to file. Defaults to the tracked root report (committed by
    // the automation workflow); tests set AUTOMATION_DOCTOR_REPORT to a temp
    // path so `npm test` never rewrites the committed file (WR #14544).
const reportPath = process.env.AUTOMATION_DOCTOR_REPORT || 'AUTOMATION-DOCTOR-REPORT.md';
fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, reportText);
console.log(`\n📄 Report written to: ${reportPath}`);
  }
}

// CLI
async function main() {
  const args = process.argv.slice(2);
  const options = {
    validate: args.includes('--validate'),
    labels: args.includes('--labels'),
    stuck: args.includes('--stuck'),
    report: !args.includes('--no-report'),
    all: args.length === 0 || args.includes('--all')
  };
  
  const doctor = new AutomationDoctor(options);
  const results = await doctor.run();
  
  // Exit with error if there are validation errors
  if (results.workflows.invalid.length > 0 || results.workflows.missingTimeout.length > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(e => {
    console.error('Error:', e.message);
    process.exit(1);
  });
}

module.exports = { AutomationDoctor, CONFIG };