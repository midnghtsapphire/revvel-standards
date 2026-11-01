const { test } = require('node:test');
const assert = require('node:assert/strict');
const Ajv2020 = require('ajv/dist/2020');
const schema = require('../contract.schema.json');
const ajv = new Ajv2020({ strict: true, allErrors: true });
const validate = ajv.compile(schema);
const job = {
  kind: 'job', contract_version: '1.0.0', tenant_id: 'tenant-a', workspace_id: 'workspace-a',
  idempotency_key: 'request-1', expected_revision: 0, admission_id: 'admission-a',
  capability: 'chat', action: 'review', max_attempts: 3, payload: { source_commit: 'a'.repeat(40) },
};
test('accepts a bounded versioned job without caller-supplied actor authority', () => {
  assert.equal(validate(job), true, JSON.stringify(validate.errors));
});
test('rejects unsupported version, cross-wire extra fields, missing admission and unbounded retries', () => {
  for (const changes of [
    { contract_version: '2.0.0' }, { principal_id: 'owner' }, { tenant_id: '' },
    { max_attempts: 0 }, { max_attempts: 11 }, { max_attempts: true }, { admission_id: null },
  ]) assert.equal(validate({ ...job, ...changes }), false);
  const { admission_id, ...unacknowledged } = job;
  assert.equal(validate(unacknowledged), false);
});
test('switch is numeric 0/1 with explicit drain/revoke and a required revision', () => {
  const message = {
    kind: 'switch', contract_version: '1.0.0', tenant_id: 't', workspace_id: 'w',
    idempotency_key: 'switch-1', expected_revision: 1, resource_id: 'agent-a',
    enabled: 0, running_action: 'revoke', reason: 'operator request',
  };
  assert.equal(validate(message), true, JSON.stringify(validate.errors));
  for (const enabled of [true, '1', -1, 2]) assert.equal(validate({ ...message, enabled }), false);
  assert.equal(validate({ ...message, running_action: 'ignore' }), false);
  assert.equal(validate({ ...message, expected_revision: 0 }), false);
});
test('successful receipt requires evidence, executor and bounded artifact provenance', () => {
  const message = {
    kind: 'receipt', contract_version: '1.0.0',
    identity: { tenant_id: 't', workspace_id: 'w', principal_id: 'visitor' },
    job_id: 'j', fence: 1, proposed_by: 'visitor', executed_by: 'worker', provider_id: 'local',
    model_ref: 'local-model', route_ref: 'route-1', status: 'succeeded', duration_ms: 1,
    score: null, evidence: ['owned:proof'], artifacts: [{ kind: 'graph', uri: 'owned:graph',
      sha256: 'a'.repeat(64), size_bytes: 3, source_commit: 'b'.repeat(40), attribution_ref: 'owned:license' }],
  };
  assert.equal(validate(message), true, JSON.stringify(validate.errors));
  assert.equal(validate({ ...message, evidence: [] }), false);
  assert.equal(validate({ ...message, executed_by: '' }), false);
  assert.equal(validate({ ...message, artifacts: [{ ...message.artifacts[0], sha256: 'fake' }] }), false);
  assert.equal(validate({ ...message, status: 'blocked', evidence: [] }), true);
});
