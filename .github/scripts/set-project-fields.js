module.exports = async ({ github, context, core }) => {
  const projectId = process.env.PROJECT_ID;
  const itemId = process.env.ITEM_ID;

  if (!projectId || !itemId) {
    core.setFailed('PROJECT_ID and ITEM_ID are required.');
    return;
  }

  // Define target fields and their defaults
  const fields = [
    { name: 'Status', default: 'Inbox', regexLabel: 'Status' },
    { name: 'Priority', default: 'medium', regexLabel: 'Launch Priority' },
    { name: 'Research Mode', default: 'standard', regexLabel: 'Research Mode' },
    { name: 'Delivery Mode', default: 'build-direct', regexLabel: 'Delivery Mode' },
    { name: 'Iteration Mode', default: 'single-pass', regexLabel: 'Iteration Mode' },
    { name: 'Lifecycle Mode', default: 'new-build', regexLabel: 'Lifecycle Mode' },
    { name: 'Commercial Mode', default: 'digital-product', regexLabel: 'Commercial Mode' },
    { name: 'Marketing Ready', default: 'No', regexLabel: 'Marketing Ready' }
  ];

  // Fetch issue body if not fully available in payload (e.g. workflow_dispatch)
  let issueBody = '';
  if (context.payload.issue && context.payload.issue.body) {
    issueBody = context.payload.issue.body;
  } else {
    const issueNumber = process.env.ISSUE_NUMBER || (context.payload.issue && context.payload.issue.number) || context.payload.inputs?.issue_number;
    if (issueNumber) {
      try {
        const { data: issue } = await github.rest.issues.get({
          owner: context.repo.owner,
          repo: context.repo.repo,
          issue_number: parseInt(issueNumber, 10),
        });
        issueBody = issue.body || '';
      } catch (err) {
        core.warning(`Could not fetch issue body: ${err.message}`);
      }
    }
  }

  // Parse explicit WR choices
  const getExplicitChoice = (body, label) => {
    if (!body) return null;
    const regex = new RegExp(`### ${label}\\s+([^\\n\\r]+)`);
    const match = body.match(regex);
    if (match) {
      const val = match[1].trim();
      return val && val !== '_No response_' ? val : null;
    }
    return null;
  };

  const targetValues = fields.map(f => {
    const explicit = getExplicitChoice(issueBody, f.regexLabel);
    return {
      name: f.name,
      targetValue: explicit || f.default,
      source: explicit ? 'explicit WR choice' : 'default',
    };
  });

  core.info('Target values to apply:');
  targetValues.forEach(t => core.info(`- ${t.name}: ${t.targetValue} (${t.source})`));

  // Query GraphQL for project fields and options
  const schemaQuery = `
    query($projectId: ID!) {
      node(id: $projectId) {
        ... on ProjectV2 {
          fields(first: 100) {
            nodes {
              ... on ProjectV2SingleSelectField {
                id
                name
                options {
                  id
                  name
                }
              }
            }
          }
        }
      }
    }
  `;

  let projectData;
  try {
    projectData = await github.graphql(schemaQuery, { projectId });
  } catch (err) {
    core.setFailed(`Failed to fetch project schema: ${err.message}`);
    return;
  }

  const projectFields = projectData?.node?.fields?.nodes || [];

  // Map and execute mutations
  for (const { name, targetValue, source } of targetValues) {
    const fieldNode = projectFields.find(f => f.name && f.name.toLowerCase() === name.toLowerCase());

    if (!fieldNode) {
      core.warning(`Field "${name}" not found in Project. Skipping.`);
      continue;
    }

    const optionNode = fieldNode.options?.find(o => o.name && o.name.toLowerCase() === targetValue.toLowerCase());

    if (!optionNode) {
      core.warning(`Option "${targetValue}" not found for Field "${name}". Skipping.`);
      continue;
    }

    const mutation = `
      mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $optionId: String!) {
        updateProjectV2ItemFieldValue(input: {
          projectId: $projectId
          itemId: $itemId
          fieldId: $fieldId
          value: { singleSelectOptionId: $optionId }
        }) {
          projectV2Item { id }
        }
      }
    `;

    try {
      await github.graphql(mutation, {
        projectId,
        itemId,
        fieldId: fieldNode.id,
        optionId: optionNode.id
      });
      core.info(`✅ Set "${name}" to "${targetValue}" (${source})`);
    } catch (err) {
      core.warning(`Failed to set "${name}": ${err.message}`);
    }
  }
};
