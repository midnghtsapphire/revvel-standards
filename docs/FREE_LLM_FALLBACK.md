# Free LLM Fallback Configuration

**Last Updated:** 2026-06-15
**Purpose:** Automatic fallback to free models when OpenRouter credits are exhausted

---

## Quick Setup - Free Model Priority

Since OpenRouter credits are exhausted, use these **FREE models first**:

### Priority Order (Best to Fastest)

| Priority | Model | Context | Best For |
|----------|-------|---------|----------|
| 1️⃣ | `nousresearch/hermes-3-llama-3.1-405b:free` | 131K | Complex reasoning, coding |
| 2️⃣ | `meta-llama/llama-3.3-70b-instruct:free` | 131K | General tasks, balanced |
| 3️⃣ | `nvidia/nemotron-3-super-120b-a12b:free` | 1M | Long context, research |
| 4️⃣ | `google/gemma-4-31b-it:free` | 262K | Fast responses |
| 5️⃣ | `qwen/qwen3-coder:free` | 32K | Coding tasks |
| 6️⃣ | `perplexity/sonar` | varies | Research, web search |

---

## Environment Variable Setup

Add to your `.env` or GitHub Secrets:

```bash
# FREE MODELS (use these now - credits exhausted)
LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free
LLM_API_KEY=$OPENROUTER_API_KEY

# Fallback chain (in order)
FALLBACK_MODEL_1=nousresearch/hermes-3-llama-3.1-405b:free
FALLBACK_MODEL_2=google/gemma-4-31b-it:free
FALLBACK_MODEL_3=qwen/qwen3-coder:free
```

---

## GitHub Actions Workflow with Fallback

```yaml
name: LLM Task with Free Fallback
on: workflow_dispatch

jobs:
  run-llm:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Call LLM with Auto-Fallback
        id: llm_call
        run: |
          # FREE model chain (no credits needed)
          MODELS=(
            "meta-llama/llama-3.3-70b-instruct:free"
            "nousresearch/hermes-3-llama-3.1-405b:free"
            "google/gemma-4-31b-it:free"
          )
          
          for MODEL in "${MODELS[@]}"; do
            echo "Trying: $MODEL"
            RESULT=$(curl -s -X POST "https://openrouter.ai/api/v1/chat/completions" \
              -H "Authorization: Bearer $OPENROUTER_API_KEY" \
              -H "Content-Type: application/json" \
              -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"Hello\"}]}" 2>&1)
            
            if echo "$RESULT" | grep -q "choices"; then
              echo "✅ Success with $MODEL"
              echo "result=$RESULT" >> $GITHUB_OUTPUT
              exit 0
            fi
            echo "❌ Failed with $MODEL: $(echo $RESULT | jq -r '.error.message' 2>/dev/null || echo $RESULT)"
          done
          
          echo "result=All models failed" >> $GITHUB_OUTPUT
          exit 1
```

---

## Code Example - Automatic Fallback

```javascript
// free-llm-fallback.js
const FREE_MODELS = [
  'nousresearch/hermes-3-llama-3.1-405b:free',  // Best quality
  'meta-llama/llama-3.3-70b-instruct:free',     // Balanced
  'google/gemma-4-31b-it:free',                  // Fast
  'qwen/qwen3-coder:free',                       // Coding
];

async function callWithFallback(messages, systemPrompt = '') {
  for (const model of FREE_MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: systemPrompt ? [{role: 'system', content: systemPrompt}, ...messages] : messages,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        return { model, content: data.choices[0].message.content };
      }
      
      const error = await response.json();
      if (error.error?.code === 'insufficient_quota') continue; // Try next
      throw error;
    } catch (e) {
      console.log(`Model ${model} failed:`, e.message);
      continue;
    }
  }
  throw new Error('All free models exhausted');
}
```

---

## Available Free Models (OpenRouter)

| Model ID | Context | Strengths |
|----------|---------|-----------|
| `nousresearch/hermes-3-llama-3.1-405b:free` | 131K | Reasoning, instructions |
| `meta-llama/llama-3.3-70b-instruct:free` | 131K | General purpose |
| `nvidia/nemotron-3-super-120b-a12b:free` | 1M | **Longest context** |
| `google/gemma-4-31b-it:free` | 262K | Fast, efficient |
| `google/gemma-4-26b-a4b-it:free` | 262K | Balanced |
| `qwen/qwen3-next-80b-a3b-instruct:free` | 32K | Next-gen |
| `qwen/qwen3-coder:free` | 32K | **Coding specialized** |
| `cognitivecomputations/dolphin-mistral-24b-venice-edition:free` | 32K | Uncensored |
| `nvidia/nemotron-3-nano-30b-a3b:free` | 256K | Small, fast |
| `poolside/laguna-m.1:free` | 128K | General |
| `openai/gpt-oss-120b:free` | 128K | GPT-style |

---

## Usage with Perplexity (No-AI)

For **research and web search**, use Perplexity directly:

```bash
# Perplexity Sonar (no credit cost for basic)
curl -X POST "https://api.perplexity.ai/chat/completions" \
  -H "Authorization: Bearer $PERPLEXITY_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "sonar",
    "messages": [{"role": "user", "content": "Research topic here"}]
  }'
```

Models available:
- `sonar` - Fast, web search
- `sonar-pro` - Better quality
- `sonar-deep-research` - Deep research mode

---

## Updating Workflows in revvel-standards

To update existing workflows to use free models:

```bash
# Find workflows using LLM
grep -r "claude-3.5-sonnet\|claude-3.5-opus\|gpt-4" .github/workflows/

# Replace with free model
sed -i 's/anthropic\/claude-3.5-sonnet/meta-llama\/llama-3.3-70b-instruct:free/g' workflow.yml
```

---

**Last Updated:** 2026-06-15
**Status:** Credits exhausted - using free models only