import re

file_path = "tests/neon-branch-workflow.test.js"
with open(file_path, "r") as f:
    content = f.read()

# Let's remove the duplicated runCheckBranch that is missing the first line
dup_str = """function runCheckBranch({ port, apiKey = 'test-key', jobName = 'delete_neon_branch' }) {
  const scriptPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'neon-step-')), 'check.sh');
  fs.writeFileSync(scriptPath, checkBranchScript(jobName));
function runCheckBranch({ port, apiKey = 'test-key' }) {"""

new_str = """function runCheckBranch({ port, apiKey = 'test-key', jobName = 'delete_neon_branch' }) {"""

content = content.replace(dup_str, new_str)

with open(file_path, "w") as f:
    f.write(content)
