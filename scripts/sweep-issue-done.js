/**
 * One-off / periodic tool to sweep stale `issue:done` labels from issues
 * that are still open and have no closing PRs.
 *
 * This sweeps residue from #17694 and others affected by the bug
 * where `issue:done` self-sealed the issue from being properly retried.
 */
const { Octokit } = require("@octokit/rest");

async function main() {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("No GH_TOKEN provided");
    process.exit(1);
  }
  const octokit = new Octokit({ auth: token });

  // Find open issues with issue:done
  const q = 'repo:containers/revvel-standards state:open label:issue:done';
  const { data } = await octokit.rest.search.issuesAndPullRequests({ q });

  console.log(`Found ${data.total_count} open issues with issue:done.`);

  for (const issue of data.items) {
    if (issue.pull_request) continue; // skip PRs

    // Check if it has any closedByPullRequestsReferences
    const query = `
      query($owner: String!, $repo: String!, $issueNumber: Int!) {
        repository(owner: $owner, name: $repo) {
          issue(number: $issueNumber) {
            closedByPullRequestsReferences(first: 1) {
              totalCount
            }
          }
        }
      }
    `;

    try {
      const result = await octokit.graphql(query, {
        owner: 'containers',
        repo: 'revvel-standards',
        issueNumber: issue.number
      });

      const count = result.repository?.issue?.closedByPullRequestsReferences?.totalCount || 0;
      if (count === 0) {
        console.log(`Issue #${issue.number} has issue:done but no closing PR. Removing label.`);
        await octokit.rest.issues.removeLabel({
          owner: 'containers',
          repo: 'revvel-standards',
          issue_number: issue.number,
          name: 'issue:done'
        });
        console.log(`Removed label from #${issue.number}`);
      } else {
        console.log(`Issue #${issue.number} has closing PRs (${count}), leaving alone or should be closed.`);
      }
    } catch (e) {
      console.error(`Failed to process #${issue.number}: ${e.message}`);
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}
