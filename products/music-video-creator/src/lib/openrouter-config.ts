export const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// OpenRouter model fallback chain (consistent with scripts/openrouter-routing.js)
export const OR_MODELS = [
  'anthropic/claude-sonnet-4',
  'deepseek/deepseek-chat',
  'openai/gpt-4o',
];
