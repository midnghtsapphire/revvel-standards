# OpenRouter Model Routing

Task-based model routing with automatic fallback for coding workflows.

## Overview

The OpenRouter routing module provides a simple interface for executing LLM requests with automatic model fallback based on task profiles. This enables:

- **Independent model selection** for different types of coding tasks
- **Automatic failover** when a model/provider errors (rate limits, downtime, moderation, context length issues)
- **Observability** of which model was actually used for each request
- **Cost optimization** by preferring cheaper models for appropriate tasks

## Quick Start

### 1. Set up your API key

```bash
export OPENROUTER_API_KEY='your-key-here'
```

Get your API key from [OpenRouter](https://openrouter.ai/).

### 2. Run the example CLI

```bash
node scripts/openrouter-routing-example.js repo_surgery "Fix the authentication bug"
```

### 3. Use in your code

```javascript
const { routedChat } = require('./scripts/openrouter-routing');

const result = await routedChat({
  profile: 'repo_surgery',
  messages: [
    { role: 'user', content: 'Refactor the database layer to use async/await' }
  ],
  temperature: 0.7,
});

console.log(result.text);           // Generated response
console.log(result.modelUsed);      // Which model responded
console.log(result.requestedModels); // Fallback chain attempted
```

## Routing Profiles

The module includes three pre-configured routing profiles:

### `repo_surgery`

**Use for:** Multi-file edits, bug fixing, refactors, and "take initiative" tasks

**Model fallback chain:**
1. `anthropic/claude-sonnet-4` (primary: independent, high-quality reasoning)
2. `deepseek/deepseek-v3.2` (fallback: cost-effective, strong coding)
3. `openai/gpt-5.2-codex` (fallback: debugging specialist)

**When to use:**
- Complex bug fixes requiring understanding of multiple components
- Refactoring that requires maintaining correctness
- Feature implementation with architectural decisions
- Tasks where the agent should take initiative and suggest improvements

### `cheap_batch_edits`

**Use for:** Repetitive transforms, test generation, lint-fix loops, and lower-cost bulk changes

**Model fallback chain:**
1. `deepseek/deepseek-v3.2` (primary: cost-effective, reliable)
2. `anthropic/claude-sonnet-4` (fallback: higher quality if needed)

**When to use:**
- Generating boilerplate code
- Writing unit tests from specifications
- Applying mechanical refactorings (rename, extract method)
- Fixing linter warnings
- Format conversions and data transformations

### `hard_debug`

**Use for:** Difficult failures, ambiguous root-cause analysis, and second-opinion patches

**Model fallback chain:**
1. `openai/gpt-5.2-codex` (primary: specialized debugging reasoning)
2. `anthropic/claude-sonnet-4` (fallback: alternative perspective)
3. `deepseek/deepseek-v3.2` (fallback: code-focused analysis)

**When to use:**
- Investigating flaky tests
- Analyzing memory leaks or performance issues
- Understanding race conditions or concurrency bugs
- Getting a second opinion when stuck on a problem
- Complex stack traces with unclear root causes

## API Reference

### `routedChat(params)`

Execute a chat completion using a named routing profile.

**Parameters:**
- `profile` (string, required): Profile name (`repo_surgery`, `cheap_batch_edits`, `hard_debug`)
- `messages` (array, required): Array of message objects with `role` and `content`
- `temperature` (number, optional): Sampling temperature (0.0-2.0, default: 0.7)
- `max_tokens` (number, optional): Maximum tokens to generate (default: 4000)
- `apiKey` (string, optional): OpenRouter API key (defaults to `OPENROUTER_API_KEY` env var)
- `silent` (boolean, optional): Suppress console logging (default: false)
- `timeout` (number, optional): Request timeout in milliseconds (default: 60000)
- `httpReferer` (string, optional): HTTP-Referer header (defaults to `OPENROUTER_HTTP_REFERER` env var or repo URL)
- `appTitle` (string, optional): X-Title header (defaults to `OPENROUTER_APP_TITLE` env var or app name)

**Returns:** Promise resolving to:
```javascript
{
  text: string,              // Generated response content
  modelUsed: string|null,    // Model that actually responded
  requestedModels: string[], // Fallback chain attempted
  profile: string,           // Profile name used
  profileDescription: string,// Profile description
  raw: object               // Raw OpenRouter API response
}
```

**Example:**
```javascript
const result = await routedChat({
  profile: 'repo_surgery',
  messages: [
    { role: 'system', content: 'You are a helpful coding assistant.' },
    { role: 'user', content: 'How do I fix this memory leak?' }
  ],
  temperature: 0.5,
  max_tokens: 2000,
  silent: true, // Suppress console logging
});
```

### `callOpenRouter(params)`

Low-level function to call OpenRouter directly with custom model arrays.

**Parameters:**
- `models` (array, required): Array of model identifiers in fallback order
- `messages` (array, required): Array of message objects
- `temperature` (number, optional): Sampling temperature
- `max_tokens` (number, optional): Maximum tokens to generate
- `apiKey` (string, optional): OpenRouter API key
- `timeout` (number, optional): Request timeout in milliseconds (default: 60000)
- `httpReferer` (string, optional): HTTP-Referer header (configurable for different environments)
- `appTitle` (string, optional): X-Title header (configurable for different applications)

**Returns:** Promise resolving to response object (same structure as `routedChat` but without profile metadata)

**Example:**
```javascript
const { callOpenRouter } = require('./scripts/openrouter-routing');

const result = await callOpenRouter({
  models: ['anthropic/claude-sonnet-4', 'openai/gpt-4-turbo'],
  messages: [{ role: 'user', content: 'Hello!' }],
});
```

### `getProfiles()`

Get all available routing profiles.

**Returns:** Object mapping profile names to configuration objects

**Example:**
```javascript
const profiles = getProfiles();
// {
//   repo_surgery: { description: '...', models: [...] },
//   ...
// }
```

### `getProfileModels(profile)`

Get the model fallback chain for a specific profile.

**Parameters:**
- `profile` (string, required): Profile name

**Returns:** Array of model identifiers

**Example:**
```javascript
const models = getProfileModels('repo_surgery');
// ['anthropic/claude-sonnet-4', 'deepseek/deepseek-v3.2', 'openai/gpt-5.2-codex']
```

## Error Handling

The module surfaces errors cleanly when all fallbacks fail:

```javascript
try {
  const result = await routedChat({
    profile: 'repo_surgery',
    messages: [{ role: 'user', content: 'test' }],
  });
} catch (err) {
  console.error('All models failed:', err.message);
  // Handle error appropriately
}
```

**Common error scenarios:**
- Missing `OPENROUTER_API_KEY`: Throws immediately
- All models in fallback chain fail: Throws after exhausting chain
- Invalid profile name: Throws before making any requests (includes list of available profiles)
- Empty messages array: Throws validation error
- Request timeout: Throws after configured timeout (default 60 seconds)
- Non-2xx HTTP status: Throws with status code and response body excerpt

## OpenRouter Fallback Behavior

OpenRouter automatically tries models in order when:

1. **Rate limiting**: Model's rate limit is reached
2. **Context length**: Prompt exceeds model's context window
3. **Moderation**: Content is flagged by the model's safety filters
4. **Downtime**: Model or provider is temporarily unavailable

The `modelUsed` field in the response tells you which model actually responded, which may differ from the first model in the chain.

**Note:** Fallback is best-effort. If all models fail for the same reason (e.g., prompt violates all models' policies), the request will fail.

For more details, see [OpenRouter's fallback documentation](https://openrouter.ai/docs/guides/routing/model-fallbacks).

## Configuration

### Environment Variables

- `OPENROUTER_API_KEY` (required): Your OpenRouter API key
- `OPENROUTER_HTTP_REFERER` (optional): Custom HTTP-Referer header for API requests
- `OPENROUTER_APP_TITLE` (optional): Custom X-Title header for API requests

### Logging

The module logs routing decisions to `stdout` by default:

```text
🔀 Routing profile: repo_surgery
📝 Description: Multi-file edits, bug fixing, refactors, and "take initiative" tasks
🎯 Requested models (fallback order): anthropic/claude-sonnet-4 → deepseek/deepseek-v3.2 → openai/gpt-5.2-codex
✅ Model used: anthropic/claude-sonnet-4
```

To suppress logs, use the `silent` option:

```javascript
const result = await routedChat({
  profile: 'repo_surgery',
  messages: [{ role: 'user', content: 'test' }],
  silent: true, // No console output
});
```

## Testing

Run the unit tests:

```bash
node tests/openrouter-routing.test.js
```

The tests verify:
- Profile structure and model arrays
- Error handling for invalid inputs
- Request validation

**Note:** Tests do not make actual API calls by default to avoid costs. To test with real API calls, set `OPENROUTER_API_KEY` and run the example CLI.

## Example Usage Scenarios

### Scenario 1: Bug Fix PR

```javascript
const { routedChat } = require('./scripts/openrouter-routing');

async function generateBugFix(bugDescription, codeContext) {
  const result = await routedChat({
    profile: 'repo_surgery',
    messages: [
      { role: 'system', content: 'You are an expert software engineer.' },
      { role: 'user', content: `Bug: ${bugDescription}\n\nCode:\n${codeContext}\n\nProvide a fix.` }
    ],
  });
  
  return result.text;
}
```

### Scenario 2: Test Generation

```javascript
async function generateTests(sourceCode, testFramework) {
  const result = await routedChat({
    profile: 'cheap_batch_edits',
    messages: [
      { role: 'user', content: `Generate ${testFramework} tests for:\n${sourceCode}` }
    ],
  });
  
  console.log(`Tests generated using ${result.modelUsed}`);
  return result.text;
}
```

### Scenario 3: Debugging Assistance

```javascript
async function debugStackTrace(stackTrace, sourceCode) {
  const result = await routedChat({
    profile: 'hard_debug',
    messages: [
      { role: 'user', content: `Analyze this error:\n${stackTrace}\n\nRelevant code:\n${sourceCode}` }
    ],
    temperature: 0.3, // Lower temperature for more deterministic debugging
  });
  
  return {
    analysis: result.text,
    modelUsed: result.modelUsed,
  };
}
```

## Integration with Existing Code

The routing module is designed to be drop-in compatible with existing OpenRouter callsites. To migrate:

**Before:**
```javascript
const result = await callOpenRouter(
  'anthropic/claude-sonnet-4',
  messages,
  4000
);
```

**After:**
```javascript
const { routedChat } = require('./scripts/openrouter-routing');
const result = await routedChat({
  profile: 'repo_surgery',
  messages,
  max_tokens: 4000,
});
```

## Troubleshooting

### Issue: "OPENROUTER_API_KEY is required

**Solution:** Set the environment variable:
```bash
export OPENROUTER_API_KEY='sk-or-v1-...'
```

### Issue: "All models in fallback chain failed

**Possible causes:**
1. All models are rate-limited (wait and retry)
2. Prompt violates content policies (modify prompt)
3. Network connectivity issues (check internet connection)
4. Invalid API key (verify key at [OpenRouter](https://openrouter.ai/))

**Debug:** Check the error message for specific details about why the last model failed.

### Issue: Unexpected model used

OpenRouter may use a fallback model if the primary model is unavailable. Check the `modelUsed` field to see which model responded. This is expected behavior and indicates the fallback system is working.

## Cost Considerations

Different models have different costs per token. The routing profiles are designed with cost-effectiveness in mind:

- **repo_surgery**: Prioritizes quality over cost (Claude Sonnet 4 first)
- **cheap_batch_edits**: Prioritizes cost over quality (DeepSeek first)
- **hard_debug**: Prioritizes specialized reasoning (GPT-5.2 Codex first)

To monitor costs, log the `modelUsed` field and track usage:

```javascript
const result = await routedChat({ /* ... */ });
console.log(`Request handled by: ${result.modelUsed}`);
// Log to your analytics/monitoring system
```

## Contributing

To add a new routing profile:

1. Add the profile to `ROUTING_PROFILES` in `scripts/openrouter-routing.js`
2. Add tests in `tests/openrouter-routing.test.js`
3. Document the profile in this file
4. Update the example CLI if needed

## See Also

- [OpenRouter Documentation](https://openrouter.ai/docs)
- [OpenRouter Model Fallbacks](https://openrouter.ai/docs/guides/routing/model-fallbacks)
- [OpenRouter Model List](https://openrouter.ai/docs/models)
- [Agent Autonomy Protocols](./AGENT_AUTONOMY_PROTOCOLS.md) (existing fallback patterns in this repo)
