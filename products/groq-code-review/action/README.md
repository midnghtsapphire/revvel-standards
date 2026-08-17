# Groq Code Review composite action

Use from the monorepo:

```yaml
- uses: ./products/groq-code-review/action
  with:
    apiKey: ${{ secrets.GROQ_API_KEY }}
    githubToken: ${{ secrets.GITHUB_TOKEN }}
    githubRepository: ${{ github.repository }}
    githubPullRequestNumber: ${{ github.event.pull_request.number }}
    gitCommitHash: ${{ github.event.pull_request.head.sha }}
    pullRequestDiff: ${{ steps.diff.outputs.pull_request_diff }}
    pullRequestDiffChunkSize: "4000"
    repoId: "llama-3.3-70b-versatile"
```

Full example: [`../workflows/groq-code-review.yml`](../workflows/groq-code-review.yml).
