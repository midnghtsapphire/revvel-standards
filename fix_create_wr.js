const fs = require('fs');

let content = fs.readFileSync('artifacts/revvel-finishers/products/merge-prosecutor/action/run-prosecutor.mjs', 'utf8');

// 1. Add fetchImpl parameter to createWR
content = content.replace(
  /function createWR\(title, issueContext, learnings, rootDir\) \{/,
  'async function createWR(title, issueContext, learnings, rootDir, fetchImpl = fetch) {'
);

// 2. Replace curl execSync with fetch API call
// We can just use string replace on the whole body since it's just one script.
const fixCurl = `
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY) {
    try {
      log(\`Attempting to create GitHub issue for WR: \${title}\`);
      const [owner, repo] = process.env.GITHUB_REPOSITORY.split('/');
      const response = await fetchImpl(\`https://api.github.com/repos/\${owner}/\${repo}/issues\`, {
        method: 'POST',
        headers: {
          'Authorization': \`token \${process.env.GITHUB_TOKEN}\`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: \`[WR] \${title}\`,
          body: templateContent,
          labels: ['work-request']
        })
      });
      if (response.ok) {
        log(\`Successfully created GitHub issue for WR: \${title}\`);
      } else {
        log(\`Failed to create GitHub issue. Status: \${response.status}\`);
      }
    } catch (e) {
      log(\`Failed to create GitHub issue: \${e.message}\`);
    }
  }
`;

content = content.replace(/  log\(`Created WR: \$\{wrPath\}`\);/, `  log(\`Created WR: \$\{wrPath\}\`);${fixCurl}`);


// 3. Add fetchImpl to await createWR calls
content = content.replace(/createWR\("Fix Unresolved Merge Conflicts", context, "Conflict markers were left in the codebase.", workspaceDir\);/, 'await createWR("Fix Unresolved Merge Conflicts", context, "Conflict markers were left in the codebase.", workspaceDir, fetchImpl);');
content = content.replace(/createWR\("Fix Duplicated Blocks from Bad Merge", context, "Merge resolution incorrectly kept both 'current' and 'incoming' logic instead of choosing one or refactoring.\\n\\nProblem created: This results in redundant code execution, duplicated logic, and potentially introduces syntax or runtime errors.", workspaceDir\);/, 'await createWR("Fix Duplicated Blocks from Bad Merge", context, "Merge resolution incorrectly kept both \'current\' and \'incoming\' logic instead of choosing one or refactoring.\\n\\nProblem created: This results in redundant code execution, duplicated logic, and potentially introduces syntax or runtime errors.", workspaceDir, fetchImpl);');
content = content.replace(/createWR\("Fix Broken Tests after Merge", `Tests failed when running \$\{testCmd\}.`, "The recent merge introduced regressions that were not caught.", workspaceDir\);/, 'await createWR("Fix Broken Tests after Merge", `Tests failed when running ${testCmd}.`, "The recent merge introduced regressions that were not caught.", workspaceDir, fetchImpl);');
content = content.replace(/createWR\(`Address Dismissive Comment from \$\{c.user.login\}`\, `Comment URL: \$\{c.html_url\}\\n\\nBody: \$\{c.body\}`\, "Agents cannot dismiss bugs or tasks as 'out of scope' or 'not my bug' without filing a formal WR.", workspaceDir\);/, 'await createWR(`Address Dismissive Comment from ${c.user.login}`, `Comment URL: ${c.html_url}\\n\\nBody: ${c.body}`, "Agents cannot dismiss bugs or tasks as \'out of scope\' or \'not my bug\' without filing a formal WR.", workspaceDir, fetchImpl);');
content = content.replace(/createWR\(`Implement Code Suggestion from \$\{u.user\}`\, `Comment URL: \$\{u.commentUrl\}\\n\\nSuggested Code:\\n\\\`\\\`\\\`\\n\$\{u.suggestion\}\\n\\\`\\\`\\\`\\n\\nMatch Ratio found in PR: \$\{u.matchRatio.toFixed\(2\)\}`\, "A code review suggestion was ignored or missed before merging.", workspaceDir\);/, 'await createWR(`Implement Code Suggestion from ${u.user}`, `Comment URL: ${u.commentUrl}\\n\\nSuggested Code:\\n\\\`\\\`\\\`\\n${u.suggestion}\\n\\\`\\\`\\\`\\n\\nMatch Ratio found in PR: ${u.matchRatio.toFixed(2)}`, "A code review suggestion was ignored or missed before merging.", workspaceDir, fetchImpl);');

// 4. Update execSync to prevent GITHUB_TOKEN exfiltration
content = content.replace(
  /execSync\(testCmd, \{ cwd: workspaceDir, stdio: 'inherit' \}\);/,
  `const sanitizedEnv = { ...process.env };
          delete sanitizedEnv.GITHUB_TOKEN;
          execSync(testCmd, { cwd: workspaceDir, stdio: 'inherit', env: sanitizedEnv });`
);

fs.writeFileSync('artifacts/revvel-finishers/products/merge-prosecutor/action/run-prosecutor.mjs', content);
