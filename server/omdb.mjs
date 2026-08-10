import { config } from './config.mjs';
import { cached } from './cache.mjs';
import { getExternalIds, mapLimit } from './tmdb.mjs';
import { mediaKey } from './normalize.mjs';
import { persistentGet, persistentSet } from './persistent-cache.mjs';

const DAY = 24 * 60 * 60_000;

function blank(status = 'unavailable', message = '') {
  return {
    imdb: null,
    rottenTomatoes: null,
    metascore: null,
    imdbVotes: null,
    matchedImdbId: null,
    matchedTitle: null,
    matchedYear: null,
    status,
    message,
    provider: 'omdb',
  };
}

function parseOmdb(data) {
  if (data.Response === 'False') {
    const message = data.Error || 'OMDb did not return ratings for this title.';
    const status = /request limit|too many requests|rate limit/i.test(message)
      ? 'rate-limit'
      : (/api key|invalid key|key is not activated|no key provided/i.test(message) ? 'invalid-key' : 'not-found');
    return blank(status, message);
  }

  const ratings = new Map((data.Ratings || []).map((rating) => [rating.Source, rating.Value]));
  return {
    imdb: ratings.get('Internet Movie Database') || (data.imdbRating && data.imdbRating !== 'N/A' ? `${data.imdbRating}/10` : null),
    rottenTomatoes: ratings.get('Rotten Tomatoes') || null,
    metascore: data.Metascore && data.Metascore !== 'N/A' ? `${data.Metascore}/100` : null,
    imdbVotes: data.imdbVotes && data.imdbVotes !== 'N/A' ? data.imdbVotes : null,
    matchedImdbId: data.imdbID || null,
    matchedTitle: data.Title || null,
    matchedYear: data.Year || null,
    status: 'ok',
    message: '',
    provider: 'omdb',
  };
}

async function cachedRating(key, fetcher) {
  return cached(key, DAY, async () => {
    const persisted = persistentGet(key, DAY);
    if (persisted) return persisted;
    const result = await fetcher();
    if (result.status === 'ok') persistentSet(key, result);
    return result;
  });
}

async function requestOmdb(params) {
  if (!config.omdbApiKey) return blank('unconfigured', 'Add OMDB_API_KEY to .env to enable IMDb and Rotten Tomatoes ratings.');

  try {
    const url = new URL('https://www.omdbapi.com/');
    url.searchParams.set('apikey', config.omdbApiKey);
    url.searchParams.set('plot', 'short');
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, { headers: { accept: 'application/json' } });
    if (!response.ok) return blank('http-error', `OMDb returned HTTP ${response.status}.`);
    return parseOmdb(await response.json());
  } catch (error) {
    return blank('network-error', error.message || 'Could not contact OMDb.');
  }
}

export async function ratingsByImdb(imdbId) {
  if (!config.omdbApiKey) return blank('unconfigured', 'Add OMDB_API_KEY to .env to enable IMDb and Rotten Tomatoes ratings.');
  if (!imdbId) return blank('no-imdb-id', 'TMDB did not provide an IMDb ID for this title.');
  return cachedRating(`omdb:id:${imdbId}`, () => requestOmdb({ i: imdbId }));
}

export async function ratingsByTitle({ title, year, mediaType = 'movie' }) {
  if (!config.omdbApiKey) return blank('unconfigured', 'Add OMDB_API_KEY to .env to enable IMDb and Rotten Tomatoes ratings.');
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return blank('no-title', 'The title was missing from the rating lookup.');
  const cleanYear = /^\d{4}$/.test(String(year || '')) ? String(year) : '';
  const omdbType = mediaType === 'tv' ? 'series' : 'movie';
  const key = `omdb:title:${omdbType}:${cleanTitle.toLowerCase()}:${cleanYear}`;
  return cachedRating(key, async () => {
    const result = await requestOmdb({ t: cleanTitle, y: cleanYear, type: omdbType });
    if (result.status === 'ok' && cleanYear && result.matchedYear && !String(result.matchedYear).startsWith(cleanYear)) {
      return blank('mismatch', `OMDb matched ${result.matchedTitle || cleanTitle} (${result.matchedYear}) instead of ${cleanYear}.`);
    }
    return result;
  });
}

export async function ratingsByMedia(mediaType, tmdbId) {
  return cached(`rating:${mediaType}:${tmdbId}`, DAY, async () => {
    const externalIds = await getExternalIds(mediaType, tmdbId);
    return ratingsByImdb(externalIds.imdbId);
  });
}

async function ratingsForItem(item) {
  if (item.imdbId) return ratingsByImdb(item.imdbId);

  // A title/year OMDb lookup avoids an extra TMDB request for every card. If it
  // cannot make an exact match, fall back to TMDB's external IMDb ID.
  if (item.title) {
    const byTitle = await ratingsByTitle(item);
    if (byTitle.status === 'ok') return byTitle;
    if (!['not-found', 'mismatch', 'no-title'].includes(byTitle.status)) return byTitle;
  }

  if (item.id) return ratingsByMedia(item.mediaType, item.id);
  return blank('unavailable', 'The title did not include enough information for a rating lookup.');
}

export async function ratingsForItems(items) {
  if (!items.length) return {};
  if (!config.omdbApiKey) {
    return Object.fromEntries(items.map(({ mediaType, id }) => [
      mediaKey(mediaType, id),
      blank('unconfigured', 'Add OMDB_API_KEY to .env to enable IMDb and Rotten Tomatoes ratings.'),
    ]));
  }

  const pairs = await mapLimit(items, 5, async (item) => [
    mediaKey(item.mediaType, item.id),
    await ratingsForItem(item),
  ]);
  return Object.fromEntries(pairs);
}
