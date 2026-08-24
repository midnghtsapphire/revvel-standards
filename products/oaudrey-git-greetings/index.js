const fs = require('fs');
const https = require('https');

async function main() {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPOSITORY;
  const eventPath = process.env.EVENT_PATH;
  let greetingMessage = process.env.GREETING_MESSAGE || "Welcome to the repository!";

  if (!token) {
    console.error("Missing GITHUB_TOKEN environment variable");
    process.exit(1);
  }

  if (!repo) {
    console.error("Missing GITHUB_REPOSITORY environment variable");
    process.exit(1);
  }

  if (!eventPath || !fs.existsSync(eventPath)) {
    console.error("Missing or invalid EVENT_PATH");
    process.exit(1);
  }

  const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));

  let issueNumber;
  let author;
  let isNew = false;
  let eventType = "";

  if (eventData.pull_request) {
    issueNumber = eventData.pull_request.number;
    author = eventData.pull_request.user.login;
    eventType = "pull request";
    isNew = eventData.action === 'opened';
  } else if (eventData.issue) {
    issueNumber = eventData.issue.number;
    author = eventData.issue.user.login;
    eventType = "issue";
    isNew = eventData.action === 'opened';
  } else {
    console.log("Event is neither a pull request nor an issue. Exiting.");
    process.exit(0);
  }

  if (!isNew) {
    console.log("Event is not an 'opened' action. Exiting.");
    process.exit(0);
  }

  console.log(`Processing new ${eventType} #${issueNumber} by ${author}`);

  // Fetch all issues to count how many this user has created
  const userContributionsCount = await getUserContributionsCount(repo, author, token);

  let umphGreeting = `🎉 **oAudrey Git Greetings!** 🎉\n\n`;

  if (userContributionsCount === 0) {
    umphGreeting += `Welcome @${author}! It's great to see your very first ${eventType} here. You're bringing that extra umph to the team! 🚀\n\n`;
  } else {
    umphGreeting += `Welcome back @${author}! Thanks for your continued contributions. That's ${userContributionsCount + 1} times you've added extra umph to this repository! 🔥\n\n`;
  }

  umphGreeting += `${greetingMessage}\n\n`;
  umphGreeting += `_Have a fantastic day and happy coding!_ ✨`;

  console.log("Posting comment...");
  await postComment(repo, issueNumber, umphGreeting, token);
  console.log("Comment posted successfully.");
}

function getUserContributionsCount(repo, author, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: `/search/issues?q=repo:${repo}+author:${author}+type:pr`,
      method: 'GET',
      headers: {
        'User-Agent': 'oaudrey-git-greetings',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(data);
            const prCount = parsed.total_count || 0;

            // Now get issues
            const issueOptions = {
               ...options,
               path: `/search/issues?q=repo:${repo}+author:${author}+type:issue`
            };
            const req2 = https.request(issueOptions, (res2) => {
                let data2 = '';
                res2.on('data', (chunk) => data2 += chunk);
                res2.on('end', () => {
                   if (res2.statusCode >= 200 && res2.statusCode < 300) {
                       try {
                           const parsed2 = JSON.parse(data2);
                           resolve(prCount + (parsed2.total_count || 0));
                       } catch (e) {
                           // If JSON parsing fails, just resolve with what we have
                           resolve(prCount);
                       }
                   } else {
                       resolve(prCount);
                   }
                });
            });
            req2.on('error', () => resolve(prCount));
            req2.end();

          } catch (e) {
            console.error("Error parsing search results:", e);
            resolve(0); // Default to 0 on error
          }
        } else {
          console.error(`GitHub API search returned status ${res.statusCode}: ${data}`);
          resolve(0);
        }
      });
    });

    req.on('error', (e) => {
      console.error("Error searching GitHub API:", e);
      resolve(0); // Default to 0 on error
    });

    req.end();
  });
}

function postComment(repo, issueNumber, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ body });

    const options = {
      hostname: 'api.github.com',
      path: `/repos/${repo}/issues/${issueNumber}/comments`,
      method: 'POST',
      headers: {
        'User-Agent': 'oaudrey-git-greetings',
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(responseData);
        } else {
          reject(new Error(`GitHub API returned status ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

if (require.main === module) {
  main().catch((err) => {
    console.error("Action failed:", err);
    process.exit(1);
  });
}

module.exports = { main, getUserContributionsCount, postComment };
