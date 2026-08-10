import fs from 'node:fs';
import path from 'node:path';

const cacheFile = path.resolve(process.env.OMDB_CACHE_FILE || '.cache/omdb-ratings.json');
let loaded = false;
let entries = {};
let writeTimer;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const parsed = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
    entries = parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    entries = {};
  }
}

export function persistentGet(key, maxAgeMs) {
  load();
  const hit = entries[key];
  if (!hit || Date.now() - Number(hit.savedAt || 0) > maxAgeMs) {
    if (hit) delete entries[key];
    return undefined;
  }
  return hit.value;
}

function flush() {
  writeTimer = undefined;
  try {
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    const newest = Object.entries(entries)
      .sort(([, a], [, b]) => Number(b.savedAt || 0) - Number(a.savedAt || 0))
      .slice(0, 1200);
    entries = Object.fromEntries(newest);
    fs.writeFileSync(cacheFile, JSON.stringify(entries), 'utf8');
  } catch {
    // Read-only deployments still retain the normal in-memory cache.
  }
}

export function persistentSet(key, value) {
  load();
  entries[key] = { savedAt: Date.now(), value };
  if (!writeTimer) {
    writeTimer = setTimeout(flush, 500);
    writeTimer.unref?.();
  }
  return value;
}
