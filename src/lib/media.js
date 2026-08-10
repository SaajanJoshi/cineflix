export function mediaKey(media) {
  return media?.key || `${media?.mediaType || 'movie'}:${Number(media?.id)}`;
}

export function imageUrl(path, size = 'w780') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : '';
}

export function mediaLabel(media) {
  return media?.mediaType === 'tv' ? 'Series' : 'Movie';
}

export function yearLabel(media) {
  return media?.year || (media?.releaseDate ? String(media.releaseDate).slice(0, 4) : '');
}

export function formatRuntime(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value) || value <= 0) return '';
  const hours = Math.floor(value / 60);
  const remaining = value % 60;
  return hours ? `${hours}h ${remaining ? `${remaining}m` : ''}`.trim() : `${remaining}m`;
}

export function mediaSummary(media) {
  if (!media) return null;
  return {
    id: media.id,
    key: mediaKey(media),
    mediaType: media.mediaType || 'movie',
    title: media.title,
    overview: media.overview || '',
    year: media.year || null,
    genres: media.genres || [],
    posterPath: media.posterPath || '',
    backdropPath: media.backdropPath || '',
    tmdbRating: Number(media.tmdbRating || 0),
    voteCount: Number(media.voteCount || 0),
  };
}
