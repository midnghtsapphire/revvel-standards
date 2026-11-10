# PyTorch Reproducibility notes + torch.use_deterministic_algorithms

**BLUF:** Any Python ML script added under scripts/ (for example the scripts/python_cuda/ validation layer or a future fine-tune or classifier) needs one canonical seeding preamble. Priority **high**, effort **low**, loop **Deterministic**.

| Field | Value |
| --- | --- |
| Category | `reproducibility` |
| Kind | official docs |
| License | BSD-3-Clause (PyTorch LICENSE file; GitHub API reports NOASSERTION) |
| Priority | high |
| Effort to adopt | low |
| Loop (llms.txt) | Deterministic |
| Accessed | 2026-10-26 |

## What it is

The official checklist for reproducible PyTorch runs: seeding (torch.manual_seed, NumPy, Python random), cuDNN benchmark/deterministic flags, torch.use_deterministic_algorithms(True) (raises on ops without a deterministic implementation), SDPA attention-backend determinism, and DataLoader worker seeding.

## Why it fits revvel-standards

Any Python ML script added under scripts/ (for example the scripts/python_cuda/ validation layer or a future fine-tune or classifier) needs one canonical seeding preamble. This page is the primary source for it, so the repo can cite a method instead of folklore, as WR-4482 (evidence-first) requires.

## Determinism notes

Gives bitwise repeatability on the same hardware, software versions and config. PyTorch states: 'Completely reproducible results are not guaranteed across PyTorch releases, individual commits, or different platforms', nor between CPU and GPU. Pass warn_only=False, since warn_only=True still runs nondeterministic fused attention backward paths. Deterministic mode raises an error on ops that have no deterministic implementation, which is the fail-loud behavior VERIFY_THE_POSTCONDITION wants.

## How to adopt

1. Add a `seed_everything()` helper (Python stdlib + optional torch import) that sets every RNG and calls `torch.use_deterministic_algorithms(True)` when torch is present.
2. Log seed, torch version, CUDA/cuDNN versions and device into the run ledger (JSONL) so a rerun can be checked.

## Sources

- <https://docs.pytorch.org/docs/stable/notes/randomness.html>
- <https://docs.pytorch.org/docs/stable/generated/torch.use_deterministic_algorithms.html>
- <https://github.com/pytorch/pytorch>
