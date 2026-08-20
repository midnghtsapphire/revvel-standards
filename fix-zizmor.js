// REVVEL-DISABLED | AGENT: copilot | MODEL: gpt-5 | WR: #17790 | DATE: 2026-08-20 | STATUS: REPLACED
// REASON: one-shot string-replace against image-seo-qa.yml / image-seo-pipeline.yml / release-banner-social.yml; already applied; re-run is a no-op. RVS-AGENT-001 forbids agent deletion — owner may still ratify full removal (option A on #17790).
// RESTORE-BY: 2026-09-03 | OWNER: @midnghtsapphire | TICKET: #17790
// const fs = require('fs');
//
// let content = fs.readFileSync('.github/workflows/image-seo-qa.yml', 'utf8');
// content = content.replace(/base_ref="\$\{\{ github\.base_ref \}\}"/g, 'base_ref="$GITHUB_BASE_REF"');
// content = content.replace(/- name: Filename slug check\n        run: \|/g, '- name: Filename slug check\n        env:\n          GITHUB_BASE_REF: ${{ github.base_ref }}\n        run: |');
// fs.writeFileSync('.github/workflows/image-seo-qa.yml', content);
//
// content = fs.readFileSync('.github/workflows/image-seo-pipeline.yml', 'utf8');
// content = content.replace(/actions\/setup-node@v4/g, 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020\n        with:\n          node-version: "22"\n          cache: ""');
// content = content.replace(/actions\/upload-artifact@v4/g, 'actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08\n        with:\n          retention-days: 1');
// fs.writeFileSync('.github/workflows/image-seo-pipeline.yml', content);
//
// content = fs.readFileSync('.github/workflows/release-banner-social.yml', 'utf8');
// content = content.replace(/actions\/setup-node@v4/g, 'actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020\n        with:\n          node-version: "22"\n          cache: ""');
// content = content.replace(/actions\/upload-artifact@v4/g, 'actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08\n        with:\n          retention-days: 1');
// fs.writeFileSync('.github/workflows/release-banner-social.yml', content);
// REVVEL-DISABLED-END
