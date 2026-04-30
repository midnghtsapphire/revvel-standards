#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Octokit } from "@octokit/rest";
import dotenv from "dotenv";

dotenv.config();

const server = new Server(
  {
    name: "github-issues-enhanced",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// Enhanced issue tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_issue_with_automation",
        description: "Create issue with automated workflow triggers",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            title: { type: "string", description: "Issue title" },
            body: { type: "string", description: "Issue body/description" },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Labels to apply",
            },
            assignees: {
              type: "array",
              items: { type: "string" },
              description: "Users to assign",
            },
            automation: {
              type: "object",
              description: "Automation options",
              properties: {
                createBranch: {
                  type: "boolean",
                  description: "Create a linked branch",
                },
                createPR: {
                  type: "boolean",
                  description: "Create a draft PR",
                },
                addToProject: {
                  type: "boolean",
                  description: "Add to project board",
                },
                notifySlack: {
                  type: "boolean",
                  description: "Send Slack notification",
                },
              },
            },
          },
          required: ["owner", "repo", "title", "body"],
        },
      },
      {
        name: "bulk_label_issues",
        description: "Apply labels to multiple issues at once",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            issueNumbers: {
              type: "array",
              items: { type: "number" },
              description: "Issue numbers to label",
            },
            labels: {
              type: "array",
              items: { type: "string" },
              description: "Labels to apply",
            },
          },
          required: ["owner", "repo", "issueNumbers", "labels"],
        },
      },
      {
        name: "smart_issue_search",
        description: "AI-powered semantic search across issues",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            query: { type: "string", description: "Search query" },
            includeComments: {
              type: "boolean",
              description: "Include issue comments in search",
            },
          },
          required: ["owner", "repo", "query"],
        },
      },
      {
        name: "issue_timeline_summary",
        description: "Generate AI summary of issue activity",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            issueNumber: { type: "number", description: "Issue number" },
          },
          required: ["owner", "repo", "issueNumber"],
        },
      },
      {
        name: "auto_triage_issue",
        description: "Automatically triage issue with labels, assignee, priority",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
            issueNumber: { type: "number", description: "Issue number" },
          },
          required: ["owner", "repo", "issueNumber"],
        },
      },
      {
        name: "issue_metrics",
        description: "Get metrics and statistics for repository issues",
        inputSchema: {
          type: "object",
          properties: {
            owner: { type: "string", description: "Repository owner" },
            repo: { type: "string", description: "Repository name" },
          },
          required: ["owner", "repo"],
        },
      },
    ],
  };
});

// Implement tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "create_issue_with_automation": {
        const issue = await octokit.issues.create({
          owner: args.owner,
          repo: args.repo,
          title: args.title,
          body: args.body,
          labels: args.labels || [],
          assignees: args.assignees || [],
        });

        const results = {
          issue: issue.data,
          automation: {
            requested: {
              createBranch: args.automation?.createBranch || false,
              createPR: args.automation?.createPR || false,
              addToProject: args.automation?.addToProject || false,
              notifySlack: args.automation?.notifySlack || false,
            },
            completed: {},
            errors: {},
          },
        };

        // Trigger automation workflows
        if (args.automation?.createBranch) {
          try {
            const mainBranch = await octokit.repos.getBranch({
              owner: args.owner,
              repo: args.repo,
              branch: "main",
            });

            const branchName = `issue-${issue.data.number}-${issue.data.title
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "-")
              .substring(0, 40)
              .replace(/-+$/, "")}`;

            await octokit.git.createRef({
              owner: args.owner,
              repo: args.repo,
              ref: `refs/heads/${branchName}`,
              sha: mainBranch.data.commit.sha,
            });

            results.automation.completed.branch = branchName;

            await octokit.issues.createComment({
              owner: args.owner,
              repo: args.repo,
              issue_number: issue.data.number,
              body: `Branch created: \`${branchName}\`.\n\nYou can start working on this issue!`,
            });
          } catch (error) {
            results.automation.errors.branch = error.message;
          }
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      case "bulk_label_issues": {
        const results = await Promise.allSettled(
          args.issueNumbers.map((num) =>
            octokit.issues.addLabels({
              owner: args.owner,
              repo: args.repo,
              issue_number: num,
              labels: args.labels,
            })
          )
        );

        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.filter((r) => r.status === "rejected").length;

        return {
          content: [
            {
              type: "text",
              text: `Successfully labeled ${succeeded} issues. Failed: ${failed}`,
            },
          ],
        };
      }

      case "smart_issue_search": {
        const issues = await octokit.paginate(octokit.issues.listForRepo, {
          owner: args.owner,
          repo: args.repo,
          state: "all",
          per_page: 100,
        });

        // Simple semantic matching (in production, use vector embeddings)
        const queryLower = args.query.toLowerCase();
        const matches = issues.filter((issue) => {
          const titleMatch = issue.title.toLowerCase().includes(queryLower);
          const bodyMatch =
            issue.body?.toLowerCase().includes(queryLower) || false;
          return titleMatch || bodyMatch;
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(matches.slice(0, 10), null, 2),
            },
          ],
        };
      }

      case "issue_timeline_summary": {
        const [issue, timeline, comments] = await Promise.all([
          octokit.issues.get({
            owner: args.owner,
            repo: args.repo,
            issue_number: args.issueNumber,
          }),
          octokit.issues.listEvents({
            owner: args.owner,
            repo: args.repo,
            issue_number: args.issueNumber,
          }),
          octokit.issues.listComments({
            owner: args.owner,
            repo: args.repo,
            issue_number: args.issueNumber,
          }),
        ]);

        const summary = {
          issue: {
            number: issue.data.number,
            title: issue.data.title,
            state: issue.data.state,
            created: issue.data.created_at,
            updated: issue.data.updated_at,
            labels: issue.data.labels.map((l) => l.name),
            assignees: issue.data.assignees.map((a) => a.login),
          },
          events: timeline.data.map((event) => ({
            type: event.event,
            actor: event.actor?.login,
            created: event.created_at,
          })),
          commentCount: comments.data.length,
          latestComment: comments.data[comments.data.length - 1],
        };

        return {
          content: [
            {
              type: "text",
              text: `Timeline summary for issue #${args.issueNumber}:\n\n${JSON.stringify(summary, null, 2)}`,
            },
          ],
        };
      }

      case "auto_triage_issue": {
        const issue = await octokit.issues.get({
          owner: args.owner,
          repo: args.repo,
          issue_number: args.issueNumber,
        });

        // Simple triage logic (in production, use AI)
        const labels = [];
        const title = issue.data.title.toLowerCase();
        const body = issue.data.body?.toLowerCase() || "";

        // Type detection
        if (title.includes("bug") || body.includes("error") || body.includes("crash")) {
          labels.push("bug");
        }
        if (title.includes("feature") || title.includes("add") || title.includes("implement")) {
          labels.push("enhancement");
        }
        if (title.includes("doc")) {
          labels.push("documentation");
        }
        if (title.includes("question") || title.includes("how to")) {
          labels.push("question");
        }

        // Priority detection
        if (title.includes("critical") || title.includes("urgent") || body.includes("production")) {
          labels.push("priority:high");
        } else if (title.includes("important")) {
          labels.push("priority:medium");
        } else {
          labels.push("priority:low");
        }

        // Component detection
        if (body.includes("ui") || body.includes("interface")) {
          labels.push("area:ui");
        }
        if (body.includes("api") || body.includes("backend")) {
          labels.push("area:api");
        }
        if (body.includes("automation") || body.includes("workflow")) {
          labels.push("area:automation");
        }

        if (labels.length === 0) {
          labels.push("needs-triage");
        }

        await octokit.issues.addLabels({
          owner: args.owner,
          repo: args.repo,
          issue_number: args.issueNumber,
          labels,
        });

        return {
          content: [
            {
              type: "text",
              text: `Triaged issue #${args.issueNumber} with labels: ${labels.join(", ")}`,
            },
          ],
        };
      }

      case "issue_metrics": {
        const issues = await octokit.paginate(octokit.issues.listForRepo, {
          owner: args.owner,
          repo: args.repo,
          state: "all",
          per_page: 100,
        });

        const open = issues.filter((i) => i.state === "open").length;
        const closed = issues.filter((i) => i.state === "closed").length;
        
        const closedWithDates = issues.filter(
          (i) => i.state === "closed" && i.closed_at
        );
        
        const avgCloseDays =
          closedWithDates.length > 0
            ? closedWithDates
                .map(
                  (i) =>
                    (new Date(i.closed_at) - new Date(i.created_at)) /
                    (1000 * 60 * 60 * 24)
                )
                .reduce((a, b) => a + b, 0) / closedWithDates.length
            : 0;

        const labelCounts = {};
        issues.forEach((issue) => {
          issue.labels.forEach((label) => {
            labelCounts[label.name] = (labelCounts[label.name] || 0) + 1;
          });
        });

        const metrics = {
          total: issues.length,
          open,
          closed,
          avgCloseDays: avgCloseDays.toFixed(1),
          labels: Object.entries(labelCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10),
        };

        return {
          content: [
            {
              type: "text",
              text: `Issue Metrics for ${args.owner}/${args.repo}:\n\n${JSON.stringify(metrics, null, 2)}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("GitHub Issues Enhanced MCP Server running on stdio");
}

main().catch(console.error);
