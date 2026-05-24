import os

filepath = ".github/workflows/ready-for-review.yml"
with open(filepath, "r") as f:
    content = f.read()

search = """try {
              await github.rest.issues.getLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                name: 'in-review',
              });
            } catch (e) {"""

replace = """try {
              await github.rest.issues.getLabel({
                owner: context.repo.owner,
                repo: context.repo.repo,
                name: 'in-review',
              });
            } catch (e) {
              if (e.status !== 404) {
                core.warning(`Failed to get label: ${e.message}`);
                return;
              }"""

if search in content:
    content = content.replace(search, replace)
    with open(filepath, "w") as f:
        f.write(content)
    print(f"Patched {filepath} labels")

search2 = """await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.payload.pull_request.number,
              body,
            });"""

replace2 = """try {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: context.payload.pull_request.number,
                body,
              });
            } catch (e) {
              core.warning(`Failed to create comment: ${e.message}`);
            }"""

if search2 in content:
    content = content.replace(search2, replace2)
    with open(filepath, "w") as f:
        f.write(content)
    print(f"Patched {filepath} comments")
