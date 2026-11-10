#!/usr/bin/env node
import { LagoClient } from './lago.mjs';
import { readFile } from 'node:fs/promises';

// JSON input via stdin avoids putting customer details in the process arguments.
// Mutations are explicit; portal remains a read-only operation.
const [action, apply] = process.argv.slice(2);
const methods = { customer: 'createCustomer', subscription: 'assignPlan', usage: 'recordUsage', plan: 'createPlan', checkout: 'checkout', portal: 'portal' };
try {
  if (!methods[action]) throw new Error('Usage: node cli.mjs customer|subscription|usage|plan|checkout|portal [--apply] < request.json');
  if (action !== 'portal' && apply !== '--apply') throw new Error('Mutation requires --apply');
  const input = JSON.parse(await readFile(0, 'utf8'));
  const client = new LagoClient();
  const result = await client[methods[action]](['portal', 'checkout'].includes(action) ? input.externalCustomerId : input);
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
