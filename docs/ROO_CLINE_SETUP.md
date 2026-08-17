# Roo-Cline Setup Guide

**Version:** 1.0.0  
**Last Updated:** May 3, 2026  
**Repository:** midnghtsapphire/revvel-standards

---

## What is Roo-Cline

**Roo-Cline** is an autonomous AI coding agent that runs directly in Visual Studio Code. It's a feature-rich fork of **Cline** (formerly Claude Dev), designed to help developers write, refactor, debug, and test code with AI assistance while maintaining human oversight.

### Key Features

- ✅ **Autonomous file operations** — Create, edit, delete files
- ✅ **Terminal command execution** — Run builds, tests, scripts
- ✅ **Multiple specialized modes** — Code, Architect, Ask, Debug
- ✅ **Human-in-the-loop permissions** — Approve actions before execution
- ✅ **Multi-LLM support** — OpenAI, Claude, Gemini, Ollama, and more
- ✅ **Browser actions** — Web search, documentation lookup
- ✅ **MCP integration** — Model Context Protocol for tool use
- ✅ **Open source** — Apache 2.0 license

---

## When to Use Roo-Cline

### Best For

✅ **Local refactoring** — Complex code reorganization  
✅ **Feature implementation** — Adding new functionality with multiple file changes  
✅ **Debug assistance** — Tracking down bugs across multiple files  
✅ **Test writing** — Generating comprehensive test suites  
✅ **Documentation** — Writing or updating technical docs

### Not Suitable For

❌ **CI/CD automation** — Use GitHub Actions workflows instead  
❌ **PR reviews on GitHub** — Use Bito AI or OpenRouter  
❌ **Revenue tasks** — Use GOAP agent  
❌ **Tasks requiring server access** — Use cloud-based agents

---

## Installation

### Prerequisites

- Visual Studio Code 1.80.0 or later
- Node.js 18+ (for local LLM support via Ollama, optional)
- API keys for your preferred LLM provider

### Install Roo-Cline

#### Option 1: From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`)
3. Search for "Roo-Cline" or "Cline"
4. Click **Install**

#### Option 2: From GitHub (Latest/Dev Version)

1. Clone the repository:
   ```bash
   git clone https://github.com/marco-altran/Roo-Cline.git
   cd Roo-Cline
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Open in VS Code:
   ```bash
   code .
   ```

5. Press `F5` to launch extension development host

---

## Configuration

### 1. Set Up API Keys

#### Via VS Code Settings

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Search: "Preferences: Open Settings (UI)"
3. Search: "Roo-Cline" or "Cline"
4. Enter your API keys for preferred providers:
   - **OpenAI** — `openai.apiKey`
   - **Anthropic Claude** — `anthropic.apiKey`
   - **Google Gemini** — `google.apiKey`
   - **OpenRouter** — `openrouter.apiKey` (recommended for multi-model)

#### Via Environment Variables

```bash
# Add to ~/.bashrc or ~/.zshrc
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
export GOOGLE_API_KEY="..."
export OPENROUTER_API_KEY="sk-or-..."
```

#### Via Doppler (Recommended for MIDNGHTSAPPHIRE repos)

```bash
# Fetch keys from Doppler vault
doppler run -- code

# Or set specific variables
export OPENROUTER_API_KEY=$(doppler secrets get OPENROUTER_API_KEY --plain)
```

### 2. Configure Default Model

**Settings JSON** (`settings.json`):
```json
{
  "roo-cline.defaultModel": "anthropic/claude-sonnet-4",
  "roo-cline.provider": "openrouter",
  "roo-cline.autoApprove": false,
  "roo-cline.contextWindow": 200000
}
```

**Recommended Models:**
- **Claude Sonnet 4** — Best for complex reasoning
- **GPT-4 Turbo** — Fast and capable
- **Gemini 2.0 Pro** — Excellent for research
- **Local (Ollama)** — Privacy-focused, no API costs

---

## Usage

### Basic Workflow

1. **Open Roo-Cline panel**
   - Click Roo-Cline icon in sidebar
   - Or: `Ctrl+Shift+P` → "Roo-Cline: Open"

2. **Select mode**
   - **Code** — Write or modify code
   - **Architect** — Plan system design
   - **Ask** — Ask questions about code
   - **Debug** — Find and fix bugs

3. **Describe your task**
   ```text
   Refactor the authentication module to use JWT tokens instead of sessions.
   Requirements:
   - Use jsonwebtoken library
   - Store tokens in HTTP-only cookies
   - Add token refresh logic
   - Update all API endpoints
   ```

4. **Review proposed actions**
   - Roo-Cline shows files it will modify
   - Shows commands it will run
   - Explains reasoning

5. **Approve or reject**
   - Click ✅ to approve
   - Click ❌ to reject
   - Click 🔄 to request changes

6. **Verify results**
   - Review changes in Git diff
   - Run tests: `npm test`
   - Commit if satisfied

### Advanced Usage

#### Multi-Step Tasks

```text
Phase 1: Database Schema
- Create migration for users table
- Add JWT columns (refresh_token, token_expiry)

Phase 2: Backend Implementation
- Install jsonwebtoken package
- Create auth middleware
- Update login/logout endpoints

Phase 3: Testing
- Write unit tests for auth logic
- Add integration tests for protected routes
```

#### Working with @roo Tags in Code

When you see `TODO @roo` in code:

```typescript
// TODO @roo: Extract this repeated logic into a utility function
function processUserData(user) {
  // ... repeated code ...
}

// TODO @roo: Add TypeScript types to this module
```

**Invoke Roo-Cline:**
1. Highlight the TODO comment
2. Open Roo-Cline panel
3. It automatically detects the task
4. Click "Execute TODO"

#### Context Management

Roo-Cline can access:
- ✅ All files in workspace
- ✅ Git history and diffs
- ✅ Terminal output
- ✅ Browser search results
- ⚠️ Only files you explicitly grant access to

**Tip:** Start with specific file scope:
```text
Update src/auth/*.ts files to use new token system.
Do not modify other files.
```

---

## Integration with Revvel Standards

### Following Revvel Conventions

When using Roo-Cline in Revvel repos, remind it to:

```text
Follow Revvel Standards:
- Use TypeScript strict mode (no `any` types)
- Add error reporting (Sentry + Resend + GitHub Issue)
- Include tests (Vitest for unit, Playwright for E2E)
- Use structured logging (pino, not console.log)
- Follow Prime Directive: ship working, tested code

Reference: docs/AGENTS.md in this repo
```

### Skills Integration

Roo-Cline can use skills from the repository's [`skills/`](../skills/) directory:

```text
Before implementing a feature:
1. Check if a relevant skill exists in skills/
2. Read the skill's SKILL.md
3. Follow skill guidelines and patterns
4. Example: See skills/testing/SKILL.md for test coverage requirements
```

### Handoff to CI/CD Agents

After Roo-Cline completes work:

1. **Create HANDOFF.md:**
   ```markdown
   # Handoff: JWT Authentication Implementation
   
   ## Status
   ✅ Local development complete
   ⚠️ Needs CI/CD deployment
   
   ## Next Agent
   @agent (GitHub Actions for deployment)
   
   ## What's Done
   - JWT auth implemented and tested locally
   - All tests passing (27/27)
   
   ## What's Needed
   - [ ] Deploy to staging
   - [ ] Run E2E tests in CI
   - [ ] Deploy to production
   ```

2. **Commit and push:**
   ```bash
   git add .
   git commit -m "feat: Implement JWT authentication"
   git push
   ```

3. **Open PR** — CI/CD agents take over

---

## Modes Explained

### Code Mode

**Purpose:** Write or modify code

**When to use:**
- Implementing features
- Refactoring code
- Adding functionality

**Example:**
```text
Code Mode: Add pagination to the users API endpoint.
- Support page and limit query params
- Return total count in response
- Add tests
```

### Architect Mode

**Purpose:** Design system architecture

**When to use:**
- Planning new features
- Designing data models
- System integration

**Example:**
```text
Architect Mode: Design a caching strategy for our API.
- Evaluate Redis vs in-memory
- Define cache invalidation logic
- Document in ADR format
```

### Ask Mode

**Purpose:** Answer questions about code

**When to use:**
- Understanding unfamiliar code
- Reviewing architecture
- Learning patterns

**Example:**
```text
Ask Mode: Explain how the authentication flow works in this app.
Include:
- Entry points
- Middleware chain
- Token validation
```

### Debug Mode

**Purpose:** Find and fix bugs

**When to use:**
- Tracking down errors
- Performance issues
- Test failures

**Example:**
```text
Debug Mode: Users report login fails intermittently.
Context:
- Happens ~10% of the time
- No error in logs
- Started after yesterday's deploy

Find root cause and fix.
```

---

## Best Practices

### 1. Start Small

❌ Bad:
```text
Refactor the entire codebase to use modern patterns.
```

✅ Good:
```text
Refactor src/utils/date.ts to use date-fns instead of Moment.js.
Keep existing function signatures.
Update tests.
```

### 2. Be Specific

❌ Bad:
```text
Make the app faster.
```

✅ Good:
```text
Optimize the database query in src/api/users.ts:45.
Current: 2.5s for 10k records.
Target: <100ms.
Use indexing or query optimization.
```

### 3. Include Context

❌ Bad:
```text
Fix the bug.
```

✅ Good:
```text
Fix: Users can't log in after password reset.

Context:
- Error in console: "Invalid token"
- Happens in reset-password.ts:78
- Token validation logic in auth.ts:120

Root cause likely: token expiry not handled correctly.
```

### 4. Review Changes

Always review Roo-Cline's changes before committing:

```bash
# Check what changed
git diff

# Run tests
npm test

# Lint
npm run lint

# Build
npm run build
```

### 5. Incremental Commits

Don't let Roo-Cline make massive changes without checkpoints:

```text
Step 1: Add JWT library and types
[Review + commit]

Step 2: Implement token generation
[Review + commit]

Step 3: Update login endpoint
[Review + commit]
```

---

## Troubleshooting

### Roo-Cline Not Responding

**Symptoms:**
- Panel shows "Thinking..." forever
- No proposed actions appear

**Solutions:**
1. Check API key is valid:
   ```bash
   echo $OPENROUTER_API_KEY
   ```
2. Check rate limits on LLM provider
3. Restart VS Code
4. Try different model (e.g., switch to GPT-4)

### Wrong Files Modified

**Symptoms:**
- Roo-Cline edits files you didn't mention

**Solutions:**
1. Be explicit about scope:
   ```text
   ONLY modify src/auth/*.ts files.
   Do NOT touch any other files.
   ```
2. Use `.rooignore` file (create in repo root):
   ```text
   node_modules/
   dist/
   .git/
   *.min.js
   ```

### Poor Code Quality

**Symptoms:**
- Generated code doesn't follow standards
- Missing error handling
- No tests

**Solutions:**
1. Include standards in prompt:
   ```text
   Follow TypeScript best practices:
   - No `any` types
   - Explicit return types
   - Comprehensive error handling
   ```
2. Reference style guide:
   ```text
   Follow the patterns in existing code.
   Match the style of src/api/products.ts.
   ```

### Excessive API Costs

**Symptoms:**
- Large API bills from LLM provider

**Solutions:**
1. Use local model via Ollama (free)
2. Set context window limit:
   ```json
   {
     "roo-cline.contextWindow": 50000
   }
   ```
3. Use cheaper models for simple tasks:
   - Claude Haiku (fast, cheap)
   - GPT-3.5 Turbo (fast, cheap)

---

## Comparison with Other Agents

| Feature | Roo-Cline | GitHub Copilot | Bito AI | GOAP |
|---------|-----------|----------------|---------|------|
| **Local Development** | ✅ Yes | ⚠️ Partial | ❌ No | ❌ No |
| **Multi-File Changes** | ✅ Yes | ❌ No | ❌ No | ⚠️ Partial |
| **Autonomous Execution** | ✅ Yes | ❌ No | ⚠️ Partial | ✅ Yes |
| **Terminal Commands** | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| **CI/CD Native** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes |
| **Revenue Focus** | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Code Quality** | ⚠️ Partial | ⚠️ Partial | ✅ Yes | ❌ No |

**Use Roo-Cline when:**
- Working locally on complex features
- Need to modify multiple files
- Want to execute terminal commands
- Require human oversight

**Use other agents when:**
- Running in CI/CD (GitHub Copilot, OpenRouter)
- Code review focus (Bito AI)
- Revenue/business tasks (GOAP)

---

## Resources

### Official Links

- [Roo-Cline GitHub](https://github.com/marco-altran/Roo-Cline)
- [Roo Code (Parent Project)](https://github.com/RooCodeInc/Roo-Code)
- [Cline Guide](https://www.onegen.ai/project/cline-guide-the-open-source-autonomous-coding-agent-for-vs-code/)
- [Best Open Source AI Coding Agents 2026](https://cssauthor.com/best-open-source-ai-coding-agents/)

### Related Documentation

- [AGENT_PROMPT_CONVENTION.md](AGENT_PROMPT_CONVENTION.md) — How to tag prompts for Roo-Cline
- [AGENT_PROMPT_EXECUTION_EVALUATION.md](AGENT_PROMPT_EXECUTION_EVALUATION.md) — When to use which agent
- [AGENTS.md](AGENTS.md) — Universal agent instructions
- [skills/REGISTRY.md](../skills/REGISTRY.md) — Skills Roo-Cline can use

### Community

- [Roo-Cline Discussions](https://github.com/marco-altran/Roo-Cline/discussions)
- [Cline Community](https://github.com/cline/cline/discussions)

---

## Version History

- **1.0.0** (2026-05-03) — Initial setup guide

---

## Contributing

Found an issue or have a tip to add?

1. Open issue: [revvel-standards/issues](https://github.com/midnghtsapphire/revvel-standards/issues)
2. Label: `documentation`
3. Reference: `docs/ROO_CLINE_SETUP.md`

---

**Author:** GitHub Copilot Coding Agent  
**Maintained by:** MIDNGHTSAPPHIRE agent swarm
