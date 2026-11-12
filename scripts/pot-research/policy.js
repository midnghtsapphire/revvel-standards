"use strict";

/**
 * Frozen base weights plus a per-problem transient adapter.
 *
 * Why this split exists: Policy of Thoughts (Jiao et al., arXiv:2601.20379)
 * updates a LoRA adapter for one problem and then throws that adapter away.
 * The base checkpoint must be bit-identical afterwards. This module is the
 * contract a later Llama / Qwen LoRA module has to satisfy. It does not load
 * those weights and it does not call a model host.
 *
 * Fallback: there is no second copy of the base to "repair" from. If
 * `verify()` throws, stop the run. Do not keep the adapter, and do not
 * reload a checkpoint from the network. What to check: the hash in the
 * error, and whether some caller kept a reference to `values()` and wrote
 * through a different object. `values()` returns a copy, so a write to that
 * copy cannot be the cause.
 */

const crypto = require("crypto");

/**
 * Immutable byte buffer of the base weights. The stored bytes are never
 * written after construction. Callers receive copies.
 */
class FrozenBaseWeights {
  constructor(values) {
    if (!values || typeof values.length !== "number" || values.length === 0) {
      throw new Error("FrozenBaseWeights needs a non-empty numeric vector.");
    }
    const copy = new Float64Array(values.length);
    for (let i = 0; i < values.length; i += 1) {
      const n = Number(values[i]);
      if (!Number.isFinite(n)) {
        throw new Error(`FrozenBaseWeights[${i}] is not a finite number.`);
      }
      copy[i] = n;
    }
    // Copy out of the typed-array's buffer so a caller who keeps the input
    // array cannot poke holes in the frozen bytes.
    this._bytes = Buffer.from(copy.buffer, copy.byteOffset, copy.byteLength);
    this.hash = crypto.createHash("sha256").update(this._bytes).digest("hex");
    this.length = copy.length;
  }

  /** Recompute the hash. Throws if the stored bytes moved. */
  verify() {
    const now = crypto.createHash("sha256").update(this._bytes).digest("hex");
    if (now !== this.hash) {
      throw new Error(
        `Base weights hash changed from ${this.hash} to ${now}. ` +
          "A transient adapter must not write the base.",
      );
    }
    return now;
  }

  /** Copy. Mutating the return value does not touch the stored bytes. */
  values() {
    const out = new Float64Array(this.length);
    for (let i = 0; i < this.length; i += 1) {
      out[i] = this._bytes.readDoubleLE(i * 8);
    }
    return out;
  }
}

/**
 * Per-problem bias table. `discard()` drops the table. Later reads throw,
 * which is how a test proves the adapter cannot leak into the next problem.
 */
class TransientAdapter {
  constructor(ids) {
    this.bias = new Map();
    this.discarded = false;
    this.createdAt = Date.now();
    const list = ids ? Array.from(ids) : [];
    for (const id of list) {
      this.bias.set(String(id), 0);
    }
  }

  add(id, delta) {
    if (this.discarded) {
      throw new Error("This adapter was discarded and can no longer be updated.");
    }
    if (!Number.isFinite(delta)) {
      throw new Error("Adapter delta must be a finite number.");
    }
    const key = String(id);
    this.bias.set(key, (this.bias.get(key) || 0) + delta);
  }

  get(id) {
    if (this.discarded) {
      throw new Error("This adapter was discarded and can no longer be read.");
    }
    return this.bias.get(String(id)) || 0;
  }

  snapshot() {
    if (this.discarded) {
      throw new Error("This adapter was discarded and can no longer be read.");
    }
    return new Map(this.bias);
  }

  discard() {
    this.bias = new Map();
    this.discarded = true;
  }
}

/**
 * Abstract policy. A real LoRA policy overrides `score` and `propose` and
 * must keep `base` frozen. `openAdapter` / `closeAdapter` are the only
 * supported lifecycle: one adapter per problem, then discard.
 */
class Policy {
  constructor(baseValues) {
    this.base = new FrozenBaseWeights(baseValues);
    this.activeAdapter = null;
  }

  baseHash() {
    return this.base.verify();
  }

  baseValues() {
    return this.base.values();
  }

  openAdapter(ids) {
    if (this.activeAdapter && !this.activeAdapter.discarded) {
      throw new Error("Discard the open adapter before starting another problem.");
    }
    this.activeAdapter = new TransientAdapter(ids);
    return this.activeAdapter;
  }

  closeAdapter(adapter) {
    if (!adapter) return;
    adapter.discard();
    if (this.activeAdapter === adapter) this.activeAdapter = null;
  }

  /**
   * Higher score is preferred. The base term is read from the frozen copy.
   * The adapter term is the only part GRPO is allowed to move.
   */
  score(action, adapter) {
    const values = this.base.values();
    const index = stableIndex(action, values.length);
    const bias = adapter ? adapter.get(action) : 0;
    return values[index] + bias;
  }

  /**
   * Stable proposal order: higher score first, action id as the tie break.
   * A later LoRA policy can replace this with sampled tokens.
   */
  propose(legalActions, adapter) {
    return legalActions.slice().sort((a, b) => {
      const diff = this.score(b, adapter) - this.score(a, adapter);
      if (Math.abs(diff) > 1e-12) return diff;
      return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
    });
  }
}

/** Deterministic stand-in used by tests and by the CPU lane search. */
class StubPolicy extends Policy {}

function stableIndex(action, length) {
  const text = String(action);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % length;
}

module.exports = {
  FrozenBaseWeights,
  Policy,
  StubPolicy,
  TransientAdapter,
  stableIndex,
};
