import { getGenreCatalog, tmdb, getMediaDetails, searchTmdb, countryCode, genreIdFor, mapLimit } from '../server/tmdb.mjs';
import { normalizeMedia } from '../server/normalize.mjs';

async function main() {
  const query = '';
  const year = '';
  const country = 'IN';
  const genre = 'Drama';
  const mediaType = 'movie';
  const page = 1;

  const genres = await getGenreCatalog();
  const maps = {
    movie: new Map(genres.movie.map((item) => [item.id, item.name])),
    tv: new Map(genres.tv.map((item) => [item.id, item.name])),
  };

  console.log('genreId', genreIdFor(genres, mediaType, genre));
  console.log('countryCode', countryCode(country));

  const data = await searchTmdb({ query, year, country, genre, mediaType, page });
  console.log('searchTmdb result count', data.results.length, 'totalPages', data.totalPages, 'totalResults', data.totalResults);

  const params = {
    include_adult: false,
    language: 'en-US',
    page,
    sort_by: 'popularity.desc',
    include_video: false,
    primary_release_year: year || undefined,
    with_genres: genreIdFor(genres, mediaType, genre) || undefined,
    with_origin_country: countryCode(country) || undefined,
  };
  console.log('discover params', params);

  const raw = await tmdb('/discover/movie', params, 1000);
  console.log('discover raw count', raw.results.length, 'total_pages', raw.total_pages, 'total_results', raw.total_results);
  console.log('discover sample ids', raw.results.slice(0,5).map((item) => item.id));

  const normalized = raw.results.map((item) => normalizeMedia(item, maps.movie, 'movie'));
  console.log('normalized count', normalized.length);
  console.log('normalized sample', normalized.slice(0,5).map((item) => ({ id: item.id, title: item.title, countryCodes: item.countryCodes, countries: item.countries, genres: item.genres, year: item.year })));

  const filtered = normalized.filter((item) => item.id > 0 && ['movie','tv'].includes(item.mediaType));
  console.log('filtered base count', filtered.length);
  const afterYear = filtered.filter((item) => !year || Number(item.year) === Number(year));
  console.log('afterYear count', afterYear.length);
  const afterGenre = afterYear.filter((item) => !genre || item.genres.some((name) => name.toLowerCase() === genre.toLowerCase()));
  console.log('afterGenre count', afterGenre.length);

  const detailed = await mapLimit(afterGenre.slice(0,30), 5, (item) => getMediaDetails(item.mediaType, item.id));
  console.log('detailed count', detailed.length);
  const keep = detailed.filter((item) => (countryCode(country) && item.countryCodes.includes(countryCode(country))) || item.countries.some((name) => name.toLowerCase().includes(country.trim().toLowerCase())));
  console.log('keep count', keep.length);
  console.log('keep sample', keep.slice(0,5).map((item) => ({ id: item.id, title: item.title, countryCodes: item.countryCodes, countries: item.countries }))); 
}

main().catch((error) => { console.error(error); process.exit(1); });
