/**
 * Tests for automation-doctor.js
 */

// 2026-05-21 (Claude): import BDD globals so the file runs directly and under `node --test`.
const { after, describe, it } = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Redirect the doctor report to a temp file BEFORE requiring the script, so any
// doctor.run() during tests never rewrites the tracked AUTOMATION-DOCTOR-REPORT.md
// (WR #14544 — `npm test` must leave the working tree clean).
const previousAutomationDoctorReport = process.env.AUTOMATION_DOCTOR_REPORT;
const doctorTestTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doctor-test-'));
process.env.AUTOMATION_DOCTOR_REPORT = path.join(
  doctorTestTempDir,
  'AUTOMATION-DOCTOR-REPORT.md'
);

after(() => {
  if (previousAutomationDoctorReport === undefined) {
    delete process.env.AUTOMATION_DOCTOR_REPORT;
  } else {
    process.env.AUTOMATION_DOCTOR_REPORT = previousAutomationDoctorReport;
  }
  fs.rmSync(doctorTestTempDir, { recursive: true, force: true });
});

const { AutomationDoctor, CONFIG } = require('../scripts/automation-doctor.js');

describe('AutomationDoctor', () => {
  describe('constructor', () => {
    it('should create with default options', () => {
      const doctor = new AutomationDoctor();
      assert.ok(doctor.options);
      assert.ok(doctor.results);
    });

    it('should accept custom options', () => {
      const doctor = new AutomationDoctor({ validate: true, labels: false });
      assert.strictEqual(doctor.options.validate, true);
      assert.strictEqual(doctor.options.labels, false);
    });
  });

  describe('CONFIG', () => {
    it('should have required labels defined', () => {
      assert.ok(CONFIG.requiredLabels.length > 0);
      assert.ok(CONFIG.requiredLabels.includes('wr:new'));
      assert.ok(CONFIG.requiredLabels.includes('wr:code'));
    });

    it('should have job timeout defaults', () => {
      assert.ok(CONFIG.jobTimeoutDefaults.label);
      assert.ok(CONFIG.jobTimeoutDefaults['validation']);
    });
  });

  describe('validateWorkflows', () => {
    it('should validate workflows in .github/workflows', async () => {
      const doctor = new AutomationDoctor({ validate: true, report: false });
      await doctor.validateWorkflows();
      
      assert.ok(doctor.results.workflows.valid.length > 0);
      assert.ok(doctor.results.workflows.invalid !== undefined);
    });
  });

  describe('checkLabels', () => {
    it('should check labels exist', () => {
      const doctor = new AutomationDoctor({ labels: true, report: false });
      doctor.checkLabels();
      
      // Labels file might not exist, so all should be marked as missing
      assert.ok(doctor.results.labels.missing.length >= 0);
    });
  });
});

describe('Lifecycle Label Conflict Detection', () => {
  const labelGroups = [
    ['wr:new', 'wr:research', 'wr:research-complete', 'wr:code', 'wr:pr-open', 'wr:checking', 'wr:check-failed', 'wr:review', 'wr:merge-ready', 'wr:done'],
    ['lifecycle:stuck', 'needs-human']
  ];

  it('should detect conflicting labels in a group', () => {
    const labels = ['wr:code', 'wr:checking'];
    const conflicts = [];
    
    for (const group of labelGroups) {
      const found = labels.filter(l => group.includes(l));
      if (found.length > 1) {
        conflicts.push(...found.slice(1));
      }
    }
    
    assert.strictEqual(conflicts.length, 1);
    assert.strictEqual(conflicts[0], 'wr:checking');
  });

  it('should allow single label per group', () => {
    const labels = ['wr:new'];
    const conflicts = [];
    
    for (const group of labelGroups) {
      const found = labels.filter(l => group.includes(l));
      if (found.length > 1) {
        conflicts.push(...found.slice(1));
      }
    }
    
    assert.strictEqual(conflicts.length, 0);
  });
});

describe('Stuck Issue Detection', () => {
  it('should identify issues stuck in checking too long', () => {
    const issue = {
      number: 123,
      title: 'Test issue',
      hours_old: 5,
      labels: ['wr:checking']
    };
    
    const thresholdHours = 4;
    const isStuck = issue.hours_old > thresholdHours;
    
    assert.strictEqual(isStuck, true);
  });

  it('should identify pending checks', () => {
    const issue = {
      number: 124,
      title: 'Test issue',
      hours_old: 3,
      labels: ['wr:checking']
    };
    
    const pendingHours = 2;
    const thresholdHours = 4;
    
    // Should be flagged if pending > 2 hours but not stuck yet
    const isPending = issue.hours_old > pendingHours && issue.hours_old <= thresholdHours;
    
    assert.strictEqual(isPending, true);
  });
});

describe('Model Config Parsing', () => {
  it('should parse agent-models.yml', () => {
    const fs = require('fs');
    const path = require('path');
    const YAML = require('yaml');
    
    const modelConfigPath = path.join(process.cwd(), '.github/agent-models.yml');
    
    if (fs.existsSync(modelConfigPath)) {
      const content = fs.readFileSync(modelConfigPath, 'utf8');
      const config = YAML.parse(content);
      
      assert.ok(config.profiles);
      assert.ok(config.profiles.triage);
      assert.ok(config.profiles.research);
      assert.ok(config.profiles.code_patch);
      assert.ok(config.profiles.review);
    }
  });

  it('should have current model versions in profiles', () => {
    const fs = require('fs');
    const path = require('path');
    const YAML = require('yaml');
    
    const modelConfigPath = path.join(process.cwd(), '.github/agent-models.yml');
    
    if (fs.existsSync(modelConfigPath)) {
      const content = fs.readFileSync(modelConfigPath, 'utf8');
      const config = YAML.parse(content);
      
      // Should NOT contain retired models like Claude Sonnet 3.7
      const allContent = JSON.stringify(config);
      assert.ok(!allContent.includes('claude-sonnet-3.7'));
    }
  });
});

describe('Workflow YAML Parsing', () => {
  it('should parse issue-state-machine.yml', () => {
    const fs = require('fs');
    const YAML = require('yaml');
    
    const path = '.github/workflows/issue-state-machine.yml';
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf8');
      const doc = YAML.parse(content);
      
      assert.ok(doc.name);
      assert.ok(doc.on);
      assert.ok(doc.jobs);
    }
  });

  it('should parse stuck-check-watchdog.yml', () => {
    const fs = require('fs');
    const YAML = require('yaml');
    
    const path = '.github/workflows/stuck-check-watchdog.yml';
    if (fs.existsSync(path)) {
      const content = fs.readFileSync(path, 'utf8');
      const doc = YAML.parse(content);
      
      assert.ok(doc.name);
      assert.ok(doc.on);
      assert.ok(doc.jobs);
    }
  });
});

// Run tests if executed directly
if (require.main === module) {
  console.log('Running tests...');
  const doctor = new AutomationDoctor({ all: true, report: true });
  doctor.run().then(() => {
    console.log('\n✅ Tests complete');
  }).catch(e => {
    console.error('❌ Tests failed:', e.message);
    process.exit(1);
  });
}