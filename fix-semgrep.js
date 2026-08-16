const fs = require('fs');

// Fix semgrep warning about using env variable for unescaped code execution with github context
let content = fs.readFileSync('.github/workflows/image-seo-qa.yml', 'utf8');

// Replace:
// env:
//   GITHUB_BASE_REF: ${{ github.base_ref }}
// run: |
//   ...
//   base_ref="$GITHUB_BASE_REF"

content = content.replace(/env:\n          GITHUB_BASE_REF: \$\{\{ github\.base_ref \}\}\n        run: \|\n          set -e\n          bad=0\n          base_ref="\$GITHUB_BASE_REF"/g, 'env:\n          GITHUB_BASE_REF: "${{ github.base_ref }}"\n        run: |\n          set -e\n          bad=0\n          base_ref="$GITHUB_BASE_REF"');

// Just to make sure it's valid if it already has double quotes, if it doesn't have it let's do it forcefully.

fs.writeFileSync('.github/workflows/image-seo-qa.yml', content);
