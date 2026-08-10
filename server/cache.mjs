const entries = new Map();
const MAX_ENTRIES = 320;

function prune() {
  const now = Date.now();
  for (const [key, entry] of entries) {
    if (entry.expires < now) entries.delete(key);
  }
  while (entries.size > MAX_ENTRIES) entries.delete(entries.keys().next().value);
}

export function cacheGet(key) {
  const hit = entries.get(key);
  if (!hit) return undefined;
  if (hit.expires < Date.now()) {
    entries.delete(key);
    return undefined;
  }
  // Refresh insertion order so frequently used values survive pruning.
  entries.delete(key);
  entries.set(key, hit);
  return hit.value;
}

export function cacheSet(key, value, ttlMs) {
  if (entries.has(key)) entries.delete(key);
  entries.set(key, { value, expires: Date.now() + ttlMs });
  if (entries.size > MAX_ENTRIES) prune();
  return value;
}

export async function cached(key, ttlMs, fn) {
  const hit = cacheGet(key);
  if (hit !== undefined) return hit;
  return cacheSet(key, await fn(), ttlMs);
}
