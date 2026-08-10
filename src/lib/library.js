import { mediaKey, mediaSummary } from './media.js';

const MY_LIST_KEY = 'cineflix:my-list:v3';
const PROGRESS_KEY = 'cineflix:continue:v3';
const PREVIEW_KEY = 'cineflix:previews:v3';
const EVENT_NAME = 'cineflix:library-change';
const LEGACY_PROGRESS_PREFIX = 'cineflix:progress:';

function safeGetItem(key) {
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function safeSetItem(key, value) {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}

function safeRemoveItem(key) {
  try { window.localStorage.removeItem(key); } catch { /* storage may be unavailable */ }
}

function emitChange(key) {
  try { window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { key } })); } catch { /* no-op */ }
}

function readJson(key, fallback) {
  try {
    const value = JSON.parse(safeGetItem(key) || 'null');
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  safeSetItem(key, JSON.stringify(value));
  emitChange(key);
}

export function readMyList() {
  const items = readJson(MY_LIST_KEY, []);
  return Array.isArray(items) ? items : [];
}

export function isInMyList(media) {
  const key = mediaKey(media);
  return readMyList().some((item) => mediaKey(item) === key);
}

export function toggleMyList(media) {
  const key = mediaKey(media);
  const current = readMyList();
  const exists = current.some((item) => mediaKey(item) === key);
  const next = exists
    ? current.filter((item) => mediaKey(item) !== key)
    : [mediaSummary(media), ...current].filter(Boolean).slice(0, 100);
  writeJson(MY_LIST_KEY, next);
  return !exists;
}

export function playbackKey(media, season, episode) {
  const key = mediaKey(media);
  return media?.mediaType === 'tv'
    ? `${key}:s${Number(season || 1)}:e${Number(episode || 1)}`
    : key;
}

export function readProgressMap() {
  const value = readJson(PROGRESS_KEY, {});
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function getResumePosition(media, season, episode) {
  const entry = readProgressMap()[playbackKey(media, season, episode)];
  const currentTime = Number(entry?.currentTime || 0);
  if (Number.isFinite(currentTime) && currentTime > 5) return Math.floor(currentTime);

  // The previous movie-only build stored a single numeric value per TMDB ID.
  // Preserve that resume point while moving all new writes to the richer v3 map.
  if (media?.mediaType !== 'tv' && media?.id) {
    const legacy = Number(safeGetItem(`${LEGACY_PROGRESS_PREFIX}${media.id}`) || 0);
    if (Number.isFinite(legacy) && legacy > 5) return Math.floor(legacy);
  }
  return 0;
}

export function saveProgress({ media, season, episode, episodeName, currentTime, duration, percent }) {
  const key = playbackKey(media, season, episode);
  if (media?.mediaType !== 'tv' && media?.id) safeRemoveItem(`${LEGACY_PROGRESS_PREFIX}${media.id}`);
  const current = readProgressMap();
  const safeCurrent = Number(currentTime || 0);
  const safeDuration = Number(duration || 0);
  const computedPercent = Number.isFinite(Number(percent))
    ? Number(percent)
    : (safeDuration > 0 ? (safeCurrent / safeDuration) * 100 : 0);

  if (computedPercent >= 95) {
    delete current[key];
  } else {
    current[key] = {
      playbackKey: key,
      media: mediaSummary(media),
      season: media?.mediaType === 'tv' ? Number(season || 1) : null,
      episode: media?.mediaType === 'tv' ? Number(episode || 1) : null,
      episodeName: episodeName || '',
      currentTime: Number.isFinite(safeCurrent) ? safeCurrent : 0,
      duration: Number.isFinite(safeDuration) ? safeDuration : 0,
      percent: Math.max(0, Math.min(100, Number.isFinite(computedPercent) ? computedPercent : 0)),
      updatedAt: Date.now(),
    };
  }

  const trimmed = Object.fromEntries(
    Object.entries(current)
      .sort(([, a], [, b]) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
      .slice(0, 60),
  );
  writeJson(PROGRESS_KEY, trimmed);
}

export function clearProgress(media, season, episode) {
  const current = readProgressMap();
  if (media?.mediaType !== 'tv' && media?.id) safeRemoveItem(`${LEGACY_PROGRESS_PREFIX}${media.id}`);
  delete current[playbackKey(media, season, episode)];
  writeJson(PROGRESS_KEY, current);
}

export function readContinueWatching() {
  return Object.values(readProgressMap())
    .filter((entry) => entry?.media && Number(entry.percent || 0) < 95)
    .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0))
    .slice(0, 20);
}

export function readPreviewPreference() {
  const stored = safeGetItem(PREVIEW_KEY);
  return stored == null ? true : stored === 'true';
}

export function writePreviewPreference(enabled) {
  safeSetItem(PREVIEW_KEY, String(Boolean(enabled)));
  emitChange(PREVIEW_KEY);
}

export function subscribeLibrary(callback) {
  const handler = () => callback();
  window.addEventListener(EVENT_NAME, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(EVENT_NAME, handler);
    window.removeEventListener('storage', handler);
  };
}
