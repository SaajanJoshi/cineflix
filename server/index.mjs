import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { config } from './config.mjs';
import {
  getGenres,
  getMediaDetails,
  getPreview,
  getSeasonDetails,
  hasTmdb,
  homeCatalog,
  mapLimit,
  parseMediaReference,
  searchTmdb,
} from './tmdb.mjs';
import { ratingsByImdb, ratingsByMedia, ratingsForItems } from './omdb.mjs';
import { elasticEnabled, searchElastic, upsertMedia } from './elastic.mjs';

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../dist');

app.disable('x-powered-by');
app.use(cors({ origin: config.webOrigin.split(',').map((origin) => origin.trim()), credentials: false }));
app.use(express.json({ limit: '64kb' }));

function normalizeRatingItem(value) {
  if (!value || typeof value !== 'object') return null;
  const reference = value.key ? parseMediaReference(value.key) : null;
  const mediaType = reference?.mediaType || (value.mediaType === 'tv' ? 'tv' : value.mediaType === 'movie' ? 'movie' : '');
  const id = Number(reference?.id || value.id || value.tmdbId);
  if (!mediaType || !Number.isFinite(id) || id <= 0) return null;
  return {
    mediaType,
    id,
    key: `${mediaType}:${id}`,
    title: String(value.title || '').trim(),
    year: /^\d{4}$/.test(String(value.year || '')) ? Number(value.year) : null,
    imdbId: /^tt\d+$/i.test(String(value.imdbId || '')) ? String(value.imdbId) : null,
  };
}

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    tmdb: hasTmdb(),
    ratings: {
      configured: Boolean(config.omdbApiKey),
      provider: 'omdb',
      fallback: 'tmdb',
    },
    elasticsearch: elasticEnabled(),
    player: {
      provider: 'vidking',
      baseUrl: config.vidkingBaseUrl,
      color: config.vidkingColor,
    },
  });
});

app.get('/api/genres', async (_req, res, next) => {
  try { res.json({ genres: await getGenres() }); } catch (error) { next(error); }
});

app.get('/api/home', async (_req, res, next) => {
  try { res.json(await homeCatalog()); } catch (error) { next(error); }
});

app.get('/api/media/:type/:id', async (req, res, next) => {
  try {
    const media = await getMediaDetails(req.params.type, req.params.id);
    const ratings = media.imdbId ? await ratingsByImdb(media.imdbId) : await ratingsByMedia(req.params.type, req.params.id);
    const payload = { ...media, ratings };
    if (elasticEnabled()) upsertMedia([payload]).catch(() => {});
    res.json(payload);
  } catch (error) { next(error); }
});

app.get('/api/media/:type/:id/preview', async (req, res, next) => {
  try { res.json({ preview: await getPreview(req.params.type, req.params.id) }); } catch (error) { next(error); }
});

app.get('/api/tv/:id/season/:season', async (req, res, next) => {
  try { res.json(await getSeasonDetails(req.params.id, req.params.season)); } catch (error) { next(error); }
});

// Compatibility route for the previous build.
app.get('/api/movie/:id', async (req, res, next) => {
  try {
    const movie = await getMediaDetails('movie', req.params.id);
    const ratings = movie.imdbId ? await ratingsByImdb(movie.imdbId) : await ratingsByMedia('movie', req.params.id);
    res.json({ ...movie, ratings });
  } catch (error) { next(error); }
});

async function sendRatings(items, res) {
  res.json({
    configured: Boolean(config.omdbApiKey),
    provider: config.omdbApiKey ? 'omdb' : 'tmdb-fallback',
    ratings: await ratingsForItems(items.slice(0, 80)),
  });
}

app.post('/api/ratings', async (req, res, next) => {
  try {
    const items = (Array.isArray(req.body?.items) ? req.body.items : [])
      .map(normalizeRatingItem)
      .filter(Boolean);
    await sendRatings(items, res);
  } catch (error) { next(error); }
});

// Compatibility with the previous GET-based frontend.
app.get('/api/ratings', async (req, res, next) => {
  try {
    const raw = String(req.query.items || req.query.ids || '');
    const items = raw.split(',').map((value) => {
      if (value.includes(':')) return parseMediaReference(value);
      const id = Number(value);
      return Number.isFinite(id) && id > 0 ? { mediaType: 'movie', id, key: `movie:${id}` } : null;
    }).filter(Boolean);
    await sendRatings(items, res);
  } catch (error) { next(error); }
});

app.get('/api/ratings/diagnose', async (_req, res, next) => {
  try {
    if (!config.omdbApiKey) {
      return res.status(503).json({
        ok: false,
        configured: false,
        error: 'OMDB_API_KEY is missing from .env. Add it, then restart npm run dev.',
      });
    }
    const sample = await ratingsByImdb('tt0111161');
    return res.status(sample.status === 'ok' ? 200 : 502).json({
      ok: sample.status === 'ok',
      configured: true,
      status: sample.status,
      message: sample.message,
      sample,
    });
  } catch (error) { return next(error); }
});

app.get('/api/search', async (req, res, next) => {
  try {
    const params = {
      query: String(req.query.q || '').trim(),
      year: String(req.query.year || '').trim(),
      country: String(req.query.country || '').trim(),
      genre: String(req.query.genre || '').trim(),
      mediaType: String(req.query.type || 'all').trim(),
      page: Number(req.query.page || 1),
    };

    let elasticWarning = '';
    if (elasticEnabled()) {
      try {
        const elasticResults = await searchElastic(params);
        if (elasticResults?.length) {
          return res.json({ provider: 'elasticsearch', results: elasticResults, page: params.page, totalPages: 1, totalResults: elasticResults.length });
        }
      } catch (error) {
        elasticWarning = `Elasticsearch unavailable: ${error.message}`;
        console.warn(elasticWarning);
      }
    }

    const tmdbResults = await searchTmdb(params);
    if (elasticEnabled() && tmdbResults.results?.length) {
      mapLimit(tmdbResults.results.slice(0, 20), 5, (item) => getMediaDetails(item.mediaType, item.id))
        .then(upsertMedia)
        .catch((error) => console.warn('Elasticsearch upsert:', error.message));
    }

    res.json({ provider: 'tmdb-fallback', ...tmdbResults, ...(elasticWarning ? { warning: elasticWarning } : {}) });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = /Unsupported media type/.test(error.message || '') ? 400 : 500;
  res.status(status).json({ error: error.message || 'Unexpected server error' });
});

app.listen(config.port, '0.0.0.0', () => {
  console.log(`CineFlix API listening on http://0.0.0.0:${config.port}`);
  console.log(`TMDB: ${hasTmdb() ? 'configured' : 'missing'} | OMDb: ${config.omdbApiKey ? 'configured' : 'missing (TMDB fallback)'} | Elasticsearch: ${elasticEnabled() ? 'configured' : 'fallback mode'}`);
});
