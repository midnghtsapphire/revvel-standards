# JAX explicit PRNG keys (jax.random)

**BLUF:** Reference design pattern, not a dependency. Priority **low**, effort **low (pattern) / high (adopting JAX itself)**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `reproducibility` |
| Kind | official docs + framework |
| License | Apache-2.0 |
| Priority | low |
| Effort to adopt | low (pattern) / high (adopting JAX itself) |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

JAX passes random state around explicitly as keys (`jax.random.key`, `split`) instead of using a hidden global RNG, so randomness is a pure function of the key.

## Why it fits revvel-standards

Reference design pattern, not a dependency. The repo's stack is Node + stdlib Python. The explicit-key idea maps directly onto making any sampled or randomized step (judge order, shuffles, sampling for ensembles) take a recorded seed argument instead of global state.

## Determinism notes

With explicit keys, the same key and program give the same random stream. Floating-point results on GPU or TPU can still vary by backend and version.

## How to adopt

1. Use as a design reference: every randomized function in scripts/ takes `seed` or `rng` explicitly, and the value is logged.

## Sources

- <https://docs.jax.dev/en/latest/random-numbers.html>
- <https://github.com/jax-ml/jax>
