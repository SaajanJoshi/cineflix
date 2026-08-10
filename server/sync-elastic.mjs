import { config } from './config.mjs';
import { elasticEnabled, ensureMediaIndex, upsertMedia } from './elastic.mjs';
import { getGenreCatalog, getMediaDetails, mapLimit, tmdb } from './tmdb.mjs';
import { ratingsByImdb } from './omdb.mjs';
import { normalizeMedia } from './normalize.mjs';

if (!elasticEnabled()) {
  console.error('Elasticsearch is not configured. Set ELASTICSEARCH_NODE and, when required, API-key or username/password credentials.');
  process.exit(1);
}

await ensureMediaIndex();
const genres = await getGenreCatalog();
const maps = {
  movie: new Map(genres.movie.map((genre) => [genre.id, genre.name])),
  tv: new Map(genres.tv.map((genre) => [genre.id, genre.name])),
};
const pages = Number(process.env.SYNC_PAGES || 8);
const raw = [];

for (const mediaType of ['movie', 'tv']) {
  for (let page = 1; page <= pages; page += 1) {
    const data = await tmdb(`/discover/${mediaType}`, {
      language: 'en-US',
      include_adult: false,
      ...(mediaType === 'movie' ? { include_video: false } : {}),
      sort_by: 'popularity.desc',
      'vote_count.gte': 30,
      page,
    }, 1);
    raw.push(...(data.results || []).map((item) => normalizeMedia(item, maps[mediaType], mediaType)));
    console.log(`Fetched ${mediaType} page ${page}/${pages}`);
  }
}

const unique = [...new Map(raw.map((item) => [item.key, item])).values()];
const enriched = await mapLimit(unique, 6, async (item, index) => {
  const details = await getMediaDetails(item.mediaType, item.id);
  const ratings = config.omdbApiKey ? await ratingsByImdb(details.imdbId) : undefined;
  if ((index + 1) % 25 === 0) console.log(`Enriched ${index + 1}/${unique.length}`);
  return { ...details, ...(ratings ? { ratings } : {}) };
});

for (let index = 0; index < enriched.length; index += 250) {
  await upsertMedia(enriched.slice(index, index + 250));
  console.log(`Indexed ${Math.min(index + 250, enriched.length)}/${enriched.length}`);
}

console.log(`Done. Indexed ${enriched.length} movies and series into ${config.elasticIndex}.`);
