export function mediaKey(mediaType, id) {
  return `${mediaType}:${Number(id)}`;
}

export function normalizeMedia(item, genreMap = new Map(), forcedType = '') {
  const mediaType = forcedType || item.media_type || (item.name || item.original_name ? 'tv' : 'movie');
  const isTv = mediaType === 'tv';
  const releaseDate = isTv
    ? (item.first_air_date || item.firstAirDate || '')
    : (item.release_date || item.releaseDate || '');
  const title = isTv
    ? (item.name || item.original_name || item.title || 'Untitled')
    : (item.title || item.original_title || item.name || 'Untitled');
  const originalTitle = isTv
    ? (item.original_name || item.name || '')
    : (item.original_title || item.title || '');
  const genres = item.genres?.map((genre) => typeof genre === 'string' ? genre : genre.name).filter(Boolean)
    || item.genre_ids?.map((id) => genreMap.get(id)).filter(Boolean)
    || [];
  const productionCountries = item.production_countries || [];
  const originCountryCodes = item.origin_country || item.originCountryCodes || [];
  const genreIds = item.genre_ids || item.genres?.map((genre) => genre.id).filter(Boolean) || [];

  return {
    id: Number(item.id),
    tmdbId: Number(item.id),
    key: mediaKey(mediaType, item.id),
    mediaType,
    title,
    originalTitle,
    overview: item.overview || '',
    tagline: item.tagline || '',
    releaseDate,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    genres,
    genreIds,
    countries: productionCountries.map((country) => country.name).filter(Boolean),
    countryCodes: [...new Set([
      ...productionCountries.map((country) => country.iso_3166_1).filter(Boolean),
      ...originCountryCodes.filter(Boolean),
    ])],
    originCountryCodes,
    originalLanguage: item.original_language || item.originalLanguage || '',
    spokenLanguages: (item.spoken_languages || []).map((language) => language.english_name || language.name).filter(Boolean),
    posterPath: item.poster_path || item.posterPath || '',
    backdropPath: item.backdrop_path || item.backdropPath || '',
    popularity: Number(item.popularity || 0),
    tmdbRating: Number(item.vote_average || item.tmdbRating || 0),
    voteCount: Number(item.vote_count || item.voteCount || 0),
    imdbId: item.external_ids?.imdb_id || item.imdb_id || item.imdbId || null,
    runtime: isTv
      ? ((item.episode_run_time || []).find((value) => Number(value) > 0) || item.runtime || null)
      : (item.runtime || null),
    status: item.status || '',
    numberOfSeasons: Number(item.number_of_seasons || item.numberOfSeasons || 0) || null,
    numberOfEpisodes: Number(item.number_of_episodes || item.numberOfEpisodes || 0) || null,
    seasons: item.seasons || [],
    adult: Boolean(item.adult),
  };
}
