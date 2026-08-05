# Manual Repository Creation Handoff

## Issue Context

- **Issue**: [WR] Create this in a repository for me call it devina-imposter
- **Reference**: <https://github.com/e2b-dev/awesome-devins>
- **Agent Instructions**: "should have been picked up by auto process please do that and this wr"

## Why Manual Creation Required

GitHub Copilot Coding Agent and OpenRouter workflows cannot create new GitHub repositories. Repository creation requires:
- GitHub API with `repo` scope (requires PAT with elevated permissions)
- Organization owner permissions
- Or manual creation via GitHub web UI

## What Was Completed

✅ **Completed by Copilot**:
1. Repository specification document (`SPEC.md`)
2. Initial README with structure and purpose
3. Documentation of evaluation framework
4. Integration patterns documentation
5. Project tracking in revvel-standards

## What Needs Manual Action

### Option 1: GitHub Web UI (Recommended)

1. **Create Repository**
   - Go to <https://github.com/new>
   - Repository name: `devina-imposter`
   - Description: "Honest evaluation framework and comparison list for AI coding agents"
   - Visibility: Public
   - License: MIT
   - Do NOT initialize with README (we'll push our own)

2. **Clone and Initialize**
   ```bash
   mkdir ~/devina-imposter
   cd ~/devina-imposter
   git init
   git remote add origin git@github.com:midnghtsapphire/devina-imposter.git
   ```

3. **Copy Base Files**
   ```bash
   # Copy revvel-standards base structure
   cp -r ~/revvel-standards/.github .
   cp ~/revvel-standards/AGENTS.md .
   cp ~/revvel-standards/LICENSE .
   cp ~/revvel-standards/.gitignore .
   
   # Create symlinks
   ln -sf AGENTS.md .cursorrules
   ln -sf AGENTS.md .windsurfrules
   mkdir -p .github && ln -sf ../AGENTS.md .github/copilot-instructions.md
   ```

4. **Copy Project Files**
   ```bash
   cp ~/revvel-standards/projects/devina-imposter/README.md .
   mkdir -p agents benchmarks patterns reviews scripts
   ```

5. **Initial Commit**
   ```bash
   git add .
   git commit -m "feat: initial devina-imposter structure

   - Repository specification
   - Evaluation framework
   - Benchmark structure
   - Integration patterns directory
   - Community review process
   
   Based on awesome-devins but focused on honest evaluation
   vs. catalog. Spec created in midnghtsapphire/revvel-standards"
   
   git branch -M main
   git push -u origin main
   ```

6. **Configure Repository**
   - Settings → Branches → Add rule for `main`:
     - ☑ Require pull request reviews before merging (1 approval)
     - ☑ Require status checks to pass before merging
     - ☑ Require branches to be up to date before merging
   
   - Settings → Secrets and variables → Actions:
     - Add `OPENROUTER_API_KEY` (copy from revvel-standards)
   
   - Settings → General:
     - Add topics: `ai-agents`, `devin`, `evaluation`, `benchmarks`, `coding-agents`
     - Disable Wikis (using repo docs)
     - Enable Discussions (for community)

### Option 2: GitHub CLI (Alternative)

```bash
cd ~/devina-imposter
gh repo create midnghtsapphire/devina-imposter \
  --public \
  --description "Honest evaluation framework and comparison list for AI coding agents" \
  --license MIT \
  --clone
  
# Then follow steps 3-6 from Option 1
```

### Option 3: Delegate to OpenRouter Agent

1. Create new issue in revvel-standards:
   ```text
   Title: [wr:code] Initialize devina-imposter repository
   
   Body:
   Create the initial file structure for devina-imposter repository:
   
   - Copy files from projects/devina-imposter/
   - Set up directory structure (agents/, benchmarks/, patterns/, reviews/, scripts/)
   - Create agent evaluation template
   - Create benchmark task template
   - Create integration pattern template
   - Copy .github workflows from revvel-standards
   - Add initial .gitignore
   - Create CHANGELOG.md
   - Create CONTRIBUTING.md
   
   Use projects/devina-imposter/SPEC.md as reference.
   ```

2. Add label `wr:code` to trigger OpenRouter workflow
3. OpenRouter creates PR with initial structure
4. After PR merged, manually create GitHub repository and push

## Post-Creation Checklist

After repository exists:

- [ ] Repository created on GitHub
- [ ] Initial files pushed to main
- [ ] Branch protection enabled
- [ ] Secrets configured (OPENROUTER_API_KEY)
- [ ] Topics added
- [ ] Discussions enabled
- [ ] Create first 3 agent evaluation files
- [ ] Create first benchmark task
- [ ] Add to `inventory/github-orgs.md` in revvel-standards
- [ ] Link from revvel-standards README
- [ ] Announce on X/Twitter
- [ ] Submit PR to awesome-devins as related project
- [ ] Post to Reddit r/LocalLLaMA
- [ ] Share on Hacker News

## Update revvel-standards

Once repository is live, update:

```bash
cd ~/revvel-standards

# Add to inventory
echo "| devina-imposter | Active | Evaluation framework for AI agents | 2026-04 | https://github.com/midnghtsapphire/devina-imposter |" >> inventory/github-orgs.md

# Link from README
# Add under "Related Projects" section

git add inventory/github-orgs.md README.md
git commit -m "docs: add devina-imposter to inventory"
git push
```

## Timeline Estimate

- Manual creation: 15 minutes
- Initial file population: 30 minutes
- Configuration: 10 minutes
- First agent evaluations: 2-4 hours
- Public announcement: 30 minutes

**Total**: Half day for full setup and initial content

## Who Should Do This

**Option A**: Audrey manually (recommended for first-time setup)
- Full control over configuration
- Understand structure firsthand
- Can customize as needed

**Option B**: OpenRouter agent for content, Audrey for repo creation
- Audrey creates empty repo
- OpenRouter populates initial content
- Audrey reviews and publishes

**Option C**: Fully manual
- Good for learning the structure
- More time-consuming

## Follow-up Actions

After repository is live:

1. **Create first evaluations** — Start with 3-5 agents from awesome-devins
2. **Set up automation** — GitHub Actions for benchmark runs
3. **Community outreach** — Announce and invite contributions
4. **Revenue planning** — Set up consulting intake form
5. **Integration with revvel-standards** — Cross-link documentation

## Questions

Ask in midnghtsapphire/revvel-standards issue or ping @midnghtsapphire directly.

## Automation Note

The OpenRouter workflow (`openrouter-coder.yml`) in revvel-standards could theoretically be extended to support repository creation by:

1. Adding repository creation API calls to `.github/scripts/openrouter_coder.py`
2. Requiring elevated permissions (PAT with `repo` scope)
3. Security review (creating repos has blast radius)

This is intentionally NOT automated currently due to security considerations.

If frequent repository creation is needed, consider:
- Repository template approach (GitHub template repositories)
- Terraform/IaC for GitHub org management
- Dedicated repository factory workflow (with manual approval gate)

For now, manual creation is the safest path.
