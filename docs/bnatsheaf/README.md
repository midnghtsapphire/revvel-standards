# MOTU BNAT Knowledge Sheaf

This directory contains the core documentation and standard foundation for the MOTU BNAT (Biomimetic Networked Agent Topology) Knowledge Sheaf.

## Overview

The BNAT Knowledge Sheaf is the connective tissue for our multi-agent fleet. It maps localized operational state from individual workers into a globally consistent topological structure—a cellular sheaf. When there is conflict between localized states (a non-zero $H^1$ obstruction or elevated Sheaf Laplacian energy $E(x)$), the sheaf provides a formal mathematical mechanism for detecting the misalignment and preventing destructive actions across the network.

For a living, operational example of this topological gluing in action, see the BIOME sheaf implementation:

- Code: [`scripts/biome/sheaf.js`](../../scripts/biome/sheaf.js)
- Feed: [`docs/biome/biome-status.json`](../../docs/biome/biome-status.json)

## Imprint-At-Spawn Rule

To maintain topological consistency across all transient and visiting agents, we enforce the **imprint-at-spawn** rule:

> All agents, including transient and visiting ones, must restrict their initial worldview from the Knowledge Sheaf prior to beginning work. They must execute `python3 bnatsheaf/scripts/imprint_agent.py` to assert topological consistency (H^1 ≈ 0) at startup.

If the knowledge sheaf indicates an obstruction ($E(x) > \\varepsilon$), the agent is structurally barred from beginning execution on high-blast PRs or adopting complex assignments until the fleet converges to consensus.
