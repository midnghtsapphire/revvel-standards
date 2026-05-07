const assert = require('assert');
const setProjectFields = require('../.github/scripts/set-project-fields.js');

async function runTest() {
  const mutations = [];
  const logs = [];

  const mockGithub = {
    rest: {
      issues: {
        get: async () => ({
          data: {
            body: `
### Output Type

production-app

### Lifecycle Mode

refresh-existing

### Delivery Mode

auto-classify
            `
          }
        })
      }
    },
    graphql: async (query, variables) => {
      if (query.includes('query($projectId: ID!)')) {
        return {
          node: {
            fields: {
              nodes: [
                { id: 'F1', name: 'Status', options: [{ id: 'O1', name: 'Inbox' }] },
                { id: 'F2', name: 'Lifecycle Mode', options: [{ id: 'O2', name: 'new-build' }, { id: 'O3', name: 'refresh-existing' }] },
                { id: 'F3', name: 'Delivery Mode', options: [{ id: 'O4', name: 'build-direct' }] }
              ]
            }
          }
        };
      } else if (query.includes('mutation')) {
        mutations.push({ query, variables });
        return { projectV2Item: { id: variables.itemId } };
      }
    }
  };

  const mockCore = {
    info: (msg) => logs.push(msg),
    warning: (msg) => logs.push(`WARN: ${msg}`),
    setFailed: (msg) => logs.push(`FAIL: ${msg}`)
  };

  const mockContext = {
    repo: { owner: 'test', repo: 'test' },
    payload: {
      issue: { number: 1 }
    }
  };

  process.env.PROJECT_ID = 'TEST_PROJECT';
  process.env.ITEM_ID = 'TEST_ITEM';

  await setProjectFields({ github: mockGithub, context: mockContext, core: mockCore });

  // Assertions

  // 1. Expected mutations
  assert.strictEqual(mutations.length, 3, 'Should execute 3 mutations (Status, Lifecycle Mode, Delivery Mode)');

  const statusMutation = mutations.find(m => m.variables.fieldId === 'F1');
  assert.strictEqual(statusMutation.variables.optionId, 'O1', 'Status should fallback to default Inbox (O1)');

  const lifecycleMutation = mutations.find(m => m.variables.fieldId === 'F2');
  assert.strictEqual(lifecycleMutation.variables.optionId, 'O3', 'Lifecycle Mode should use explicit choice refresh-existing (O3)');

  const deliveryMutation = mutations.find(m => m.variables.fieldId === 'F3');
  assert.strictEqual(deliveryMutation.variables.optionId, 'O4', 'Delivery Mode should fallback to default build-direct (O4)');
  assert.ok(
    logs.some(l => l.includes('- Delivery Mode: build-direct (default)')),
    'Delivery Mode auto-classify should be treated as no explicit choice and use default'
  );
  assert.ok(
    !logs.some(l => l.includes('Option "auto-classify" not found for Field "Delivery Mode"')),
    'Should not attempt to set auto-classify as a project option'
  );

  // 2. Expected warnings for missing fields (the mock schema only returned 3 of the 8 default fields)
  assert.ok(logs.some(l => l.includes('Field "Priority" not found')), 'Should warn about missing Priority field');
  assert.ok(logs.some(l => l.includes('Field "Research Mode" not found')), 'Should warn about missing Research Mode field');

  console.log('✅ Unit test for set-project-fields logic passed.');
}

runTest().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
