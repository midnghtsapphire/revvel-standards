const fs = require('fs');
const filepath = 'wr/issues/issue-17830-pre-existing-npm-test-failures-block-green-main-is.md';
let content = fs.readFileSync(filepath, 'utf8');

content = content.replace('N/A — This is an internal technical fix for CI failures.',
`N/A — This is an internal technical fix`);

fs.writeFileSync(filepath, content);
