async function request(path, init) {
  const response = await fetch(path, init);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export const api = {
  health: () => request('/api/health'),
  home: () => request('/api/home'),
  genres: () => request('/api/genres'),
  media: (mediaType, id) => request(`/api/media/${mediaType}/${id}`),
  preview: (mediaType, id) => request(`/api/media/${mediaType}/${id}/preview`),
  season: (id, seasonNumber) => request(`/api/tv/${id}/season/${seasonNumber}`),
  ratings: (items) => request('/api/ratings', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      items: items.slice(0, 80).map((item) => ({
        id: item.id,
        key: item.key || `${item.mediaType}:${item.id}`,
        mediaType: item.mediaType,
        title: item.title || '',
        year: item.year || null,
        imdbId: item.imdbId || null,
      })),
    }),
  }),
  diagnoseRatings: () => request('/api/ratings/diagnose'),
  search: ({ query = '', year = '', country = '', genre = '', mediaType = 'all', page = 1 }) => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (year) params.set('year', String(year));
    if (country.trim()) params.set('country', country.trim());
    if (genre) params.set('genre', genre);
    if (mediaType) params.set('type', mediaType);
    if (page && page > 1) params.set('page', String(page));
    return request(`/api/search?${params.toString()}`);
  },
};
