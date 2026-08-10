import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

function cleanImdb(value) {
  return String(value || '').replace('/10', '');
}

function Badge({ label, value, accent, title }) {
  if (!value) return null;
  const content = (
    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: .55, minHeight: 22 }}>
      <Typography component="span" sx={{ fontSize: '.66rem', fontWeight: 950, color: accent, letterSpacing: '.02em' }}>
        {label}
      </Typography>
      <Typography component="span" sx={{ fontSize: '.76rem', fontWeight: 800, color: '#f4f4f4' }}>
        {value}
      </Typography>
    </Box>
  );
  return title ? <Tooltip title={title}>{content}</Tooltip> : content;
}

export default function RatingBadges({ ratings, tmdbRating = 0, compact = false }) {
  const hasExternal = Boolean(ratings?.imdb || ratings?.rottenTomatoes);
  const fallback = Number(tmdbRating || 0);
  const message = ratings?.message || 'TMDB community score. Add OMDB_API_KEY for IMDb and Rotten Tomatoes values.';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: compact ? .9 : 1.25, flexWrap: 'wrap' }}>
      {ratings?.imdb ? <Badge label="IMDb" value={cleanImdb(ratings.imdb)} accent="#f5c518" title={ratings.imdbVotes ? `${ratings.imdbVotes} IMDb votes` : 'IMDb rating via OMDb'} /> : null}
      {ratings?.rottenTomatoes ? <Badge label="RT" value={ratings.rottenTomatoes} accent="#ff4b4b" title="Rotten Tomatoes score via OMDb" /> : null}
      {!hasExternal && fallback > 0 ? <Badge label="★ TMDB" value={fallback.toFixed(1)} accent="#46d369" title={message} /> : null}
    </Box>
  );
}
