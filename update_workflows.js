const fs = require('fs');

// 1. Update jules-pr-reviewer.yml
let jules = fs.readFileSync('.github/workflows/jules-pr-reviewer.yml', 'utf8');
jules = jules.replace(/# pull_request:/g, 'pull_request:');
jules = jules.replace(/#   types:/g, '  types:');
jules = jules.replace(/#     - opened/g, '    - opened');
jules = jules.replace(/#     - synchronize/g, '    - synchronize');
jules = jules.replace(/#     - reopened/g, '    - reopened');
jules = jules.replace(/#     - ready_for_review/g, '    - ready_for_review');
fs.writeFileSync('.github/workflows/jules-pr-reviewer.yml', jules);

// 2. Update semgrep.yml
let semgrep = fs.readFileSync('.github/workflows/semgrep.yml', 'utf8');
if (!semgrep.includes('pull_request:')) {
  semgrep = semgrep.replace(/on:\n  workflow_dispatch:/, 'on:\n  pull_request:\n    branches: [main]\n  workflow_dispatch:');
}
fs.writeFileSync('.github/workflows/semgrep.yml', semgrep);
