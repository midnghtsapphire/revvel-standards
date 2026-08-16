code-review-skill/
|
+-- SKILL.md                              # Core skill - loaded on activation (~220 lines)
+-- README.md
+-- LICENSE
+-- CONTRIBUTING.md
|
+-- reference/                            # On-demand language guides
|   +-- react.md                          # React 19 / Next.js / TanStack Query v5
|   +-- vue.md                            # Vue 3.5 Composition API
|   +-- angular.md                        # Angular 17+ / Signals / Zoneless
|   +-- svelte.md                         # Svelte 5 / SvelteKit
|   +-- rust.md                           # Rust ownership, async/await, unsafe
|   +-- typescript.md                     # TypeScript strict mode, generics, ESLint
|   +-- nestjs.md                         # NestJS DI, Guards, Interceptors, DTOs
|   +-- java.md                           # Java 17/21 & Spring Boot 3
|   +-- java8.md                          # Java 8 & Spring Boot 2 (legacy)
|   +-- php.md                            # PHP 8.x types, PDO, security, Composer
|   +-- ruby.md                           # Ruby 3.4+/4.0, Rails 8.x, Active Record/Job
|   +-- python.md                         # Python async, typing, pytest
|   +-- django.md                         # Django / DRF security, serializers, async
|   +-- fastapi.md                        # FastAPI Depends, Pydantic v2, async, test-driven verification
|   +-- go.md                             # Go goroutines, channels, context, interfaces
|   +-- kotlin.md                         # Kotlin / Android coroutines, Compose, Flow
|   +-- swift.md                          # Swift 5.9+/6, SwiftUI, concurrency, optionals
|   +-- csharp.md                         # C# 12 / .NET 8, EF Core, ASP.NET Core
|   +-- c.md                              # C memory safety, UB, error handling
|   +-- cpp.md                            # C++ RAII, move semantics, exception safety
|   +-- zig.md                            # Zig allocators, errors, comptime, C interop
|   +-- qt.md                             # Qt object model, signals/slots, GUI perf
|   +-- css-less-sass.md                  # CSS/Less/Sass variables, responsive design
|   +-- architecture-review-guide.md      # SOLID, anti-patterns, coupling/cohesion
|   +-- code-quality-universal.md        # Reuse audit, parameter sprawl, TOCTOU, no-op updates
|   +-- performance-review-guide.md       # Core Web Vitals, N+1, memory leaks
|   +-- security-review-guide.md          # Security checklist (all languages)
|   +-- common-bugs-checklist.md          # Language-specific bug patterns
|   +-- code-review-best-practices.md     # Communication & process guidelines
|
+-- reference/cross-cutting/             # Language-agnostic cross-cutting patterns
|   +-- sql-injection-prevention.md       # Parameterized queries, 6 languages
|   +-- xss-prevention.md                 # Output encoding, CSP, 5 frameworks
|   +-- n-plus-one-queries.md             # N+1 queries, eager loading, 5 languages
|   +-- error-handling-principles.md      # Error handling principles, 7 languages
|   +-- async-concurrency-patterns.md     # Concurrency patterns, 7 languages
|
+-- assets/
|   +-- review-checklist.md               # Quick reference checklist
|   +-- pr-review-template.md             # PR review comment template
|
+-- scripts/
    +-- pr-analyzer.py                    # PR complexity analyzer
