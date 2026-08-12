import assert from 'node:assert/strict';
import {
  MAX_SKILLS,
  buildManifestFromForm,
  formatValidationAlert,
  sampleInvalidManifest,
  sampleValidManifest,
  validateAgentManifest,
} from '../app/data/validator';

{
  const result = validateAgentManifest(sampleValidManifest());
  assert.equal(result.valid, true, result.summary);
  assert.equal(result.errors.length, 0);
  assert.equal(result.skill_budget_remaining, 2);
}

{
  const result = validateAgentManifest(sampleInvalidManifest());
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.keyword === 'maxItems'));
  assert.ok(result.errors.some((e) => e.path === '/persona_id'));
  assert.ok(
    result.errors.some((e) => e.path.includes('execution_timeout_seconds')),
  );
  assert.ok(
    result.errors.some((e) => e.path.includes('allow_local_shell_access')),
  );
}

{
  const tooMany = buildManifestFromForm({
    persona_id: 'fleet-runner-agent',
    version: '2.1.0',
    skills: [
      'web_scrape',
      'keyword_extract',
      'mcp_file_read',
      'github_api_commit',
      'linear_task_update',
      'terminal_cli_command',
    ],
    target_artifact_domains: ['meetaudreyevans'],
    execution_timeout_seconds: 30,
    allow_local_shell_access: true,
  });
  assert.equal((tooMany.skills as string[]).length, MAX_SKILLS + 1);
  const result = validateAgentManifest(tooMany);
  assert.equal(result.valid, false);
  assert.match(result.summary, /hard ceiling|validation errors/i);
}

{
  const ok = buildManifestFromForm({
    persona_id: 'docs-writer-agent',
    version: '0.3.1',
    skills: ['mcp_file_read'],
    target_artifact_domains: ['openaudrey'],
    execution_timeout_seconds: 120,
    allow_local_shell_access: false,
  });
  const result = validateAgentManifest(ok);
  assert.equal(result.valid, true, result.summary);
  assert.equal(result.skill_budget_remaining, 4);
}

{
  const cargo = formatValidationAlert({
    workflowName: 'Product Test',
    executionId: 't-1',
    errorMessage: 'skills exceeds hard ceiling of 5',
  });
  assert.match(cargo, /Validation Circuit Breaker Tripped/);
  assert.match(cargo, /Product Test/);
  assert.match(cargo, /skills exceeds hard ceiling of 5/);
}

{
  const result = validateAgentManifest('not-an-object');
  assert.equal(result.valid, false);
  assert.match(result.summary, /JSON object/);
}

console.log('✅ agent-manifest-validator tests passed.');
