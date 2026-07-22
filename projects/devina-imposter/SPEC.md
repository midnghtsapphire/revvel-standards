# devina-imposter Repository Specification

## Repository Details

- **Name**: `devina-imposter`
- **Owner**: `midnghtsapphire` (primary) or `Freedom-Angel-Corp` (if enterprise features needed)
- **Visibility**: Public
- **License**: MIT
- **Description**: Honest evaluation framework and comparison list for AI coding agents
- **Topics**: `ai-agents`, `devin`, `evaluation`, `benchmarks`, `coding-agents`, `swe-bench`, `autonomous-agents`

## Repository Configuration

### Branch Protection

Main branch protection rules:
- Require pull request reviews (1 approval minimum)
- Require status checks to pass
- Require branches to be up to date
- Include administrators: No (allow Audrey to force push if needed)

### GitHub Actions

Enable:
- Automated testing for benchmark scripts
- Link checking (keep awesome list links valid)
- Auto-labeling for community submissions
- OpenRouter integration for automated reviews

### Labels

Standard labels from revvel-standards:
- `agent:anterion`, `agent:devika`, etc. — Per-agent issues
- `benchmark` — Benchmark tasks and improvements
- `community-review` — Community-submitted reviews
- `needs-verification` — Claims requiring verification
- `pattern` — Integration patterns
- `wr:code` — Trigger OpenRouter automation

### Issue Templates

1. **Agent Evaluation** — Submit evaluation for an AI agent
2. **Benchmark Task** — Propose new benchmark task
3. **Integration Pattern** — Share proven integration pattern
4. **Bug Report** — Report issues with benchmarks or scripts

### Repository Secrets

Required secrets:
- `OPENROUTER_API_KEY` — For automated agent testing
- `DISPATCH_TOKEN` — For workflow triggers (if needed)

Optional:
- API keys for commercial agents (Cursor, Devin) if testing their APIs

## Initial File Structure

```text
devina-imposter/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── agent-evaluation.yml
│   │   ├── benchmark-task.yml
│   │   └── integration-pattern.yml
│   ├── workflows/
│   │   ├── benchmark-runner.yml
│   │   ├── link-checker.yml
│   │   └── openrouter-review.yml
│   └── copilot-instructions.md -> ../AGENTS.md
├── agents/
│   ├── README.md
│   ├── template.md
│   └── (individual agent files)
├── benchmarks/
│   ├── README.md
│   ├── swe-bench-lite.md
│   └── real-world-tasks.md
├── patterns/
│   ├── README.md
│   ├── github-actions.md
│   └── openrouter.md
├── reviews/
│   ├── README.md
│   ├── template.md
│   └── community/
├── scripts/
│   ├── run-benchmark.sh
│   └── validate-links.sh
├── .gitignore
├── .cursorrules -> AGENTS.md
├── AGENTS.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Content Guidelines

### Agent Evaluations

Each agent gets:
- Detailed capability matrix
- Setup instructions
- Real-world test results
- Pros/cons list
- Community feedback section
- Links to official docs and GitHub

### Benchmarks

Benchmarks must be:
- Reproducible
- Measurable
- Representative of real-world tasks
- Version-controlled (track results over time)

### Integration Patterns

Patterns must include:
- Problem statement
- Solution code
- Configuration examples
- Known limitations
- Success stories

## Differentiation from awesome-devins

| Aspect | awesome-devins | devina-imposter |
|--------|---------------|-----------------|
| **Focus** | Catalog (what exists) | Evaluation (what works) |
| **Content** | Links and descriptions | Test results and reviews |
| **Tone** | Neutral/promotional | Critical/honest |
| **Updates** | New agents added | Performance tracked over time |
| **Community** | Submissions via form | Detailed reviews and benchmarks |

## Success Metrics

Track:
- Number of agents evaluated
- Community contributions (reviews, benchmarks)
- Benchmark runs executed
- Integration patterns documented
- Referrals from awesome-devins and SWE-bench

## Maintenance Plan

### Weekly
- Update agent evaluations with new releases
- Review community submissions
- Run benchmark suite

### Monthly
- Analyze trends (which agents improving/declining)
- Update integration patterns
- Publish changelog

### Quarterly
- Major benchmark suite update
- Comprehensive agent landscape analysis
- Community survey

## Revenue Potential

Aligns with WR North Star (Revenue First):

1. **Consulting** — Help companies choose and integrate the right AI agent
2. **Training** — Workshops on effective AI agent usage
3. **Premium Benchmarks** — Detailed evaluations for commercial agents
4. **Integration Services** — Set up and tune agents for specific workflows
5. **Sponsored Evaluations** — Agent vendors pay for detailed, honest reviews

Target: $500-2000/month within 6 months from affiliate partnerships, consulting, and premium content.

## Next Steps

1. Create repository on GitHub
2. Copy revvel-standards base files (AGENTS.md, workflows, etc.)
3. Write initial agent evaluations (3-5 agents)
4. Create benchmark suite (3 initial tasks)
5. Announce on X/Twitter, HN, Reddit r/LocalLLaMA
6. Submit to awesome-devins as related project

## Manual Creation Steps

Since GitHub repository creation cannot be automated via this workflow:

1. Navigate to <https://github.com/new>
2. Set repository name: `devina-imposter`
3. Description: "Honest evaluation framework and comparison list for AI coding agents"
4. Public visibility
5. Initialize with README: No (we'll push initial content)
6. Add .gitignore: None (using custom)
7. License: MIT

Then:
```bash
# On local machine
mkdir devina-imposter
cd devina-imposter
git init
git remote add origin git@github.com:midnghtsapphire/devina-imposter.git

# Copy base files from revvel-standards
cp -r ../revvel-standards/.github .
cp ../revvel-standards/AGENTS.md .
cp ../revvel-standards/LICENSE .
ln -sf AGENTS.md .cursorrules

# Copy project files
cp -r ../revvel-standards/projects/devina-imposter/* .

# Initial commit
git add .
git commit -m "feat: initial repository structure"
git branch -M main
git push -u origin main
```

Configure:
- Settings → Branches → Branch protection for `main`
- Settings → Secrets and variables → Actions → Add `OPENROUTER_API_KEY`
- Settings → Actions → General → Allow all actions

## Alignment with Revvel Standards

This repository follows:
- `wr/NORTH_STAR.md` — Revenue first (consulting potential)
- `docs/AGENTS.md` — Driven autonomy in testing
- `standards/TESTING.md` — Comprehensive test coverage
- `standards/ZERO_HUMAN_FRAMEWORK.md` — Automated benchmarking
- `docs/BRAND_ARCHITECTURE.md` — Clear value proposition

## Timeline

- **Day 1**: Repository creation and structure
- **Week 1**: 5 agent evaluations complete
- **Week 2**: Benchmark suite operational
- **Week 3**: First community contributions
- **Week 4**: Announce publicly, submit to directories
- **Month 2**: Revenue-generating features (consulting, premium content)

## Risk Mitigation

**Risk**: Agent vendors may object to critical reviews
**Mitigation**: Factual, data-driven evaluations; right of reply section

**Risk**: Benchmarks become outdated
**Mitigation**: Automated weekly benchmark runs via GitHub Actions

**Risk**: Low community engagement
**Mitigation**: Seed with quality content; promote in relevant communities

**Risk**: Confusion with awesome-devins
**Mitigation**: Clear differentiation in README; complementary relationship

## Questions for Audrey

1. Should this be under `midnghtsapphire` or `Freedom-Angel-Corp`?
2. Priority level (immediate vs. queued)?
3. Which agents to evaluate first?
4. Revenue model preference (consulting, premium content, both)?
