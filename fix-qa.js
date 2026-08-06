const fs = require('fs');
let content = fs.readFileSync('.github/workflows/image-seo-qa.yml', 'utf8');
content = content.replace(/        with:\n          persist-credentials: false\n        with:\n          fetch-depth: 0/g, '        with:\n          persist-credentials: false\n          fetch-depth: 0');
fs.writeFileSync('.github/workflows/image-seo-qa.yml', content);
