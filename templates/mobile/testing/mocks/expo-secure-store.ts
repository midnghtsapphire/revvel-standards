// tests/mocks/expo-secure-store.ts — Revvel mobile testing template
//
// In-memory replacement for expo-secure-store used by Jest. Mirrors the
// async API surface that Revvel app code touches. Do NOT add behavior beyond
// the public API — tests should treat this as a key/value store and nothing more.

const store = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return store.has(key) ? (store.get(key) as string) : null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
}

// Helpers for tests — not part of the real expo-secure-store API.
export function __reset(): void {
  store.clear();
}

export function __seed(seed: Record<string, string>): void {
  for (const [k, v] of Object.entries(seed)) {
    store.set(k, v);
  }
}

export default {
  getItemAsync,
  setItemAsync,
  deleteItemAsync,
  __reset,
  __seed,
};
