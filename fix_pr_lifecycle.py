with open('.github/workflows/pr-lifecycle.yml', 'r') as f:
    content = f.read()

# Replace listLabelsOnIssue calls to catch 403 errors per memory:
# "When using GitHub REST API methods like github.rest.issues.createComment, addLabels, or createLabel in CI scripts (e.g. github-script), wrap the call in a try/catch block to gracefully handle API rate limits (403s) and permission errors (e.g., on forks) without failing the workflow."

# There are multiple occurrences of currentLabels, we can replace them using regex or direct replace
old_currentLabels = """            const currentLabels = async () => (
              await github.rest.issues.listLabelsOnIssue({
                owner, repo, issue_number: num
              })
            ).data.map(l => l.name);"""

new_currentLabels = """            const currentLabels = async () => {
              try {
                return (
                  await github.rest.issues.listLabelsOnIssue({
                    owner, repo, issue_number: num
                  })
                ).data.map(l => l.name);
              } catch (e) {
                core.warning(`listLabelsOnIssue failed: ${e.message}`);
                return [];
              }
            };"""

content = content.replace(old_currentLabels, new_currentLabels)

with open('.github/workflows/pr-lifecycle.yml', 'w') as f:
    f.write(content)
