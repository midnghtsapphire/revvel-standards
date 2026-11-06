#!/usr/bin/env node
// 2026-11-06 Codex: run the existing reconciler on CircleCI's trusted main
// schedule. The context's server-side restrictions are the credential boundary;
// these checks catch accidental manual/branch runs, not malicious YAML edits.
import { pathToFileURL } from 'node:url';
import { main as reconcile } from '../../scripts/pr-lifecycle-labels.mjs';

export function lifecycleInvocation(env) {
  if (env.CIRCLE_BRANCH !== 'main' || env.CIRCLE_TAG ||
      env.CIRCLE_PULL_REQUEST || env.CIRCLE_PULL_REQUESTS) {
    throw new Error('Lifecycle maintenance requires a main-branch pipeline without a PR or tag.');
  }
  if (env.CIRCLE_PROJECT_USERNAME !== 'midnghtsapphire' ||
      env.CIRCLE_PROJECT_REPONAME !== 'revvel-standards') {
    throw new Error('Lifecycle maintenance is scoped to midnghtsapphire/revvel-standards.');
  }
  // A dedicated context token takes priority. Existing GH_TOKEN/GITHUB_TOKEN
  // names also work if supplied through this restricted context. Never move a
  // write credential into project-wide variables to make this job pass.
  const token = env.REVVEL_LIFECYCLE_GITHUB_TOKEN || env.GH_TOKEN || env.GITHUB_TOKEN;
  if (!token) throw new Error('Missing GitHub credential in the revvel-pr-lifecycle context.');
  const authors = env.REVVEL_BADGE_AUTHORS;
  if (!authors?.trim()) throw new Error('Set REVVEL_BADGE_AUTHORS to the verified badge author and token actor logins.');
  const apply = env.REVVEL_LIFECYCLE_APPLY || 'false';
  if (!['true', 'false'].includes(apply)) {
    throw new Error('REVVEL_LIFECYCLE_APPLY must be true or false; unset defaults to dry run.');
  }
  const argv = ['--repo', 'midnghtsapphire/revvel-standards', '--badges', '--badge-author', authors];
  if (apply === 'true') argv.push('--apply');
  return { argv, token, apply: apply === 'true' };
}

export async function main(env = process.env) {
  const invocation = lifecycleInvocation(env);
  console.log(`Lifecycle mode: ${invocation.apply ? 'apply' : 'dry-run'}; GitHub credential present (value hidden).`);
  await reconcile(invocation.argv, { GH_TOKEN: invocation.token });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
