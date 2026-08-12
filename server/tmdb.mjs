import { config } from './config.mjs';
import { cached } from './cache.mjs';
import { mediaKey, normalizeMedia } from './normalize.mjs';

const API = 'https://api.themoviedb.org/3';
const VALID_TYPES = new Set(['movie', 'tv']);

function assertType(type) {
  if (!VALID_TYPES.has(type)) throw new Error(`Unsupported media type: ${type}`);
  return type;
}

function authUrl(path, params = {}) {
  const url = new URL(`${API}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  if (!config.tmdbToken && config.tmdbApiKey) url.searchParams.set('api_key', config.tmdbApiKey);
  return url;
}

export function hasTmdb() {
  return Boolean(config.tmdbToken || config.tmdbApiKey);
}

export async function tmdb(path, params = {}, ttlMs = 15 * 60_000) {
  if (!hasTmdb()) throw new Error('TMDB is not configured. Set TMDB_READ_ACCESS_TOKEN or TMDB_API_KEY in .env.');
  const url = authUrl(path, params);
  const key = `tmdb:${url.toString()}`;
  return cached(key, ttlMs, async () => {
    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        ...(config.tmdbToken ? { Authorization: `Bearer ${config.tmdbToken}` } : {}),
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`TMDB request failed (${response.status})${body ? `: ${body.slice(0, 180)}` : ''}`);
    }
    return response.json();
  });
}

export async function getGenreCatalog() {
  return cached('tmdb:genre-catalog', 24 * 60 * 60_000, async () => {
    const [movie, tv] = await Promise.all([
      tmdb('/genre/movie/list', { language: 'en-US' }, 24 * 60 * 60_000),
      tmdb('/genre/tv/list', { language: 'en-US' }, 24 * 60 * 60_000),
    ]);
    const allNames = [...new Set([...(movie.genres || []), ...(tv.genres || [])].map((genre) => genre.name))].sort();
    return { movie: movie.genres || [], tv: tv.genres || [], all: allNames };
  });
}

export async function getGenres() {
  return getGenreCatalog();
}

async function genreMaps() {
  const genres = await getGenreCatalog();
  return {
    movie: new Map(genres.movie.map((genre) => [genre.id, genre.name])),
    tv: new Map(genres.tv.map((genre) => [genre.id, genre.name])),
  };
}

function pickContentRating(data, type) {
  if (type === 'movie') {
    const country = (data.release_dates?.results || []).find((item) => item.iso_3166_1 === 'US')
      || (data.release_dates?.results || [])[0];
    const rating = (country?.release_dates || []).find((item) => item.certification)?.certification;
    return rating || '';
  }
  const result = (data.content_ratings?.results || []).find((item) => item.iso_3166_1 === 'US')
    || (data.content_ratings?.results || [])[0];
  return result?.rating || '';
}

function sortVideos(videos = []) {
  const typePriority = new Map([
    ['Clip', 0],
    ['Trailer', 1],
    ['Teaser', 2],
    ['Featurette', 3],
    ['Opening Credits', 4],
    ['Behind the Scenes', 5],
  ]);
  return videos
    .filter((video) => video.site === 'YouTube' && video.key)
    .sort((a, b) => {
      // Prefer scene-like clips before trailers, then official English uploads.
      const type = (typePriority.get(a.type) ?? 20) - (typePriority.get(b.type) ?? 20);
      if (type) return type;
      const official = Number(Boolean(b.official)) - Number(Boolean(a.official));
      if (official) return official;
      return Number(b.iso_639_1 === 'en') - Number(a.iso_639_1 === 'en');
    });
}

function pickLogo(images = {}) {
  const logos = images.logos || [];
  return (logos.find((logo) => logo.iso_639_1 === 'en') || logos.find((logo) => logo.iso_639_1 == null) || logos[0])?.file_path || '';
}

function creatorsFromCredits(data, type) {
  if (type === 'tv') return (data.created_by || []).map((person) => person.name).filter(Boolean);
  return (data.credits?.crew || []).filter((person) => person.job === 'Director').map((person) => person.name).filter(Boolean);
}


export async function getExternalIds(type, id) {
  assertType(type);
  const data = await tmdb(`/${type}/${id}/external_ids`, {}, 24 * 60 * 60_000);
  return { imdbId: data.imdb_id || null };
}

export async function getMediaDetails(type, id) {
  assertType(type);
  const appendToResponse = type === 'movie'
    ? 'external_ids,credits,videos,recommendations,images,release_dates'
    : 'external_ids,credits,videos,recommendations,images,content_ratings';
  const data = await tmdb(`/${type}/${id}`, {
    language: 'en-US',
    append_to_response: appendToResponse,
    include_image_language: 'en,null',
  }, 4 * 60 * 60_000);
  const maps = await genreMaps();
  const normalized = normalizeMedia(data, maps[type], type);
  const videos = sortVideos(data.videos?.results || []);
  const fallbackPreview = videos[0] ? null : await getPreview(type, id);
  const selectedPreview = videos[0] || fallbackPreview;
  const recommendations = (data.recommendations?.results || [])
    .slice(0, 18)
    .map((item) => normalizeMedia(item, maps[type], type));
  return {
    ...normalized,
    cast: (data.credits?.cast || []).slice(0, 12).map((person) => ({
      id: person.id,
      name: person.name,
      character: person.character || '',
      profilePath: person.profile_path || '',
    })),
    creators: creatorsFromCredits(data, type),
    contentRating: pickContentRating(data, type),
    logoPath: pickLogo(data.images),
    preview: selectedPreview ? {
      key: selectedPreview.key,
      name: selectedPreview.name,
      type: selectedPreview.type,
      official: Boolean(selectedPreview.official),
    } : null,
    videos: (videos.length ? videos : (selectedPreview ? [selectedPreview] : [])).slice(0, 8).map((video) => ({
      key: video.key,
      name: video.name,
      type: video.type,
      official: Boolean(video.official),
    })),
    recommendations,
    seasons: type === 'tv' ? (data.seasons || []).map((season) => ({
      id: season.id,
      seasonNumber: season.season_number,
      name: season.name,
      overview: season.overview || '',
      airDate: season.air_date || '',
      episodeCount: season.episode_count || 0,
      posterPath: season.poster_path || '',
    })) : [],
  };
}

export async function getMovieDetails(id) {
  return getMediaDetails('movie', id);
}

export async function getPreview(type, id) {
  assertType(type);
  const localized = await tmdb(`/${type}/${id}/videos`, { language: 'en-US' }, 12 * 60 * 60_000);
  let videos = sortVideos(localized.results || []);
  if (!videos.length) {
    const allLanguages = await tmdb(`/${type}/${id}/videos`, {}, 12 * 60 * 60_000);
    videos = sortVideos(allLanguages.results || []);
  }
  const selected = videos[0];
  return selected ? {
    key: selected.key,
    name: selected.name,
    type: selected.type,
    official: Boolean(selected.official),
    site: selected.site,
  } : null;
}

export async function getSeasonDetails(id, seasonNumber) {
  const data = await tmdb(`/tv/${id}/season/${seasonNumber}`, {
    language: 'en-US',
    append_to_response: 'videos',
  }, 3 * 60 * 60_000);
  return {
    id: data.id,
    seasonNumber: data.season_number,
    name: data.name,
    overview: data.overview || '',
    airDate: data.air_date || '',
    posterPath: data.poster_path || '',
    episodes: (data.episodes || []).map((episode) => ({
      id: episode.id,
      episodeNumber: episode.episode_number,
      seasonNumber: episode.season_number,
      name: episode.name || `Episode ${episode.episode_number}`,
      overview: episode.overview || '',
      airDate: episode.air_date || '',
      runtime: episode.runtime || null,
      stillPath: episode.still_path || '',
      tmdbRating: Number(episode.vote_average || 0),
      voteCount: Number(episode.vote_count || 0),
    })),
  };
}

function dateMonthsAgo(months) {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

function normalizeList(items, map, type, limit = 18) {
  return (items || [])
    .filter((item) => item.poster_path || item.backdrop_path)
    .map((item) => normalizeMedia(item, map, type))
    .filter((item) => item.id > 0 && VALID_TYPES.has(item.mediaType))
    .slice(0, limit);
}

function normalizeMixed(items, maps, limit = 22) {
  return (items || [])
    .filter((item) => !item.adult && (item.media_type === 'movie' || item.media_type === 'tv') && (item.poster_path || item.backdrop_path))
    .map((item) => normalizeMedia(item, maps[item.media_type], item.media_type))
    .filter((item) => item.id > 0 && VALID_TYPES.has(item.mediaType))
    .slice(0, limit);
}

export async function homeCatalog() {
  const maps = await genreMaps();
  const now = new Date().toISOString().slice(0, 10);
  const calls = await Promise.all([
    tmdb('/trending/all/week', { language: 'en-US' }, 15 * 60_000),
    tmdb('/trending/movie/week', { language: 'en-US' }, 15 * 60_000),
    tmdb('/trending/tv/week', { language: 'en-US' }, 15 * 60_000),
    tmdb('/discover/movie', {
      language: 'en-US', include_adult: false, include_video: false,
      'primary_release_date.gte': dateMonthsAgo(6), 'primary_release_date.lte': now,
      'vote_count.gte': 30, sort_by: 'popularity.desc', page: 1,
    }, 20 * 60_000),
    tmdb('/discover/tv', {
      language: 'en-US', include_adult: false,
      'first_air_date.gte': dateMonthsAgo(12), 'first_air_date.lte': now,
      'vote_count.gte': 20, sort_by: 'popularity.desc', page: 1,
    }, 20 * 60_000),
    tmdb('/discover/movie', {
      language: 'en-US', include_adult: false, with_genres: 28,
      'vote_count.gte': 120, sort_by: 'popularity.desc', page: 1,
    }, 25 * 60_000),
    tmdb('/discover/movie', {
      language: 'en-US', include_adult: false, with_genres: 35,
      'vote_count.gte': 100, sort_by: 'popularity.desc', page: 1,
    }, 25 * 60_000),
    tmdb('/discover/movie', {
      language: 'en-US', include_adult: false, with_genres: 878,
      'vote_count.gte': 100, sort_by: 'popularity.desc', page: 1,
    }, 25 * 60_000),
    tmdb('/discover/movie', {
      language: 'en-US', include_adult: false, with_genres: 27,
      'vote_count.gte': 100, sort_by: 'popularity.desc', page: 1,
    }, 25 * 60_000),
    tmdb('/discover/tv', {
      language: 'en-US', include_adult: false, with_genres: 18,
      'vote_count.gte': 100, sort_by: 'popularity.desc', page: 1,
    }, 25 * 60_000),
    tmdb('/discover/tv', {
      language: 'en-US', include_adult: false, with_genres: '10765',
      'vote_count.gte': 80, sort_by: 'popularity.desc', page: 1,
    }, 25 * 60_000),
  ]);

  const [
    trendingAll,
    trendingMovies,
    trendingTv,
    recentMovies,
    recentTv,
    action,
    comedy,
    scifiMovies,
    horror,
    dramaTv,
    scifiTv,
  ] = calls;
  const mixed = normalizeMixed(trendingAll.results, maps, 20);
  const topMovies = normalizeList(trendingMovies.results, maps.movie, 'movie', 10);
  const topSeries = normalizeList(trendingTv.results, maps.tv, 'tv', 10);
  const rails = [
    { key: 'trending', title: 'Trending Now', subtitle: 'Movies and series people are discovering this week', media: mixed },
    { key: 'top-movies', title: 'Top 10 Movies This Week', subtitle: 'Popular movies from TMDB weekly trends', media: topMovies, ranked: true },
    { key: 'latest', title: 'Latest Releases', subtitle: 'New movies and series from the last six months', media: normalizeList(recentMovies.results.concat(recentTv.results), maps.movie, 'movie', 10).concat(normalizeList(recentTv.results, maps.tv, 'tv')).slice(0, 12) },
    { key: 'new-movies', title: 'Top 10 Recent Movie Releases', subtitle: 'Popular releases from the last six months', media: normalizeList(recentMovies.results, maps.movie, 'movie', 10), ranked: true },
    { key: 'new-series', title: 'New Series', subtitle: 'Fresh shows and returning favourites', media: normalizeList(recentTv.results, maps.tv, 'tv') },
    { key: 'netflix', title: 'Netflix Originals & Exclusives', subtitle: 'Available on Netflix', media: await searchProvider(8, maps) },
    { key: 'amazon', title: 'Amazon Prime Video Picks', subtitle: 'Available on Prime Video', media: await searchProvider(9, maps) },
    { key: 'apple', title: 'Apple TV+ Spotlight', subtitle: 'Available on Apple TV+', media: await searchProvider(2, maps) },
    { key: 'action', title: 'Top 10 Action Movies', subtitle: 'Popular action titles', media: normalizeList(action.results, maps.movie, 'movie', 10), ranked: true },
    { key: 'comedy', title: 'Top 10 Comedy Movies', subtitle: 'Popular comedies', media: normalizeList(comedy.results, maps.movie, 'movie', 10), ranked: true },
    { key: 'scifi-movies', title: 'Top 10 Sci-Fi Movies', subtitle: 'Popular science-fiction titles', media: normalizeList(scifiMovies.results, maps.movie, 'movie', 10), ranked: true },
    { key: 'horror', title: 'Top 10 Horror Movies', subtitle: 'Popular horror titles', media: normalizeList(horror.results, maps.movie, 'movie', 10), ranked: true },
    { key: 'drama-series', title: 'Binge-Worthy Drama Series', subtitle: 'Stories with room to unfold', media: normalizeList(dramaTv.results, maps.tv, 'tv') },
    { key: 'scifi-series', title: 'Sci-Fi & Fantasy Series', subtitle: 'Other worlds and impossible futures', media: normalizeList(scifiTv.results, maps.tv, 'tv') },
  ];

  return {
    hero: mixed[0] || topMovies[0] || topSeries[0] || null,
    featured: mixed.slice(0, 5),
    rails,
    genres: await getGenreCatalog(),
  };
}

const COUNTRY_CODES = new Map([
  ['us', 'US'], ['usa', 'US'], ['united states', 'US'], ['united states of america', 'US'],
  ['ca', 'CA'], ['canada', 'CA'], ['gb', 'GB'], ['uk', 'GB'], ['united kingdom', 'GB'],
  ['in', 'IN'], ['india', 'IN'], ['kr', 'KR'], ['south korea', 'KR'], ['korea', 'KR'],
  ['jp', 'JP'], ['japan', 'JP'], ['fr', 'FR'], ['france', 'FR'], ['de', 'DE'], ['germany', 'DE'],
  ['es', 'ES'], ['spain', 'ES'], ['it', 'IT'], ['italy', 'IT'], ['cn', 'CN'], ['china', 'CN'],
  ['hk', 'HK'], ['hong kong', 'HK'], ['au', 'AU'], ['australia', 'AU'], ['br', 'BR'], ['brazil', 'BR'],
  ['mx', 'MX'], ['mexico', 'MX'], ['tr', 'TR'], ['turkey', 'TR'], ['ng', 'NG'], ['nigeria', 'NG'],
  ['ph', 'PH'], ['philippines', 'PH'], ['th', 'TH'], ['thailand', 'TH'], ['id', 'ID'], ['indonesia', 'ID'],
]);

function countryCode(value) {
  const text = String(value || '').trim();
  if (/^[A-Za-z]{2}$/.test(text)) return text.toUpperCase();
  return COUNTRY_CODES.get(text.toLowerCase()) || '';
}

function genreIdFor(genres, type, name) {
  if (!name) return '';
  return genres[type].find((genre) => genre.name.toLowerCase() === String(name).toLowerCase())?.id || '';
}

function itemMatchesYear(item, year) {
  return !year || Number(item.year) === Number(year);
}

function itemMatchesGenre(item, genre) {
  return !genre || item.genres.some((value) => value.toLowerCase() === String(genre).toLowerCase());
}

async function searchText(query, maps, page = 1) {
  const data = await tmdb('/search/multi', {
    query,
    include_adult: false,
    language: 'en-US',
    page,
  }, 4 * 60_000);
  return {
    results: normalizeMixed(data.results, maps, 30),
    page: Number(data.page || page || 1),
    totalPages: Number(data.total_pages || 1),
    totalResults: Number(data.total_results || 0),
  };
}

async function discoverType(type, params, maps) {
  const data = await tmdb(`/discover/${type}`, params, 4 * 60_000);
  return {
    results: normalizeList(data.results, maps[type], type, 30),
    page: Number(data.page || 1),
    totalPages: Number(data.total_pages || 1),
    totalResults: Number(data.total_results || 0),
  };
}

async function searchProvider(providerId, maps) {
  const [movies, tv] = await Promise.all([
    tmdb('/discover/movie', {
      language: 'en-US',
      include_adult: false,
      include_video: false,
      watch_region: 'US',
      with_watch_providers: providerId,
      sort_by: 'popularity.desc',
      page: 1,
    }, 25 * 60_000),
    tmdb('/discover/tv', {
      language: 'en-US',
      include_adult: false,
      watch_region: 'US',
      with_watch_providers: providerId,
      sort_by: 'popularity.desc',
      page: 1,
    }, 25 * 60_000),
  ]);
  const movieItems = normalizeList(movies.results, maps.movie, 'movie', 10);
  const tvItems = normalizeList(tv.results, maps.tv, 'tv', 10);
  return [...movieItems, ...tvItems].sort((a, b) => b.popularity - a.popularity).slice(0, 14);
}

export async function searchTmdb({ query, year, country, genre, mediaType = 'all', page = 1 }) {
  const genres = await getGenreCatalog();
  const maps = {
    movie: new Map(genres.movie.map((item) => [item.id, item.name])),
    tv: new Map(genres.tv.map((item) => [item.id, item.name])),
  };
  const selectedTypes = mediaType === 'movie' || mediaType === 'tv' ? [mediaType] : ['movie', 'tv'];
  let results;
  let totalPages = 1;
  let totalResults = 0;

  if (query) {
    const searchData = await searchText(query, maps, page);
    results = searchData.results.filter((item) => selectedTypes.includes(item.mediaType));
    totalPages = searchData.totalPages;
    totalResults = searchData.totalResults;
  } else {
    const code = countryCode(country);
    const discovered = await Promise.all(selectedTypes.map((type) => discoverType(type, {
      include_adult: false,
      language: 'en-US',
      page,
      sort_by: 'popularity.desc',
      ...(type === 'movie' ? { include_video: false, primary_release_year: year || undefined } : { first_air_date_year: year || undefined }),
      with_genres: genreIdFor(genres, type, genre) || undefined,
      with_origin_country: code || undefined,
    }, maps)));
    // Each discoverType already returns a normalized `results` array. Combine them into
    // a single list of media items before further filtering and sorting.
    results = discovered.flatMap((d) => d.results).sort((a, b) => b.popularity - a.popularity);
    totalPages = discovered.reduce((sum, item) => sum + item.totalPages, 0) || 1;
    totalResults = discovered.reduce((sum, item) => sum + item.totalResults, 0) || results.length;
  }

  results = results
    .filter((item) => item.id > 0 && VALID_TYPES.has(item.mediaType))
    .filter((item) => itemMatchesYear(item, year))
    .filter((item) => itemMatchesGenre(item, genre));

  if (country && !query) {
    const code = countryCode(country);
    const needle = String(country).trim().toLowerCase();
    const detailed = await mapLimit(results.slice(0, 30), 5, (item) => getMediaDetails(item.mediaType, item.id));
    results = detailed.filter((item) => (
      (code && item.countryCodes.includes(code))
      || item.countries.some((name) => name.toLowerCase().includes(needle))
    ));
  }

  return { results: results.slice(0, 30), page, totalPages, totalResults };
}

export async function mapLimit(items, limit, fn) {
  const output = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await fn(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length || 1) }, worker));
  return output;
}

export function parseMediaReference(value) {
  const [mediaType, rawId] = String(value || '').split(':');
  const id = Number(rawId);
  if (!VALID_TYPES.has(mediaType) || !Number.isFinite(id)) return null;
  return { mediaType, id, key: mediaKey(mediaType, id) };
}
