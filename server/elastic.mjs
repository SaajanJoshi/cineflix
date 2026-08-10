import { config } from './config.mjs';
import { mediaKey } from './normalize.mjs';

let client;
let ClientClass;

export function elasticEnabled() {
  return Boolean(config.elasticNode);
}

export async function elasticClient() {
  if (!elasticEnabled()) return null;
  if (!ClientClass) {
    ({ Client: ClientClass } = await import('@elastic/elasticsearch'));
  }
  if (!client) {
    const auth = config.elasticApiKey
      ? { apiKey: config.elasticApiKey }
      : (config.elasticUsername ? { username: config.elasticUsername, password: config.elasticPassword } : undefined);
    client = new ClientClass({ node: config.elasticNode, ...(auth ? { auth } : {}) });
  }
  return client;
}

export async function ensureMediaIndex() {
  const es = await elasticClient();
  if (!es) return false;
  const exists = await es.indices.exists({ index: config.elasticIndex });
  if (exists) return true;
  await es.indices.create({
    index: config.elasticIndex,
    mappings: {
      properties: {
        tmdbId: { type: 'integer' },
        key: { type: 'keyword' },
        mediaType: { type: 'keyword' },
        title: { type: 'text', fields: { keyword: { type: 'keyword' } } },
        originalTitle: { type: 'text' },
        overview: { type: 'text' },
        year: { type: 'integer' },
        releaseDate: { type: 'date', ignore_malformed: true },
        genres: { type: 'keyword' },
        countries: { type: 'keyword' },
        countryCodes: { type: 'keyword' },
        originalLanguage: { type: 'keyword' },
        posterPath: { type: 'keyword', index: false },
        backdropPath: { type: 'keyword', index: false },
        popularity: { type: 'float' },
        tmdbRating: { type: 'float' },
        voteCount: { type: 'integer' },
        imdbId: { type: 'keyword' },
        ratings: {
          properties: {
            imdb: { type: 'keyword', index: false },
            rottenTomatoes: { type: 'keyword', index: false },
            metascore: { type: 'keyword', index: false },
          },
        },
      },
    },
  });
  return true;
}

export async function upsertMedia(items) {
  const es = await elasticClient();
  if (!es || !items.length) return;
  await ensureMediaIndex();
  const operations = items.flatMap((item) => {
    const key = item.key || mediaKey(item.mediaType, item.id || item.tmdbId);
    return [
      { index: { _index: config.elasticIndex, _id: key } },
      { ...item, key, tmdbId: item.id || item.tmdbId },
    ];
  });
  await es.bulk({ refresh: false, operations });
}

export async function searchElastic({ query, year, country, genre, mediaType = 'all', size = 30 }) {
  const es = await elasticClient();
  if (!es) return null;
  await ensureMediaIndex();

  const filter = [];
  if (year) filter.push({ term: { year: Number(year) } });
  if (genre) filter.push({ term: { genres: genre } });
  if (mediaType === 'movie' || mediaType === 'tv') filter.push({ term: { mediaType } });
  if (country) {
    const value = country.trim();
    filter.push({
      bool: {
        should: [
          { term: { countryCodes: value.toUpperCase() } },
          { wildcard: { countries: { value: `*${value.toLowerCase()}*`, case_insensitive: true } } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  const must = query ? [{
    multi_match: {
      query,
      fields: ['title^9', 'originalTitle^5', 'genres^3', 'countries^2', 'overview'],
      type: 'best_fields',
      fuzziness: 'AUTO',
      prefix_length: 1,
      operator: 'and',
    },
  }] : [{ match_all: {} }];

  const response = await es.search({
    index: config.elasticIndex,
    size,
    query: { bool: { must, filter } },
    sort: query ? ['_score', { popularity: 'desc' }] : [{ popularity: 'desc' }],
  });

  return response.hits.hits.map((hit) => ({
    ...hit._source,
    id: hit._source.tmdbId,
    key: hit._source.key || mediaKey(hit._source.mediaType, hit._source.tmdbId),
  }));
}
