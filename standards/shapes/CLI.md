# CLI Product Shape Standard

**Parent pipeline:** [`AUTOMATED_PRODUCT_PIPELINE.md`](../AUTOMATED_PRODUCT_PIPELINE.md) → Step 5 shape = `cli`
**Template:** `templates/agent-generated-product/build/cli/`

---

## When to Use This Shape

- Target audience is developers or technical users
- Problem is solved by a single command or short workflow
- Distribution via npm, Homebrew, Scoop, or direct binary download
- No persistent UI needed — terminal is the interface
- Recurring revenue possible via `--pro` flag or API-key-gated features

---

## 1. Research Phase

| Task | Tool | Output |
|------|------|--------|
| Validate developer demand | GitHub trending, HN, Reddit r/commandline, r/devops | Confirmed mentions ≥ 30 / 30 days |
| Audit existing CLIs | npm search, brew search, GitHub search | `research/competitors.md` — features, stars, last update, gaps |
| Identify distribution channels | npm weekly downloads, Homebrew installs | `research/distribution.md` — best channels for this audience |
| Define command interface | User complaints + competitor gaps | `research/ux.md` — proposed commands, flags, output format |
| Determine pricing model | Free/freemium/paid analysis | `decision/pricing.json` |

**Gate:** `research/brief.md` must exist before proceeding.

---

## 2. Create Phase

### Project Structure

```text
build/cli/
  src/
    index.ts            # Entry point (or main.go / main.rs)
    commands/            # One file per subcommand
    lib/                 # Shared utilities
    config.ts            # Config loading (env, dotfile, flags)
  tests/
    commands/            # Test per command
    integration/         # End-to-end CLI tests
  bin/
    <tool-name>          # Compiled binary (if Go/Rust)
  package.json           # Or go.mod / Cargo.toml
  README.md              # Usage docs (auto-generated from --help)
  LICENSE                # MIT unless specified otherwise
```

### Tooling by Language

| Language | When to use | Package manager | Build |
|----------|-------------|-----------------|-------|
| **TypeScript (Bun/Node)** | npm distribution, fast to build | npm / pnpm | `bun build` or `esbuild` |
| **Go** | Single binary, cross-platform | Homebrew + Scoop + direct | `go build` |
| **Rust** | Performance-critical, crates.io | cargo + Homebrew | `cargo build --release` |
| **Python** | Quick prototype, pip install | PyPI | `pip install` |

**Default: TypeScript with Bun** unless the problem requires Go/Rust performance.

### CLI Framework

| Framework | Language | Why |
|-----------|----------|-----|
| **Commander.js** | TypeScript | Most popular, simple, well-documented |
| **oclif** | TypeScript | Plugin system, auto-docs, Salesforce-backed |
| **Cobra** | Go | Standard for Go CLIs (kubectl, Hugo, etc.) |
| **clap** | Rust | Derive macros, excellent help output |
| **Click/Typer** | Python | Type-hinted, auto-help |

### Quality Gates

- [ ] `<tool-name> --help` produces clear usage docs
- [ ] `<tool-name> --version` outputs semver version
- [ ] All commands have unit tests (≥ 60% coverage)
- [ ] Integration test: run the CLI end-to-end with sample input
- [ ] No secrets in source (gitleaks clean)
- [ ] TypeScript: `strict: true`, no `any`
- [ ] Cross-platform: works on macOS, Linux, Windows (or documents exclusions)
- [ ] Exit codes: 0 = success, 1 = user error, 2 = system error

---

## 3. Design Phase

CLIs need minimal design, but still require:

| Asset | Purpose | Tool |
|-------|---------|------|
| Logo / icon | npm page, GitHub repo, Homebrew cask | Figma (simple mark) |
| Terminal screenshot | README hero image, landing page | `terminalizer` or `vhs` |
| Landing page | SEO + download links | Figma → HTML |
| OG image | Social sharing (1200×630) | Figma |

**Terminal recording:** Use [`vhs`](https://github.com/charmbracelet/vhs) to create GIF demos:

```bash
# tape.vhs
Output demo.gif
Type "my-tool analyze --input data.csv"
Enter
Sleep 2s
```

---

## 4. Publish Phase

### Primary Distribution

| Channel | How | Automation |
|---------|-----|------------|
| **npm** | `npm publish` | GitHub Actions on tag push |
| **Homebrew** | Create a tap repo (`homebrew-<org>`) | `goreleaser` or manual formula |
| **Scoop** | Submit to Scoop bucket (Windows) | Scoop bucket PR |
| **GitHub Releases** | Binary upload on tag | `goreleaser` or `gh release create` |

### Secondary Distribution

| Channel | When |
|---------|------|
| **PyPI** | Python CLIs (`twine upload`) |
| **crates.io** | Rust CLIs (`cargo publish`) |
| **Snapcraft** | Linux desktop-oriented CLIs |
| **Docker Hub** | If the tool benefits from containerization |

### npm Publish Automation

```yaml
# .github/workflows/publish.yml
name: Publish to npm
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, registry-url: 'https://registry.npmjs.org' }
      - run: npm ci && npm test && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Landing Page

```text
<tool-name>.revvel.io   OR   revvel.io/tools/<tool-name>
```

Must include:
- Terminal demo GIF/video
- Install commands (one-liner for each platform)
- Feature comparison table (vs. competitors)
- Pricing (if freemium/paid)
- GitHub stars badge + npm downloads badge
- CTA: `npm install -g <tool-name>` or download binary

---

## 5. Connections Required

| Connection | Purpose | Where stored |
|------------|---------|--------------|
| **npm token** | Publish to npm registry | Doppler `revvel-standards/prd/NPM_TOKEN` |
| **GitHub token** | Create releases, push to tap | Already available via Git auth |
| **Stripe API key** | Pro/paid tier licensing | Doppler `revvel-standards/prd/STRIPE_SECRET_KEY` |
| **Homebrew tap repo** | Homebrew distribution | `midnghtsapphire/homebrew-tools` repo |

---

## Monetization Models

| Model | How | Example |
|-------|-----|---------|
| **Open core** | Free CLI + paid features behind `--pro` flag | `tool analyze` free, `tool analyze --deep` requires key |
| **Usage-based** | Free up to N uses/day, then requires API key | API key validates against Stripe metered billing |
| **Sponsorware** | Open-source after N sponsors | GitHub Sponsors threshold |
| **One-time license** | License key unlocks full version | Stripe Payment Link → key generation |

---

## Acceptance Criteria

- [ ] CLI installs and runs on at least 2 platforms (macOS + Linux minimum)
- [ ] Published to npm or GitHub Releases
- [ ] `--help` and `--version` work correctly
- [ ] Tests pass with ≥ 60% coverage
- [ ] Landing page deployed with install instructions
- [ ] Stripe Product created (even if free tier)
- [ ] README has demo GIF and usage examples
- [ ] `state.json` step = `deployed`, `certified = true`
