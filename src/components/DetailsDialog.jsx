import { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { api } from '../api/client.js';
import { formatRuntime, imageUrl, mediaLabel } from '../lib/media.js';
import { preferredImageSize } from '../lib/performance.js';
import Icon from './Icon.jsx';
import MovieRail from './MovieRail.jsx';
import RatingBadges from './RatingBadges.jsx';
import SmartImage from './SmartImage.jsx';

function youtubeUrl(key, muted) {
  const params = new URLSearchParams({
    autoplay: '1',
    mute: muted ? '1' : '0',
    controls: '0',
    loop: '1',
    playlist: key,
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${key}?${params.toString()}`;
}

function EpisodeCard({ episode, show, onPlay }) {
  const still = imageUrl(episode.stillPath, preferredImageSize('episode'));
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '112px minmax(0,1fr)', sm: '165px minmax(0,1fr) auto' },
        gap: { xs: 1.4, sm: 2 },
        alignItems: 'center',
        py: 1.5,
        borderTop: '1px solid rgba(255,255,255,.1)',
      }}
    >
      <Box
        data-tv-focus="true"
        tabIndex={0}
        onClick={() => onPlay(show, episode)}
        onKeyDown={(event) => { if (event.key === 'Enter') onPlay(show, episode); }}
        sx={{
          position: 'relative', aspectRatio: '16/9', borderRadius: .7, overflow: 'hidden', bgcolor: '#29292d', cursor: 'pointer',
          '&:focus-visible': { outline: '3px solid #fff', outlineOffset: 3 },
          '&:hover .episode-play': { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' },
        }}
      >
        {still ? <SmartImage src={still} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, rgba(0,0,0,.48), transparent)' }} />
        <Box className="episode-play" sx={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%) scale(.88)', opacity: .82, width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(0,0,0,.7)', border: '2px solid #fff', display: 'grid', placeItems: 'center', transition: 'opacity 150ms ease, transform 150ms ease' }}>
          <Icon name="play" size={22} />
        </Box>
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
          <Typography sx={{ fontWeight: 900 }}>{episode.episodeNumber}. {episode.name}</Typography>
          {episode.runtime ? <Typography color="text.secondary" sx={{ fontSize: '.75rem', flex: '0 0 auto' }}>{formatRuntime(episode.runtime)}</Typography> : null}
        </Box>
        <Typography color="text.secondary" sx={{ mt: .55, fontSize: '.82rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {episode.overview || 'Episode details are not available yet.'}
        </Typography>
      </Box>

      <Button
        data-tv-focus="true"
        onClick={() => onPlay(show, episode)}
        startIcon={<Icon name="play" size={18} />}
        sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: '#fff', border: '1px solid rgba(255,255,255,.4)', minWidth: 92 }}
      >
        Play
      </Button>
    </Box>
  );
}

export default function DetailsDialog({
  movie: media,
  ratings,
  onClose,
  onPlay,
  onOpen,
  onToggleSaved,
  isSaved,
  ratingsById,
  previewsEnabled,
  ratingsConfigured = true,
}) {
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState('');
  const [seasonData, setSeasonData] = useState(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [relatedRatings, setRelatedRatings] = useState({});

  useEffect(() => {
    if (!media?.id || !media?.mediaType) return;
    let live = true;
    setDetails(null);
    setError('');
    setMuted(true);
    setSeasonData(null);
    setSelectedSeason('');
    setRelatedRatings({});
    api.media(media.mediaType, media.id)
      .then((data) => {
        if (!live) return;
        setDetails(data);
        if (data.mediaType === 'tv') {
          const season = (data.seasons || []).find((item) => item.seasonNumber > 0) || data.seasons?.[0];
          if (season) setSelectedSeason(String(season.seasonNumber));
        }
      })
      .catch((err) => live && setError(err.message));
    return () => { live = false; };
  }, [media?.id, media?.mediaType]);

  useEffect(() => {
    if (!ratingsConfigured || !details?.recommendations?.length) return undefined;
    let live = true;
    api.ratings(details.recommendations.slice(0, 18))
      .then((data) => live && setRelatedRatings(data.ratings || {}))
      .catch(() => {});
    return () => { live = false; };
  }, [details?.key, ratingsConfigured]);

  useEffect(() => {
    if (!details || details.mediaType !== 'tv' || selectedSeason === '') return;
    let live = true;
    setSeasonLoading(true);
    setSeasonData(null);
    api.season(details.id, selectedSeason)
      .then((data) => live && setSeasonData(data))
      .catch((err) => live && setError(err.message))
      .finally(() => live && setSeasonLoading(false));
    return () => { live = false; };
  }, [details?.id, details?.mediaType, selectedSeason]);

  const current = details || media;
  const currentRatings = details?.ratings || ratings;
  const backdrop = imageUrl(current?.backdropPath || current?.posterPath, preferredImageSize('details'));
  const previewKey = previewsEnabled ? details?.preview?.key : '';
  const saved = current ? isSaved(current) : false;
  const firstEpisode = seasonData?.episodes?.[0];
  const playCurrent = () => {
    if (current.mediaType === 'tv') {
      onPlay(current, {
        season: Number(selectedSeason || 1),
        episode: firstEpisode?.episodeNumber || 1,
        episodeName: firstEpisode?.name || '',
      });
    } else {
      onPlay(current);
    }
  };

  const metadata = useMemo(() => {
    if (!current) return [];
    return [
      current.year,
      current.contentRating,
      current.mediaType === 'tv' && current.numberOfSeasons ? `${current.numberOfSeasons} season${current.numberOfSeasons === 1 ? '' : 's'}` : formatRuntime(current.runtime),
      mediaLabel(current),
    ].filter(Boolean);
  }, [current]);

  return (
    <Dialog
      open={Boolean(media)}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      PaperProps={{ sx: { borderRadius: { xs: 0, md: 1.5 }, overflow: 'hidden', bgcolor: '#18181b', backgroundImage: 'none', boxShadow: '0 30px 100px rgba(0,0,0,.75)' } }}
    >
      {media ? (
        <>
          <Box sx={{ position: 'relative', minHeight: { xs: 300, sm: 420, md: 510 }, bgcolor: '#0b0b0d', overflow: 'hidden' }}>
            {backdrop ? <SmartImage src={backdrop} alt="" priority sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: previewKey ? .22 : 1 }} /> : null}
            {previewKey ? (
              <Box component="iframe" key={`${previewKey}:${muted}`} src={youtubeUrl(previewKey, muted)} title={`${current.title} preview`} allow="autoplay; encrypted-media; picture-in-picture" sx={{ position: 'absolute', inset: '-8%', width: '116%', height: '116%', border: 0, pointerEvents: 'none' }} />
            ) : null}
            <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(0deg, #18181b 0%, rgba(24,24,27,.12) 54%, rgba(0,0,0,.18) 100%), linear-gradient(90deg, rgba(0,0,0,.76), transparent 62%)' }} />

            <IconButton data-tv-focus="true" onClick={onClose} aria-label="Close details" sx={{ position: 'absolute', top: 16, right: 16, zIndex: 4, bgcolor: 'rgba(0,0,0,.76)', border: '1px solid rgba(255,255,255,.18)', '&:hover': { bgcolor: '#000' } }}>
              <Icon name="close" size={23} />
            </IconButton>

            {previewKey ? (
              <Tooltip title={muted ? 'Turn preview sound on' : 'Mute preview'}>
                <IconButton data-tv-focus="true" onClick={() => setMuted((value) => !value)} aria-label={muted ? 'Unmute trailer' : 'Mute trailer'} sx={{ position: 'absolute', right: 18, bottom: 42, zIndex: 4, border: '1px solid rgba(255,255,255,.62)', bgcolor: 'rgba(0,0,0,.48)', '&:hover': { bgcolor: 'rgba(0,0,0,.8)' } }}>
                  <Icon name={muted ? 'mute' : 'volume'} size={22} />
                </IconButton>
              </Tooltip>
            ) : null}

            <Box sx={{ position: 'absolute', left: { xs: 22, md: 40 }, right: { xs: 22, md: 90 }, bottom: { xs: 24, md: 36 }, zIndex: 3 }}>
              <Typography component="h2" sx={{ maxWidth: 850, fontSize: { xs: '2.6rem', sm: '4rem', md: '5.2rem' }, fontWeight: 950, letterSpacing: '-.065em', lineHeight: .92, textShadow: '0 4px 28px #000' }}>
                {current.title}
              </Typography>
              {current.tagline ? <Typography sx={{ mt: 1.2, color: 'rgba(255,255,255,.82)', fontStyle: 'italic', textShadow: '0 2px 8px #000' }}>{current.tagline}</Typography> : null}
              <Box sx={{ display: 'flex', gap: 1, mt: 2.3, alignItems: 'center', flexWrap: 'wrap' }}>
                <Button data-tv-focus="true" variant="contained" color="inherit" onClick={playCurrent} startIcon={<Icon name="play" size={21} />} sx={{ bgcolor: '#fff', color: '#000', px: 2.8, '&:hover': { bgcolor: '#ddd' } }}>
                  {current.mediaType === 'tv' ? 'Play episode' : 'Play'}
                </Button>
                <Tooltip title={saved ? 'Remove from My List' : 'Add to My List'}>
                  <IconButton data-tv-focus="true" onClick={() => onToggleSaved(current)} aria-label={saved ? 'Remove from My List' : 'Add to My List'} sx={{ width: 44, height: 44, border: '2px solid rgba(255,255,255,.65)', bgcolor: 'rgba(0,0,0,.4)', '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,.14)' } }}>
                    <Icon name={saved ? 'check' : 'plus'} size={24} />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Box>

          <DialogContent sx={{ px: { xs: 2.5, md: 4.5 }, pt: 1.5, pb: 4.5, overflowX: 'hidden' }}>
            {!details && !error ? <Box sx={{ py: 3, display: 'flex', gap: 1.2, alignItems: 'center' }}><CircularProgress size={25} /><Typography color="text.secondary">Loading title details…</Typography></Box> : null}
            {error ? <Typography color="error.main" sx={{ py: 2 }}>{error}</Typography> : null}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0,2fr) minmax(240px,.8fr)' }, gap: { xs: 3, md: 5 }, mt: 1 }}>
              <Box>
                <Box sx={{ display: 'flex', gap: 1.15, flexWrap: 'wrap', alignItems: 'center', mb: 2 }}>
                  <RatingBadges ratings={currentRatings} tmdbRating={current.tmdbRating} />
                  {metadata.map((value) => <Chip key={value} label={value} size="small" variant="outlined" sx={{ height: 24, borderRadius: .5, borderColor: 'rgba(255,255,255,.28)' }} />)}
                </Box>
                <Typography sx={{ color: '#e6e6e6', lineHeight: 1.72, fontSize: { xs: '.96rem', md: '1.03rem' } }}>
                  {current.overview || 'No synopsis is available for this title.'}
                </Typography>
              </Box>

              <Box sx={{ color: 'text.secondary' }}>
                {current.creators?.length ? <Typography sx={{ fontSize: '.84rem', mb: 1.2 }}><b style={{ color: '#fff' }}>{current.mediaType === 'tv' ? 'Created by:' : 'Director:'}</b> {current.creators.join(', ')}</Typography> : null}
                {current.cast?.length ? <Typography sx={{ fontSize: '.84rem', mb: 1.2 }}><b style={{ color: '#fff' }}>Cast:</b> {current.cast.slice(0, 7).map((person) => person.name).join(', ')}</Typography> : null}
                {current.countries?.length ? <Typography sx={{ fontSize: '.84rem', mb: 1.2 }}><b style={{ color: '#fff' }}>Countries:</b> {current.countries.join(', ')}</Typography> : null}
                {current.genres?.length ? <Typography sx={{ fontSize: '.84rem' }}><b style={{ color: '#fff' }}>Genres:</b> {current.genres.join(', ')}</Typography> : null}
              </Box>
            </Box>

            {details?.mediaType === 'tv' && details.seasons?.length ? (
              <Box sx={{ mt: 4.2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 1.1 }}>
                  <Typography component="h3" sx={{ fontSize: { xs: '1.35rem', md: '1.65rem' }, fontWeight: 900 }}>Episodes</Typography>
                  <TextField
                    select
                    size="small"
                    value={selectedSeason}
                    onChange={(event) => setSelectedSeason(event.target.value)}
                    inputProps={{ 'data-tv-focus': 'true', 'aria-label': 'Select season' }}
                    sx={{ width: 190 }}
                  >
                    {details.seasons.map((season) => (
                      <MenuItem key={season.seasonNumber} value={String(season.seasonNumber)}>
                        {season.name} ({season.episodeCount})
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                {seasonLoading ? <Box sx={{ py: 3, display: 'flex', alignItems: 'center', gap: 1.2 }}><CircularProgress size={23} /><Typography color="text.secondary">Loading episodes…</Typography></Box> : null}
                {seasonData?.episodes?.map((episode) => (
                  <EpisodeCard
                    key={episode.id}
                    episode={episode}
                    show={details}
                    onPlay={(show, selectedEpisode) => onPlay(show, {
                      season: selectedEpisode.seasonNumber,
                      episode: selectedEpisode.episodeNumber,
                      episodeName: selectedEpisode.name,
                    })}
                  />
                ))}
              </Box>
            ) : null}

            {details?.recommendations?.length ? (
              <Box sx={{ mt: 4.5, mx: { xs: -2.5, md: -4.5 } }}>
                <MovieRail
                  title="More Like This"
                  subtitle="Related movies and series"
                  media={details.recommendations.slice(0, 12)}
                  ratingsById={{ ...ratingsById, ...relatedRatings }}
                  onOpen={onOpen}
                  onPlay={onPlay}
                  onToggleSaved={onToggleSaved}
                  isSaved={isSaved}
                  previewsEnabled={previewsEnabled}
                  compact
                />
              </Box>
            ) : null}
          </DialogContent>
        </>
      ) : null}
    </Dialog>
  );
}
