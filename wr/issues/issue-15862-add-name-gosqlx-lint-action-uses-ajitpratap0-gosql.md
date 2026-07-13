# WR: [WR] add - name: GoSQLX Lint Action   uses: ajitpratap0/GoSQLX@v1.14.0

**Issue:** #15862  
**Repository:** [midnghtsapphire/revvel-standards](https://github.com/midnghtsapphire/revvel-standards)  
**Created:** 2026-07-13  
**Research Date:** 2026-07-13  
**Researcher:** Jules (Google) + OpenRouter  
**WR Status:** 🟡 In Progress

---

## Issue Context

### Output Type (required)

production-app

### PDF pipeline batch

Not applicable

### Research Mode

deepresearch

### Delivery Mode

build-direct

### Lifecycle Mode

new-build

### Commercial Mode

saas-app

### Assign To / Decision Team

orchestrator

### Summary

add - name: GoSQLX Lint Action   uses: ajitpratap0/GoSQLX@v1.14.0

### Objective

Not an ORM - a parser. You get the AST, you decide what to do with it.
Not slow - zero-copy tokenization, sync.Pool recycling, no allocations on hot paths.
Not limited - PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite, Snowflake, ClickHouse. CTEs, window functions, MERGE, set operations.
Not just a library - CLI, VS Code extension, GitHub Action, MCP server, WASM playground, Python bindings.

### Required Bundle

// v1.15+ recommended entry point: ParseTree returns an opaque Tree,
// so you don't need to import pkg/sql/ast just to get started.
tree, _:= gosqlx.ParseTree(ctx, "SELECT u.name, COUNT(*) FROM users u JOIN orders o ON u.id = o.user_id GROUP BY u.name",
    gosqlx.WithDialect("postgresql"))
fmt.Println("Tables:", tree.Tables())
fmt.Println(tree.Format(gosqlx.WithIndent(2), gosqlx.WithUppercaseKeywords(true)))

go get github.com/ajitpratap0/GoSQLX

package main

import (
    "fmt"
    "github.com/ajitpratap0/GoSQLX/pkg/gosqlx"
)

func main() {
    ctx := context.Background()

    // ParseTree (v1.15+) is the recommended entry point. It returns an
    // opaque handle with built-in helpers — no need to import pkg/sql/ast.
    tree, err := gosqlx.ParseTree(ctx, "SELECT id, name FROM users WHERE active = true",
        gosqlx.WithDialect("postgresql"))
    if err != nil {
        // Sentinel errors work with errors.Is
        if errors.Is(err, gosqlx.ErrSyntax) {
            log.Fatalf("syntax error: %v", err)
        }
        log.Fatal(err)
    }
    fmt.Println("Tables:", tree.Tables())
    fmt.Println(tree.Format(gosqlx.WithIndent(2), gosqlx.WithUppercaseKeywords(true)))

    // Walk the AST — typed walkers avoid the type-assertion dance:
    tree.WalkSelects(func(s *ast.SelectStatement) bool {
        fmt.Printf("  SELECT with %d columns\n", len(s.Columns))
        return true
    })

    // The legacy Parse/Format/Validate API still works for v1.x code.
    // See docs/MIGRATION.md for the Tree migration guide.

Install Everywhere
📦 Go Library
go get github.com/ajitpratap0/GoSQLX
🖥️ CLI Tool
go install github.com/ajitpratap0/GoSQLX/cmd/gosqlx@latest
gosqlx validate "SELECT * FROM users"
gosqlx format query.sql
gosqlx lint query.sql
💻 VS Code Extension
code --install-extension ajitpratap0.gosqlx
Bundles the binary - zero setup. Learn more →

🤖 MCP Server (AI Integration)
claude mcp add --transport http gosqlx \
  <https://mcp.gosqlx.dev/mcp>
7 SQL tools in Claude, Cursor, or any MCP client. Guide →

Features at a Glance
⚡ Parser
Zero-copy tokenizer
Recursive descent parser
Full AST generation
Multi-dialect engine 
🛡️ Analysis
SQL injection scanner
30 lint rules (L001–L030)
20 optimizer rules
Metadata extraction 
🔧 Tooling
AST-based formatter
Query transforms API
VS Code extension
GitHub Action
🌐 Multi-Dialect
PostgreSQL · MySQL · MariaDB
SQL Server · Oracle
SQLite · Snowflake · ClickHouse 
🤖 AI-Ready
MCP server (7 tools)
Public remote endpoint
Streamable HTTP 
🧪 Battle-Tested
20K+ concurrent ops
Zero race conditions
~85% SQL-99 compliance

Documentation
Resource Description
🌐 gosqlx.dev Website with interactive playground
🚀 Getting Started Parse your first SQL in 5 minutes
📖 Usage Guide Comprehensive patterns and examples
📄 API Reference Complete API documentation
🖥️ CLI Guide Command-line tool reference
🌍 SQL Compatibility Dialect support matrix
🤖 MCP Guide AI assistant integration
🏗️ Architecture System design deep-dive
📊 Benchmarks Performance data and methodology
📝 Release Notes What's new in each version

Contributing
GoSQLX is built by contributors like you. Whether it's a bug fix, new feature, documentation improvement, or just a typo - every contribution matters.

git clone <https://github.com/ajitpratap0/GoSQLX.git> && cd GoSQLX
task check    # fmt → vet → lint → test (with race detection)
Fork & branch from main
Write tests - we use TDD and require race-free code
Run task check - must pass before PR
Open a PR - we review within 24 hours
📋 Contributing Guide · 📜 Code of Conduct · 🏛️ Governance

Who's Using GoSQLX?
GoSQLX is downloaded and cloned by developers worldwide -- 595 unique cloners in just 14 days. If you're using GoSQLX in your project or organization, we'd love to hear about it!

Project / Company Use Case
Your project here Add yourself via PR or tell us in Discussions
Using GoSQLX at work? Building something cool with it? Share your story in GitHub Discussions -- it helps the community grow and motivates continued development.

Community
}

### Definition of Done

The GoSQLX Lint Action is successfully integrated into the CI/CD pipeline and validates SQL syntax across all supported databases (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite, Snowflake, ClickHouse). The action runs without errors on all pull requests and pushes to main branch, providing fast zero-copy parsing feedback. All existing SQL queries in the codebase pass the linting checks with no false positives. Documentation is updated to include the new linting step and developer guidelines for SQL code standards.

### Do Not Under-Scope

This WR involves integrating a comprehensive SQL parsing and linting system that supports multiple database engines (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite, Snowflake, ClickHouse) and advanced SQL features like CTEs, window functions, and MERGE operations. The scope must include thorough testing across all supported database syntaxes and SQL constructs to ensure the parser correctly handles edge cases and complex queries. Integration testing should verify compatibility with existing CI/CD workflows and validate that the zero-copy tokenization and memory pooling optimizations don't introduce performance regressions. The implementation should also account for proper error handling and reporting mechanisms that provide actionable feedback for SQL quality issues.

### Explicit Exclusions

This work request excludes any modifications to existing database schemas, ORM configurations, or data migration scripts. The implementation will not include changes to application business logic or existing SQL query structures. No modifications to CI/CD pipeline configurations beyond adding the specified GitHub Action are included.

### Delivery Shape

One PR preferred, split only if blocked

### Sellable Artifact Bundle

N/A — not a sellable artifact for this Output Type.

### Purchase Validation (functions-as-purchased)

N/A — not a purchased artifact for this Output Type.

### Expected Scope

1 shippable app with docs + tests + deploy path

### Validation Expectations

The GoSQLX Lint Action should successfully integrate into the CI/CD pipeline and execute SQL linting across supported databases (PostgreSQL, MySQL, MariaDB, SQL Server, Oracle, SQLite, Snowflake, ClickHouse). The action must parse SQL files without performance degradation, utilizing zero-copy tokenization and efficient memory management. Validation should confirm the action handles complex SQL constructs including CTEs, window functions, MERGE statements, and set operations. The linting process should complete without allocations on hot paths and provide actionable feedback on SQL code quality.

### Blocker Rule

If any part of the Required Bundle cannot be completed in one iteration, open a WR-BLOCKER issue (label: `wr-blocker`) that names the missing capability, credential, or human action, and reference it from the PR body. Do NOT silently drop scope.

### Acknowledgements

- [x] This WR defines a bundled outcome, not just a minimum acceptable patch.
- [x] Explicitly requested secondary items should not be silently deferred.
- [x] If the PR is partial, the blocker must be documented.
- [x] The PR should reflect the WR's required bundle and definition of done.
- [x] After implementation, open a PR and continue the loop (reset routing labels / trigger downstream workflows) instead of stopping at the issue.

## Summary

N/A — pending Jules refinement

## Objective

N/A — pending Jules refinement

## Required Bundle

N/A — pending Jules refinement

## Definition of Done

N/A — pending Jules refinement

## Validation

N/A — pending Jules refinement

## Blockers

N/A — pending Jules refinement

## Learnings — What & Why

_Why this WR exists, and what the assigned agent should know before starting. Populated automatically for follow-up-generated WRs; agents completing other WR types should fill this in themselves once done, summarizing what they did and why, for future audits._

<!-- Market research, BOM, SEO, monetization sections are intentionally absent: BASIC template is for bug/chore/docs/refactor WRs with no product/market surface. Use WR_TEMPLATE_FULL.md only for new products or sellable assets. -->
