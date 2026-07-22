# Free LLM Fallback Configuration

**Last Updated:** 2026-06-15
**Purpose:** Automatic fallback to free models when OpenRouter credits are exhausted
**Status:** Credits exhausted - using free models only

---

## ⚠️ Rate Limit Strategy

Free models have limits! Here's the plan:

### Known Limits (Per Model)

| Model | Rate Limit | Strategy |
|-------|------------|----------|
| `llama-3.3-70b:free` | ~50 req/min | Rotate providers |
| `hermes-3-405b:free` | ~30 req/min | Use for complex tasks only |
| `gemma-4-31b:free` | ~100 req/min | Primary for fast tasks |
| `qwen3-coder:free` | ~60 req/min | Coding only |
| `nemotron-120b:free` | ~20 req/min | Long context, low frequency |

### Multi-Provider Fallback Plan

```javascript
// Round-robin through free models to avoid rate limits
const FREE_PROVIDERS = [
  { name: 'llama', model: 'meta-llama/llama-3.3-70b-instruct:free', rpm: 50 },
  { name: 'hermes', model: 'nousresearch/hermes-3-llama-3.1-405b:free', rpm: 30 },
  { name: 'gemma', model: 'google/gemma-4-31b-it:free', rpm: 100 },
  { name: 'qwen', model: 'qwen/qwen3-coder:free', rpm: 60 },
  { name: 'nemotron', model: 'nvidia/nemotron-3-super-120b-a12b:free', rpm: 20 },
];

// Rate limiter state
const rateLimitState = {
  llama: { count: 0, resetAt: Date.now() + 60000 },
  hermes: { count: 0, resetAt: Date.now() + 60000 },
  gemma: { count: 0, resetAt: Date.now() + 60000 },
  qwen: { count: 0, resetAt: Date.now() + 60000 },
  nemotron: { count: 0, resetAt: Date.now() + 60000 },
};

function getAvailableModel() {
  const now = Date.now();
  for (const provider of FREE_PROVIDERS) {
    const state = rateLimitState[provider.name];
    
    // Reset counter if minute passed
    if (now > state.resetAt) {
      state.count = 0;
      state.resetAt = now + 60000;
    }
    
    // Use if under limit
    if (state.count < provider.rpm * 0.8) {  // 80% threshold
      state.count++;
      return provider.model;
    }
  }
  return null;  // All limits hit
}
```

---

## 🛡️ Rate Limit Handling Workflow

```yaml
name: LLM Task with Rate Limit Handling
on: workflow_dispatch

jobs:
  run-llm:
    runs-on: ubuntu-latest
    steps:
      - name: Check rate limits first
        id: check_limits
        run: |
          # Check which models are available
          AVAILABLE=""
          
          # Test llama
          if ! curl -s -o /dev/null -w "%{http_code}" \
            -X POST "https://openrouter.ai/api/v1/chat/completions" \
            -H "Authorization: Bearer $OPENROUTER_API_KEY" \
            -H "Content-Type: application/json" \
            -d '{"model":"meta-llama/llama-3.3-70b-instruct:free","messages":[{"role":"user","content":"test"}],"max_tokens":1}' | grep -q "429"; then
            AVAILABLE="$AVAILABLE llama"
          fi
          
          echo "available=$AVAILABLE" >> $GITHUB_OUTPUT

      - name: Call LLM with rotation
        run: |
          # Priority order based on rate limit headroom
          MODELS=(
            "google/gemma-4-31b-it:free"      # 100 rpm - most available
            "meta-llama/llama-3.3-70b-instruct:free"  # 50 rpm
            "qwen/qwen3-coder:free"           # 60 rpm
            "nousresearch/hermes-3-llama-3.1-405b:free"  # 30 rpm
          )
          
          for MODEL in "${MODELS[@]}"; do
            echo "Trying: $MODEL"
            RESULT=$(curl -s -X POST "https://openrouter.ai/api/v1/chat/completions" \
              -H "Authorization: Bearer $OPENROUTER_API_KEY" \
              -H "Content-Type: application/json" \
              -d "{\"model\":\"$MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"${{ inputs.prompt }}\"}],\"max_tokens\":1000}" 2>&1)
            
            # Check for success
            if echo "$RESULT" | jq -e '.choices[0].message.content' > /dev/null 2>&1; then
              echo "✅ Success with $MODEL"
              echo "result=$RESULT" >> $GITHUB_OUTPUT
              echo "model=$MODEL" >> $GITHUB_OUTPUT
              exit 0
            fi
            
            # Check if rate limited
            if echo "$RESULT" | jq -e '.error.code == "rate_limit_exceeded"' > /dev/null 2>&1; then
              echo "⏳ Rate limited with $MODEL, trying next..."
              continue
            fi
            
            echo "❌ Failed with $MODEL: $(echo $RESULT | jq -r '.error.message' 2>/dev/null)"
          done
          
          # All failed - queue for later
          echo "result=Rate limited" >> $GITHUB_OUTPUT
          echo "model=exhausted" >> $GITHUB_OUTPUT
          exit 1
```

---

## 📊 Daily Request Budget

Assuming these limits per model:

| Model | RPM | Requests/Min | Requests/Hour | Requests/Day |
|-------|-----|--------------|---------------|--------------|
| gemma-4-31b | 100 | 100 | 6,000 | 144,000 |
| llama-3.3-70b | 50 | 50 | 3,000 | 72,000 |
| qwen-coder | 60 | 60 | 3,600 | 86,400 |
| hermes-405b | 30 | 30 | 1,800 | 43,200 |
| nemotron-120b | 20 | 20 | 1,200 | 28,800 |

**Combined daily capacity:** ~374,400 requests/day

**Recommended daily usage:** ~50,000 requests (to stay safe)

---

## 🔄 Queuing System for High Volume

For when limits are hit, add a queue:

```yaml
# Add to workflow that gets rate limited
- name: Queue for retry
  if: failure()
  run: |
    # Save request to queue file
    echo '{"prompt":"${{ inputs.prompt }}","timestamp":"'$(date -Iseconds)'"}' >> queued_requests.json
    
    # If queue > 100, trigger backup workflow
    if [ $(wc -l < queued_requests.json) -gt 100 ]; then
      gh workflow run backup-llm-processing.yml
    fi
```

---

## 🛠️ Monitoring Dashboard

Create a simple monitor:

```bash
# Check current rate limit status
curl -s "https://openrouter.ai/api/v1/models" \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | \
  jq '[.data[] | select(.id | test(":free$")) | {model: .id, rate_limit: .rate_limit}]'
```

---

## Quick Setup - Free Model Priority

Since OpenRouter credits are exhausted, use these **FREE models first**:

### Priority Order (Best to Fastest)

| Priority | Model | Context | RPM | Best For |
|----------|-------|---------|-----|----------|
| 1️⃣ | `google/gemma-4-31b-it:free` | 262K | 100 | Fast responses (highest limit) |
| 2️⃣ | `meta-llama/llama-3.3-70b-instruct:free` | 131K | 50 | General tasks, balanced |
| 3️⃣ | `qwen/qwen3-coder:free` | 32K | 60 | Coding tasks |
| 4️⃣ | `nousresearch/hermes-3-llama-3.1-405b:free` | 131K | 30 | Complex reasoning |
| 5️⃣ | `nvidia/nemotron-3-super-120b-a12b:free` | 1M | 20 | Long context |

---

## Environment Variable Setup

Add to your `.env` or GitHub Secrets:

```bash
# FREE MODELS (use these now - credits exhausted)
LLM_MODEL=google/gemma-4-31b-it:free
LLM_API_KEY=$OPENROUTER_API_KEY

# Rate limit aware fallback chain
FALLBACK_1=google/gemma-4-31b-it:free      # 100 rpm - primary
FALLBACK_2=meta-llama/llama-3.3-70b-instruct:free  # 50 rpm
FALLBACK_3=qwen/qwen3-coder:free           # 60 rpm
FALLBACK_4=nousresearch/hermes-3-llama-3.1-405b:free  # 30 rpm
```

---

## Available Free Models (OpenRouter)

| Model ID | Context | RPM | Strengths |
|----------|---------|-----|-----------|
| `google/gemma-4-31b-it:free` | 262K | 100 | **Fast, high limit** |
| `google/gemma-4-26b-a4b-it:free` | 262K | 100 | Balanced |
| `meta-llama/llama-3.3-70b-instruct:free` | 131K | 50 | General purpose |
| `qwen/qwen3-coder:free` | 32K | 60 | **Coding** |
| `qwen/qwen3-next-80b-a3b-instruct:free` | 32K | 40 | Next-gen |
| `nousresearch/hermes-3-llama-3.1-405b:free` | 131K | 30 | Reasoning |
| `nvidia/nemotron-3-super-120b-a12b:free` | 1M | 20 | **Longest context** |
| `cognitivecomputations/dolphin-mistral-24b:free` | 32K | 50 | Uncensored |
| `nvidia/nemotron-3-nano-30b-a3b:free` | 256K | 80 | Small, fast |

---

## Usage with Perplexity No-Key ⭐

**This is the preferred free option!** Uses `helallao/perplexity-ai` fork - no API key needed.

### How it works
```bash
# Install the no-key fork
pip install "perplexity-api[mcp] @ git+https://github.com/helallao/perplexity-ai.git@main"

# Then use in Python
python scripts/perplexity-research-issue.js --issue 12345
```

### Workflow Integration
```yaml
- name: Perplexity Research (no key)
  run: |
    pip install "perplexity-api[mcp] @ git+https://github.com/helallao/perplexity-ai.git@main"
    node scripts/perplexity-research-issue.js --issue ${{ github.event.issue.number }}
```

### Available Models via Perplexity No-Key

| Model | Description | Best For |
|-------|-------------|----------|
| `sonar` | Fast web search | Quick research |
| `sonar-pro` | Better quality | Detailed analysis |
| `sonar-deep-research` | Deep research mode | Comprehensive research |

### Reference Docs
- [`docs/PERPLEXITY_NO_KEY_INTEGRATION.md`](./PERPLEXITY_NO_KEY_INTEGRATION.md)
- [`scripts/perplexity-research-issue.js`](../scripts/perplexity-research-issue.js)
- [helallao/perplexity-ai](https://github.com/helallao/perplexity-ai) (fork repo)

---

## Updating Workflows in revvel-standards

To update existing workflows to use free models with rate limit handling:

```bash
# Find workflows using LLM
grep -r "claude-3.5-sonnet\|claude-3.5-opus" .github/workflows/

# Replace with rate-limit-aware free model
sed -i 's/anthropic\/claude-3.5-sonnet/google\/gemma-4-31b-it:free/g' workflow.yml
```

---

## TODO: Implement

- [ ] Add rate limit counter to `agent-fallback.yml`
- [ ] Create `free-model-monitor.yml` - tracks usage per model
- [ ] Add queue system for rate-limited requests
- [ ] Create dashboard showing available capacity
- [ ] Set up Perplexity as secondary research backend

---

**Last Updated:** 2026-06-15
