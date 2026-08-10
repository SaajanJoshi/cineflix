import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import MovieCard from './MovieCard.jsx';

export default function SearchView({
  query,
  onQuery,
  year,
  onYear,
  country,
  onCountry,
  genre,
  onGenre,
  mediaType,
  onMediaType,
  genres,
  results,
  ratingsById,
  loading,
  error,
  warning,
  provider,
  onOpen,
  onPlay,
  onToggleSaved,
  isSaved,
  previewsEnabled,
}) {
  const hasCriteria = query.trim().length >= 2 || year || country.trim() || genre;

  return (
    <Box component="main" sx={{ pt: { xs: 15, lg: 12.5 }, px: { xs: 2, md: 5 }, pb: 9, minHeight: '100vh', background: 'radial-gradient(circle at 78% 0%, rgba(229,9,20,.08), transparent 30%)' }}>
      <Typography component="h1" sx={{ fontSize: { xs: '2rem', md: '3.35rem' }, fontWeight: 950, letterSpacing: '-.055em' }}>
        Find your next watch
      </Typography>
      <Typography color="text.secondary" sx={{ mt: .55, maxWidth: 720 }}>
        Fuzzy search across movies and series, with title, year, country and genre filters.
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'minmax(290px,2fr) 160px 150px 170px 180px' }, gap: 1.15, mt: 3.1, maxWidth: 1220 }}>
        <TextField label="Title" value={query} onChange={(event) => onQuery(event.target.value)} inputProps={{ 'data-tv-focus': 'true' }} sx={{ gridColumn: { xs: '1 / -1', md: 'auto' } }} />
        <TextField select label="Type" value={mediaType} onChange={(event) => onMediaType(event.target.value)} SelectProps={{ inputProps: { 'data-tv-focus': 'true' } }}>
          <MenuItem value="all">Movies & series</MenuItem>
          <MenuItem value="movie">Movies</MenuItem>
          <MenuItem value="tv">TV shows</MenuItem>
        </TextField>
        <TextField label="Year" type="number" value={year} onChange={(event) => onYear(event.target.value)} inputProps={{ min: 1900, max: new Date().getFullYear() + 1, 'data-tv-focus': 'true' }} />
        <TextField label="Country" value={country} onChange={(event) => onCountry(event.target.value)} placeholder="US, India, Korea" inputProps={{ 'data-tv-focus': 'true' }} />
        <TextField select label="Genre" value={genre} onChange={(event) => onGenre(event.target.value)} SelectProps={{ inputProps: { 'data-tv-focus': 'true' } }}>
          <MenuItem value="">All genres</MenuItem>
          {genres.map((item) => <MenuItem key={item} value={item}>{item}</MenuItem>)}
        </TextField>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2.1, minHeight: 33 }}>
        {provider ? <Chip size="small" label={provider === 'elasticsearch' ? 'Elasticsearch fuzzy search' : 'TMDB search fallback'} color={provider === 'elasticsearch' ? 'primary' : 'default'} /> : null}
        {loading ? <CircularProgress size={20} /> : null}
        {!loading && results.length ? <Typography color="text.secondary" sx={{ fontSize: '.84rem' }}>{results.length} results</Typography> : null}
      </Box>

      {error ? <Typography color="error.main" sx={{ mt: 2 }}>{error}</Typography> : null}
      {warning && !error ? <Typography color="warning.main" sx={{ mt: 1.5, fontSize: '.84rem' }}>{warning} TMDB fallback results are shown.</Typography> : null}
      {!loading && !error && !results.length ? (
        <Box sx={{ mt: 7, py: 6, borderTop: '1px solid rgba(255,255,255,.08)', maxWidth: 1000 }}>
          <Typography sx={{ fontSize: '1.18rem', fontWeight: 800 }}>
            {hasCriteria ? 'No matching titles found' : 'Search movies and TV shows'}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: .7 }}>
            {hasCriteria ? 'Try a broader title, remove a filter, or use a two-letter country code.' : 'Start typing a title, or browse by year, country and genre.'}
          </Typography>
        </Box>
      ) : null}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(1, minmax(0,1fr))', sm: 'repeat(2,minmax(0,1fr))', md: 'repeat(3,minmax(0,1fr))', lg: 'repeat(4,minmax(0,1fr))' }, gap: { xs: 2.2, md: 2.7 }, mt: 3.2 }}>
        {results.map((media) => (
          <Box key={media.key || `${media.mediaType}:${media.id}`} sx={{ minWidth: 0, '& > div': { width: '100%' } }}>
            <MovieCard
              movie={media}
              ratings={ratingsById[media.key || `${media.mediaType}:${media.id}`] || media.ratings}
              onOpen={onOpen}
              onPlay={onPlay}
              onToggleSaved={onToggleSaved}
              saved={isSaved(media)}
              previewsEnabled={previewsEnabled}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
